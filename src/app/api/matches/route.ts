import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchConcerts, Concert } from "@/lib/ticketmaster";
import { getMusicProfile, getSavedConcerts, getUnifiedMusicProfile, getRelatedArtists } from "@/lib/supabase";
import { calculateMatchScore, formatMatchScore, generateVibeTags, UserProfile } from "@/lib/matching";

/**
 * GET /api/matches
 * Get personalized concert recommendations based on user's music taste
 *
 * Query params:
 * - city: City name (optional if latLong provided)
 * - lat: Latitude (optional)
 * - lng: Longitude (optional)
 * - radius: Search radius in miles (default: 50)
 * - startDate: Start date YYYY-MM-DD (default: today)
 * - endDate: End date YYYY-MM-DD (default: +3 months)
 * - page: Page number (default: 0)
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const city = searchParams.get("city") || undefined;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = parseInt(searchParams.get("radius") || "50");
    const page = parseInt(searchParams.get("page") || "0");

    // Parse dates
    const today = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);

    const startDateStr = searchParams.get("startDate") || today.toISOString().split("T")[0];
    const endDateStr =
      searchParams.get("endDate") || defaultEndDate.toISOString().split("T")[0];

    const startDate = `${startDateStr}T00:00:00Z`;
    const endDate = `${endDateStr}T23:59:59Z`;

    // Build location string
    let latLong: string | undefined;
    if (lat && lng) {
      latLong = `${lat},${lng}`;
    }

    if (!city && !latLong) {
      return NextResponse.json(
        { error: "Please provide either city or lat/lng coordinates" },
        { status: 400 }
      );
    }

    // Fetch user's music profile, related artists, and saved concerts in parallel
    const [unifiedProfile, legacyProfile, relatedArtistsData, savedConcertIds, concertsResult] = await Promise.all([
      getUnifiedMusicProfile(session.user.id),
      getMusicProfile(session.user.id),
      getRelatedArtists(session.user.id).catch(() => []),
      getSavedConcerts(session.user.id),
      searchConcerts({
        city,
        latLong,
        radius,
        startDate,
        endDate,
        page,
        size: 100, // Get more for better matching
      }),
    ]);

    // Use unified profile if available, otherwise fall back to legacy Spotify profile
    const musicProfile = unifiedProfile || (legacyProfile ? {
      topArtists: legacyProfile.top_artists.map((a) => ({
        name: a.name,
        genres: a.genres,
        sources: ["spotify" as const],
        score: a.popularity,
      })),
      topGenres: legacyProfile.top_genres,
      connectedServices: ["spotify" as const],
      recentArtists: [],
    } : null);

    // If no music profile, return concerts without matching
    if (!musicProfile) {
      return NextResponse.json({
        concerts: concertsResult.concerts.map((c) => ({
          ...c,
          matchScore: 0,
          matchReasons: ["Connect a music service to see personalized matches"],
          isSaved: savedConcertIds.includes(c.id),
          vibeTags: [],
        })),
        totalElements: concertsResult.totalElements,
        totalPages: concertsResult.totalPages,
        page: concertsResult.page,
        hasProfile: false,
      });
    }

    // Build user profile for matching algorithm
    const userProfile: UserProfile = {
      topArtists: musicProfile.topArtists.map((a, index) => ({
        name: a.name,
        rank: index + 1,
      })),
      relatedArtists: relatedArtistsData.map((r) => ({
        name: r.artist_name,
        relatedTo: r.related_to,
      })),
      recentlyPlayed: musicProfile.recentArtists || [],
      topGenres: musicProfile.topGenres,
    };

    // Calculate match scores for each concert using new algorithm
    const matchedConcerts = concertsResult.concerts.map((concert) => {
      const matchResult = calculateMatchScore(
        concert.artists,
        concert.genres,
        userProfile
      );

      // Format score for display (0-100 scale)
      const displayScore = formatMatchScore(matchResult.score);
      
      // Generate vibe tags
      const vibeTags = generateVibeTags(matchResult.matchType, concert.genres);

      return {
        ...concert,
        matchScore: displayScore,
        rawScore: matchResult.score,
        matchReasons: matchResult.reasons,
        matchType: matchResult.matchType,
        matchConfidence: matchResult.confidence,
        vibeTags,
        isSaved: savedConcertIds.includes(concert.id),
      };
    });

    // Sort by raw score (highest first), then by date for ties
    matchedConcerts.sort((a, b) => {
      if (b.rawScore !== a.rawScore) {
        return b.rawScore - a.rawScore;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Categorize matches
    const mustSee = matchedConcerts.filter((c) => c.matchType === "direct-artist");
    const forYou = matchedConcerts.filter((c) => 
      c.matchType === "related-artist" || c.matchType === "recently-played"
    );
    const vibeMatch = matchedConcerts.filter((c) => c.matchType === "genre");

    return NextResponse.json({
      concerts: matchedConcerts,
      categories: {
        mustSee: mustSee.length,
        forYou: forYou.length,
        vibeMatch: vibeMatch.length,
      },
      totalElements: concertsResult.totalElements,
      totalPages: concertsResult.totalPages,
      page: concertsResult.page,
      hasProfile: true,
      userTopArtists: userProfile.topArtists.slice(0, 10).map(a => a.name),
      userTopGenres: musicProfile.topGenres.slice(0, 5),
      connectedServices: musicProfile.connectedServices || ["spotify"],
    });
  } catch (error) {
    console.error("Error in /api/matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch personalized concerts" },
      { status: 500 }
    );
  }
}
