import { NextRequest, NextResponse } from "next/server";
import { searchConcerts, Concert } from "@/lib/ticketmaster";
import { calculateMatchScore } from "@/lib/utils";
import { DEMO_TOP_ARTISTS, DEMO_TOP_GENRES } from "@/lib/demo-data";

/**
 * GET /api/demo-concerts
 * Fetch REAL concerts and match against DEMO user profile
 * This lets users see actual concerts without connecting Spotify
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const city = searchParams.get("city");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const radius = parseInt(searchParams.get("radius") || "50");

  // Validate location
  if (!lat && !lng && !city) {
    return NextResponse.json(
      { error: "Please provide lat/lng or city" },
      { status: 400 }
    );
  }

  // Parse dates
  const today = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);

  const startDate = startDateParam 
    ? `${startDateParam}T00:00:00Z`
    : `${today.toISOString().split("T")[0]}T00:00:00Z`;
  const endDate = endDateParam
    ? `${endDateParam}T23:59:59Z`
    : `${defaultEndDate.toISOString().split("T")[0]}T23:59:59Z`;

  // Build location string
  let latLong: string | undefined;
  if (lat && lng) {
    latLong = `${lat},${lng}`;
  }

  try {
    // Fetch real concerts from Ticketmaster
    const concertsResult = await searchConcerts({
      city: city || undefined,
      latLong,
      radius,
      startDate,
      endDate,
      size: 100,
    });

    // Demo profile for matching
    const demoArtistNames = DEMO_TOP_ARTISTS.map((a) => a.name);
    const demoGenres = DEMO_TOP_GENRES;

    // Calculate match scores against demo profile
    const matchedConcerts: Concert[] = concertsResult.concerts.map((concert) => {
      const { score, reasons } = calculateMatchScore(
        concert.artists,
        concert.genres,
        demoArtistNames,
        demoGenres
      );

      return {
        ...concert,
        matchScore: score,
        matchReasons: reasons.length > 0 ? reasons : ["Happening near you"],
        isSaved: false,
      };
    });

    // Sort by match score (highest first), then by date
    matchedConcerts.sort((a, b) => {
      if ((b.matchScore || 0) !== (a.matchScore || 0)) {
        return (b.matchScore || 0) - (a.matchScore || 0);
      }
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const highMatches = matchedConcerts.filter((c) => (c.matchScore || 0) >= 50);

    return NextResponse.json({
      concerts: matchedConcerts,
      highMatches: highMatches.length,
      totalElements: concertsResult.totalElements,
      userTopArtists: demoArtistNames.slice(0, 10),
      userTopGenres: demoGenres.slice(0, 5),
      isDemo: true,
    });
  } catch (error) {
    console.error("Error fetching demo concerts:", error);
    
    // If Ticketmaster fails (no API key, rate limit, etc.), return empty with message
    return NextResponse.json({
      concerts: [],
      highMatches: 0,
      totalElements: 0,
      userTopArtists: DEMO_TOP_ARTISTS.map(a => a.name).slice(0, 10),
      userTopGenres: DEMO_TOP_GENRES.slice(0, 5),
      isDemo: true,
      error: "Could not fetch concerts. Please try again later.",
    });
  }
}
