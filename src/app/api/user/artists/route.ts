import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

/**
 * GET /api/user/artists
 * Get user's favorite artists
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("music_profiles")
      .select("top_artists")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching artists:", error);
      return NextResponse.json({ error: "Failed to fetch artists" }, { status: 500 });
    }

    return NextResponse.json({ artists: data?.top_artists || [] });
  } catch (error) {
    console.error("Error in GET /api/user/artists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/user/artists
 * Save user's favorite artists (manual entry)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { artists } = await request.json() as { artists: Artist[] };

    if (!artists || !Array.isArray(artists)) {
      return NextResponse.json({ error: "Invalid artists data" }, { status: 400 });
    }

    // Format artists for storage
    const formattedArtists = artists.map((a) => ({
      id: a.id,
      name: a.name,
      image_url: a.imageUrl,
      genres: a.genres || [],
      source: "manual",
    }));

    // Extract genres from all artists
    const allGenres = [...new Set(artists.flatMap((a) => a.genres || []))];

    // Upsert into music_profiles
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("music_profiles")
      .upsert({
        user_id: session.user.id,
        top_artists: formattedArtists,
        top_genres: allGenres,
        last_synced: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Error saving artists:", error);
      return NextResponse.json({ error: "Failed to save artists" }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: artists.length });
  } catch (error) {
    console.error("Error in POST /api/user/artists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
