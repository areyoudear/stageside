import { NextRequest, NextResponse } from "next/server";
import { searchConcerts, Concert } from "@/lib/ticketmaster";
import { calculateDistance } from "@/lib/utils";
import { getArtistsTopTrackPreviews } from "@/lib/itunes";

/**
 * GET /api/concerts/browse
 * Fetch concerts for anonymous/public browsing (no personalization)
 * Enriches with iTunes previews for audio playback
 * 
 * Query params:
 * - lat, lng: Location (required)
 * - startDate, endDate: Date range (optional, defaults to today + 3 months)
 * - radius: Search radius in miles (default: 50)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const radius = parseInt(searchParams.get("radius") || "50");

  // Validate required params
  if (!lat || !lng) {
    return NextResponse.json(
      { error: "Location (lat/lng) is required" },
      { status: 400 }
    );
  }

  // Parse dates
  const today = new Date();
  const defaultEndDate = new Date();
  defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);

  const startDate = startDateParam || today.toISOString().split("T")[0];
  const endDate = endDateParam || defaultEndDate.toISOString().split("T")[0];

  // Format dates for Ticketmaster API
  const formattedStartDate = `${startDate}T00:00:00Z`;
  const formattedEndDate = `${endDate}T23:59:59Z`;

  try {
    // Fetch concerts from Ticketmaster
    const concertsResult = await searchConcerts({
      latLong: `${lat},${lng}`,
      radius,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      size: 100,
    });

    // Parse user location for distance calculation
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    // Get unique artist names for preview fetching (first 20 to limit API calls)
    const uniqueArtists = [...new Set(
      concertsResult.concerts
        .slice(0, 30)
        .flatMap(c => c.artists)
    )].slice(0, 20);

    // Fetch iTunes previews in parallel
    const previewsMap = await getArtistsTopTrackPreviews(uniqueArtists, 5);

    // Add distance and previews to each concert
    const browseConcerts: Concert[] = concertsResult.concerts.map((concert) => {
      // Calculate distance if venue has location
      let distance: number | undefined;
      if (concert.venue.location) {
        distance = calculateDistance(
          userLat,
          userLng,
          concert.venue.location.lat,
          concert.venue.location.lng
        );
      }

      // Get preview for first artist
      const primaryArtist = concert.artists[0]?.toLowerCase();
      const preview = primaryArtist ? previewsMap.get(primaryArtist) : null;

      return {
        ...concert,
        matchScore: undefined, // No match score for anonymous
        matchReasons: undefined, // No match reasons for anonymous
        isSaved: false,
        distance,
        // Add iTunes preview data
        previewUrl: preview?.previewUrl || null,
        topTrackName: preview?.trackName || null,
      };
    });

    // Sort by date (soonest first)
    browseConcerts.sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    return NextResponse.json({
      mode: "browse",
      concerts: browseConcerts,
      totalElements: concertsResult.totalElements,
      dateRange: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error("Error fetching browse concerts:", error);
    return NextResponse.json({
      mode: "browse",
      concerts: [],
      totalElements: 0,
      error: "Could not fetch concerts. Please try again later.",
    });
  }
}
