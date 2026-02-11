import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchConcerts, Concert } from "@/lib/ticketmaster";
import { getMusicProfile, getSavedConcerts, getUnifiedMusicProfile } from "@/lib/supabase";
import { calculateMatchScore } from "@/lib/utils";

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

    // Fetch user's music profile and saved concerts in parallel
    const [unifiedProfile, legacyProfile, savedConcertIds, concertsResult] = await Promise.all([
      getUnifiedMusicProfile(session.user.id),
      getMusicProfile(session.user.id),
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
    } : null);

    // If no music profile, return concerts without matching
    if (!musicProfile) {
      return NextResponse.json({
        concerts: concertsResult.concerts.map((c) => ({
          ...c,
          matchScore: 0,
          matchReasons: ["Connect a music service to see personalized matches"],
          isSaved: savedConcertIds.includes(c.id),
        })),
        totalElements: concertsResult.totalElements,
        totalPages: concertsResult.totalPages,
        page: concertsResult.page,
        hasProfile: false,
      });
    }

    // Extract artist names and genres from profile
    const userArtistNames = musicProfile.topArtists.map((a) => a.name);
    const userGenres = musicProfile.topGenres;

    // Calculate match scores for each concert
    const matchedConcerts: Concert[] = concertsResult.concerts.map((concert) => {
      const { score, reasons } = calculateMatchScore(
        concert.artists,
        concert.genres,
        userArtistNames,
        userGenres
      );

      return {
        ...concert,
        matchScore: score,
        matchReasons: reasons.length > 0 ? reasons : ["Happening near you"],
        isSaved: savedConcertIds.includes(concert.id),
      };
    });

    // Sort by match score (highest first), then by date
    matchedConcerts.sort((a, b) => {
      if ((b.matchScore || 0) !== (a.matchScore || 0)) {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Separate high-match concerts
    const highMatches = matchedConcerts.filter((c) => (c.matchScore || 0) >= 50);

    return NextResponse.json({
      concerts: matchedConcerts,
      highMatches: highMatches.length,
      totalElements: concertsResult.totalElements,
      totalPages: concertsResult.totalPages,
      page: concertsResult.page,
      hasProfile: true,
      userTopArtists: userArtistNames.slice(0, 10),
      userTopGenres: userGenres.slice(0, 5),
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
