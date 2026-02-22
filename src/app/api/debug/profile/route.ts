import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { 
  getUnifiedMusicProfile, 
  getMusicProfile, 
  getMusicConnections,
  getAggregatedArtists,
  getRelatedArtists 
} from "@/lib/supabase";

/**
 * GET /api/debug/profile
 * Debug endpoint to see what's in the user's profile
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all the things
    const [unifiedProfile, legacyProfile, connections, aggregatedArtists, relatedArtists] = await Promise.all([
      getUnifiedMusicProfile(userId).catch(e => ({ error: e.message })),
      getMusicProfile(userId).catch(e => ({ error: e.message })),
      getMusicConnections(userId).catch(e => ({ error: e.message })),
      getAggregatedArtists(userId).catch(e => ({ error: e.message })),
      getRelatedArtists(userId).catch(e => ({ error: e.message })),
    ]);

    return NextResponse.json({
      userId,
      unifiedProfile,
      legacyProfile,
      connections,
      aggregatedArtists,
      relatedArtists,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug profile error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
