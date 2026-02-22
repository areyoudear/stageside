import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUnifiedMusicProfile } from "@/lib/supabase";
import { searchConcerts } from "@/lib/ticketmaster";
import { calculatePreciseMatchScore, type UserProfile } from "@/lib/matching";

/**
 * GET /api/debug/matches
 * Debug endpoint to see matching in action
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get("city") || "San Francisco";

    // Get user profile
    const musicProfile = await getUnifiedMusicProfile(session.user.id);
    
    if (!musicProfile) {
      return NextResponse.json({ 
        error: "No music profile",
        hasProfile: false 
      });
    }

    // Build user profile for matching
    const userProfile: UserProfile = {
      topArtists: musicProfile.topArtists.map((a, index) => ({
        name: a.name,
        rank: index + 1,
        genres: a.genres,
      })),
      relatedArtists: [],
      recentlyPlayed: musicProfile.recentArtists || [],
      topGenres: musicProfile.topGenres,
    };

    // Search concerts
    const today = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const concertsResult = await searchConcerts({
      city,
      radius: 50,
      startDate: today.toISOString(),
      endDate: endDate.toISOString(),
      size: 20,
    });

    // Calculate matches and show breakdown
    const matchResults = concertsResult.concerts.map((concert) => {
      const result = calculatePreciseMatchScore(
        concert.artists,
        concert.genres,
        userProfile,
        null,
        new Map(),
        { friendsInterested: 0, friendsGoing: 0 }
      );

      return {
        concertName: concert.name,
        concertArtists: concert.artists,
        concertGenres: concert.genres,
        score: result.score,
        breakdown: result.breakdown,
        matchType: result.matchType,
        matchedArtist: result.matchedArtist,
        reasons: result.reasons,
      };
    });

    // Find any that matched
    const matched = matchResults.filter(r => r.score > 0);
    const unmatched = matchResults.filter(r => r.score === 0).slice(0, 5);

    return NextResponse.json({
      userTopArtists: userProfile.topArtists.slice(0, 20).map(a => a.name),
      userTopGenres: musicProfile.topGenres,
      totalConcerts: concertsResult.concerts.length,
      matchedCount: matched.length,
      matched,
      unmatchedSample: unmatched,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Debug matches error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
