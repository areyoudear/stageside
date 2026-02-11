import { NextRequest, NextResponse } from "next/server";
import { searchConcerts, Concert } from "@/lib/ticketmaster";
import { calculateMatchScore } from "@/lib/utils";

/**
 * GET /api/concerts/matched
 * Fetch concerts and match against user-provided artists
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const artistsParam = searchParams.get("artists"); // comma-separated
  const genresParam = searchParams.get("genres"); // comma-separated
  const radius = parseInt(searchParams.get("radius") || "50");

  // Validate required params
  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Location (lat/lng) is required" },
      { status: 400 }
    );
  }

  if (!artistsParam) {
    return NextResponse.json(
      { error: "At least one artist is required" },
      { status: 400 }
    );
  }

  // Parse artists and genres
  const userArtists = artistsParam.split(",").map((a) => a.trim()).filter(Boolean);
  const userGenres = genresParam ? genresParam.split(",").map((g) => g.trim()).filter(Boolean) : [];

  if (userArtists.length === 0) {
    return NextResponse.json(
      { error: "At least one artist is required" },
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

  try {
    // Fetch concerts from Ticketmaster
    const concertsResult = await searchConcerts({
      latLong: `${lat},${lng}`,
      radius,
      startDate,
      endDate,
      size: 100,
    });

    // Calculate match scores against user's artists and genres
    const matchedConcerts: Concert[] = concertsResult.concerts.map((concert) => {
      const { score, reasons } = calculateMatchScore(
        concert.artists,
        concert.genres,
        userArtists,
        userGenres
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
      userArtists,
      userGenres,
    });
  } catch (error) {
    console.error("Error fetching matched concerts:", error);
    return NextResponse.json({
      concerts: [],
      highMatches: 0,
      totalElements: 0,
      userArtists,
      userGenres,
      error: "Could not fetch concerts. Please try again later.",
    });
  }
}
