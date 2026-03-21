import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * Helper: resolve festival slug or UUID to UUID
 */
async function resolveFestivalId(supabase: any, idOrSlug: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUuid) return idOrSlug;
  
  const { data } = await supabase
    .from("festivals")
    .select("id")
    .eq("slug", idOrSlug)
    .single();
    
  return data?.id || null;
}

/**
 * GET /api/festivals/[id]/artist-interest
 * Get current user's artist interests for this festival
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const festivalId = await resolveFestivalId(supabase, params.id);
    if (!festivalId) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    const { data: interests, error } = await supabase
      .from("festival_artist_interests")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("festival_id", festivalId);

    if (error) {
      console.error("Error fetching interests:", error);
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
    }

    // Convert to map for easy lookup
    const interestMap: Record<string, string> = {};
    interests?.forEach(i => {
    interestMap[i.artist_id] = i.interest_level;
    });

    return NextResponse.json({ interests: interestMap });
  } catch (error) {
    console.error("Error in GET /api/festivals/[id]/artist-interest:", error);
    return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
  }
}

/**
 * POST /api/festivals/[id]/artist-interest
 * Set interest level for an artist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const festivalId = await resolveFestivalId(supabase, params.id);
    if (!festivalId) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { artistId, artistName, interestLevel } = body;

  if (!artistId || !artistName) {
    return NextResponse.json({ error: "Artist ID and name required" }, { status: 400 });
  }

  const validLevels = ["must-see", "interested", "maybe"];
  if (interestLevel && !validLevels.includes(interestLevel)) {
    return NextResponse.json({ error: "Invalid interest level" }, { status: 400 });
  }

  if (!interestLevel) {
    // Remove interest
    const { error } = await supabase
      .from("festival_artist_interests")
      .delete()
      .eq("user_id", session.user.id)
      .eq("festival_id", festivalId)
      .eq("artist_id", artistId);

    if (error) {
      console.error("Error removing interest:", error);
      return NextResponse.json({ error: "Failed to remove interest" }, { status: 500 });
    }

    return NextResponse.json({ success: true, removed: true });
  }

  // Upsert interest
  const { error } = await supabase
    .from("festival_artist_interests")
    .upsert(
      {
        user_id: session.user.id,
        festival_id: festivalId,
        artist_id: artistId,
        artist_name: artistName,
        interest_level: interestLevel,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,festival_id,artist_id",
      }
    );

    if (error) {
      console.error("Error setting interest:", error);
      return NextResponse.json({ error: "Failed to set interest" }, { status: 500 });
    }

    return NextResponse.json({ success: true, interestLevel });
  } catch (error) {
    console.error("Error in POST /api/festivals/[id]/artist-interest:", error);
    return NextResponse.json({ error: "Failed to set interest" }, { status: 500 });
  }
}

/**
 * PUT /api/festivals/[id]/artist-interest
 * Batch update multiple artist interests
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const supabase = createAdminClient();
  const festivalId = await resolveFestivalId(supabase, params.id);
  if (!festivalId) {
    return NextResponse.json({ error: "Festival not found" }, { status: 404 });
  }
  
  const body = await request.json();
  const { interests } = body; // Array of { artistId, artistName, interestLevel }

  if (!interests || !Array.isArray(interests)) {
    return NextResponse.json({ error: "Interests array required" }, { status: 400 });
  }
  const validLevels = ["must-see", "interested", "maybe"];

  // Split into upserts and deletes
  const toUpsert = interests
    .filter(i => i.interestLevel && validLevels.includes(i.interestLevel))
    .map(i => ({
      user_id: session.user.id,
      festival_id: festivalId,
      artist_id: i.artistId,
      artist_name: i.artistName,
      interest_level: i.interestLevel,
      updated_at: new Date().toISOString(),
    }));

  const toDelete = interests
    .filter(i => !i.interestLevel)
    .map(i => i.artistId);

  // Perform operations
  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("festival_artist_interests")
      .upsert(toUpsert, { onConflict: "user_id,festival_id,artist_id" });

    if (error) {
      console.error("Error upserting interests:", error);
      return NextResponse.json({ error: "Failed to update interests" }, { status: 500 });
    }
  }

  if (toDelete.length > 0) {
    const { error } = await supabase
      .from("festival_artist_interests")
      .delete()
      .eq("user_id", session.user.id)
      .eq("festival_id", festivalId)
      .in("artist_id", toDelete);

    if (error) {
      console.error("Error deleting interests:", error);
      return NextResponse.json({ error: "Failed to remove interests" }, { status: 500 });
    }
  }

    return NextResponse.json({
      success: true,
      updated: toUpsert.length,
      removed: toDelete.length,
    });
  } catch (error) {
    console.error("Error in PUT /api/festivals/[id]/artist-interest:", error);
    return NextResponse.json({ error: "Failed to update interests" }, { status: 500 });
  }
}
