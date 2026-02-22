import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchConcerts } from "@/lib/ticketmaster";
import { getMusicProfile, getSavedConcerts, getUnifiedMusicProfile, getRelatedArtists, getMusicConnection } from "@/lib/supabase";
import { 
  calculatePreciseMatchScore, 
  formatMatchScore, 
  generateVibeTags, 
  type UserProfile,
  type UserAudioProfile,
  type ArtistAudioProfile,
  type PreciseMatchResult,
} from "@/lib/matching";
import { enrichConcertsWithPreviews } from "@/lib/concert-enrichment";

/**
 * GET /api/matches
 * Get personalized concert recommendations with precision scoring
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

    // Fetch user's music profile, related artists, saved concerts, and Spotify token in parallel
    const [unifiedProfile, legacyProfile, relatedArtistsData, savedConcertIds, spotifyConnection, concertsResult] = await Promise.all([
      getUnifiedMusicProfile(session.user.id),
      getMusicProfile(session.user.id),
      getRelatedArtists(session.user.id).catch(() => []),
      getSavedConcerts(session.user.id),
      getMusicConnection(session.user.id, "spotify").catch(() => null),
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
        genres: a.genres,
      })),
      relatedArtists: relatedArtistsData.map((r) => ({
        name: r.artist_name,
        relatedTo: r.related_to,
        similarity: (r.popularity || 50) / 100, // Convert popularity to similarity
      })),
      recentlyPlayed: musicProfile.recentArtists || [],
      topGenres: musicProfile.topGenres,
    };

    // TODO: Fetch user audio profile from database when available
    const userAudioProfile: UserAudioProfile | null = null;
    
    // TODO: Fetch artist audio profiles from database/cache when available
    const artistAudioProfiles = new Map<string, ArtistAudioProfile>();
    
    // TODO: Fetch social signals when available
    const socialSignals = { friendsInterested: 0, friendsGoing: 0 };

    // Calculate match scores for each concert using precision algorithm
    const matchedConcerts = concertsResult.concerts.map((concert) => {
      const matchResult: PreciseMatchResult = calculatePreciseMatchScore(
        concert.artists,
        concert.genres,
        userProfile,
        userAudioProfile,
        artistAudioProfiles,
        socialSignals
      );

      // Score is already 0-100, just format it
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
        scoreBreakdown: matchResult.breakdown,
        vibeTags,
        isSaved: savedConcertIds.includes(concert.id),
      };
    });

    // Sort by score (highest first), then by date for ties
    matchedConcerts.sort((a, b) => {
      if (b.rawScore !== a.rawScore) {
        return b.rawScore - a.rawScore;
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Enrich top concerts with audio previews (limit to top 30 to save API calls)
    // User's Spotify token required for preview URLs since Spotify API change
    const spotifyToken = spotifyConnection?.access_token;
    const enrichedConcerts = await enrichConcertsWithPreviews(matchedConcerts, 30, spotifyToken);

    // Categorize matches by type
    const mustSee = enrichedConcerts.filter((c) => c.matchType === "must-see");
    const forYou = enrichedConcerts.filter((c) => c.matchType === "for-you");
    const vibeMatch = enrichedConcerts.filter((c) => c.matchType === "vibe-match");
    const discovery = enrichedConcerts.filter((c) => c.matchType === "discovery");

    return NextResponse.json({
      concerts: enrichedConcerts,
      categories: {
        mustSee: mustSee.length,
        forYou: forYou.length,
        vibeMatch: vibeMatch.length,
        discovery: discovery.length,
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
