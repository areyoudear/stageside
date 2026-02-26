import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchConcerts, Concert } from "@/lib/ticketmaster";
import { calculateMatchScore, calculateDistance } from "@/lib/utils";
import { getPairMatchedConcerts, PairMatchedConcert } from "@/lib/concert-buddy";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/concerts/matched
 * Fetch concerts and match against user-provided artists
 * 
 * Query params:
 * - lat, lng: Location (required)
 * - startDate, endDate: Date range (optional, defaults to today + 3 months)
 * - artists: Comma-separated artist names (required for solo mode)
 * - genres: Comma-separated genre names (optional)
 * - radius: Search radius in miles (default: 50)
 * - friendId: If provided, switches to pair matching mode
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
  const friendId = searchParams.get("friendId");

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

  // ============================================
  // PAIR MATCHING MODE (with friendId)
  // ============================================
  if (friendId) {
    try {
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const userId = session.user.id;

      // Verify friendship
      const adminClient = createAdminClient();
      const { data: friendship, error: friendshipError } = await adminClient
        .from("friendships")
        .select("id, status")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
        )
        .eq("status", "accepted")
        .single();

      if (friendshipError || !friendship) {
        return NextResponse.json(
          { error: "You must be friends to find matched concerts" },
          { status: 403 }
        );
      }

      // Get friend info
      const { data: friendUser } = await adminClient
        .from("users")
        .select("id, display_name, username")
        .eq("id", friendId)
        .single();

      // Get pair matched concerts
      const pairMatches = await getPairMatchedConcerts(
        userId,
        friendId,
        { lat: parseFloat(lat), lng: parseFloat(lng) },
        { start: startDate, end: endDate }
      );

      // Calculate distances
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      const concertsWithDistance = pairMatches.map((match) => {
        let distance: number | undefined;
        if (match.concert.venue.location) {
          distance = calculateDistance(
            userLat,
            userLng,
            match.concert.venue.location.lat,
            match.concert.venue.location.lng
          );
        }
        return {
          ...match,
          concert: {
            ...match.concert,
            distance,
          },
        };
      });

      // Categorize concerts
      const sharedArtistConcerts = concertsWithDistance.filter((c) => c.isSharedArtist);
      const bothMatchConcerts = concertsWithDistance.filter(
        (c) => c.userMatches && c.friendMatches && !c.isSharedArtist
      );
      const userOnlyConcerts = concertsWithDistance.filter(
        (c) => c.userMatches && !c.friendMatches && !c.isSharedArtist
      );
      const friendOnlyConcerts = concertsWithDistance.filter(
        (c) => !c.userMatches && c.friendMatches && !c.isSharedArtist
      );

      return NextResponse.json({
        mode: "pair",
        friend: friendUser
          ? {
              id: friendUser.id,
              name: friendUser.display_name || friendUser.username,
              username: friendUser.username,
            }
          : null,
        concerts: concertsWithDistance,
        categories: {
          sharedArtists: sharedArtistConcerts.length,
          bothMatch: bothMatchConcerts.length,
          userOnly: userOnlyConcerts.length,
          friendOnly: friendOnlyConcerts.length,
        },
        totalElements: concertsWithDistance.length,
        dateRange: { start: startDate, end: endDate },
      });
    } catch (error) {
      console.error("Error in pair matching:", error);
      return NextResponse.json(
        {
          concerts: [],
          error: "Could not fetch pair-matched concerts. Please try again.",
        },
        { status: 500 }
      );
    }
  }

  // ============================================
  // SOLO MATCHING MODE (with artists param)
  // ============================================
  if (!artistsParam) {
    return NextResponse.json(
      { error: "Either 'artists' or 'friendId' parameter is required" },
      { status: 400 }
    );
  }

  // Parse artists and genres
  const userArtists = artistsParam
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
  const userGenres = genresParam
    ? genresParam
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
    : [];

  if (userArtists.length === 0) {
    return NextResponse.json(
      { error: "At least one artist is required" },
      { status: 400 }
    );
  }

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

    // Calculate match scores and distances
    const matchedConcerts: Concert[] = concertsResult.concerts.map((concert) => {
      const { score, reasons } = calculateMatchScore(
        concert.artists,
        concert.genres,
        userArtists,
        userGenres
      );

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

      return {
        ...concert,
        matchScore: score,
        matchReasons: reasons.length > 0 ? reasons : ["Happening near you"],
        isSaved: false,
        distance,
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
      mode: "solo",
      concerts: matchedConcerts,
      highMatches: highMatches.length,
      totalElements: concertsResult.totalElements,
      userArtists,
      userGenres,
      dateRange: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error("Error fetching matched concerts:", error);
    return NextResponse.json({
      mode: "solo",
      concerts: [],
      highMatches: 0,
      totalElements: 0,
      userArtists,
      userGenres,
      error: "Could not fetch concerts. Please try again later.",
    });
  }
}
