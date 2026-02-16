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
 * Get user's favorite artists and genres
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
      .select("top_artists, top_genres")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching artists:", error);
      return NextResponse.json({ error: "Failed to fetch artists" }, { status: 500 });
    }

    return NextResponse.json({ 
      artists: data?.top_artists || [],
      genres: data?.top_genres || [],
    });
  } catch (error) {
    console.error("Error in GET /api/user/artists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/user/artists
 * Save user's favorite artists and genres (manual entry)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as { 
      artists?: Artist[]; 
      genres?: string[];
    };
    
    const artists = body.artists || [];
    const explicitGenres = body.genres || [];

    if (!Array.isArray(artists)) {
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

    // Combine genres from artists + explicit selections
    const artistGenres = artists.flatMap((a) => a.genres || []);
    const allGenres = Array.from(new Set([...artistGenres, ...explicitGenres]));

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

    return NextResponse.json({ 
      success: true, 
      artistCount: artists.length,
      genreCount: allGenres.length,
    });
  } catch (error) {
    console.error("Error in POST /api/user/artists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
