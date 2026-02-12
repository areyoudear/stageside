import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getGroupById,
  calculateGroupMatchScore,
  findOverlapArtists,
  findOverlapGenres,
} from "@/lib/concert-buddy";

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY;
const TICKETMASTER_BASE_URL = "https://app.ticketmaster.com/discovery/v2";

interface TicketmasterEvent {
  id: string;
  name: string;
  dates: {
    start: {
      localDate: string;
      localTime?: string;
    };
  };
  _embedded?: {
    venues?: Array<{
      name: string;
      city?: { name: string };
      state?: { stateCode: string };
    }>;
    attractions?: Array<{
      name: string;
      classifications?: Array<{
        genre?: { name: string };
        subGenre?: { name: string };
      }>;
    }>;
  };
  images?: Array<{ url: string; width: number; height: number }>;
  priceRanges?: Array<{ min: number; max: number }>;
  url?: string;
}

/**
 * GET /api/groups/[groupId]/matches
 * Find concerts that match the group's combined preferences
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { groupId } = await params;
    const { searchParams } = new URL(request.url);

    // Get group details
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify user is a member
    const isMember = group.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Get search params (from group or query)
    const lat = searchParams.get("lat") || group.location?.lat?.toString();
    const lng = searchParams.get("lng") || group.location?.lng?.toString();
    const radius = searchParams.get("radius") || "50";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Location required (set group location or provide lat/lng)" },
        { status: 400 }
      );
    }

    // Find overlap artists and genres for the group
    const overlapArtists = findOverlapArtists(group.members);
    const overlapGenres = findOverlapGenres(group.members);

    // Search Ticketmaster
    const tmParams = new URLSearchParams({
      apikey: TICKETMASTER_API_KEY!,
      latlong: `${lat},${lng}`,
      radius: radius,
      unit: "miles",
      classificationName: "music",
      size: "100",
      sort: "date,asc",
    });

    if (startDate) tmParams.append("startDateTime", `${startDate}T00:00:00Z`);
    if (endDate) tmParams.append("endDateTime", `${endDate}T23:59:59Z`);

    const tmResponse = await fetch(
      `${TICKETMASTER_BASE_URL}/events.json?${tmParams.toString()}`
    );

    if (!tmResponse.ok) {
      console.error("Ticketmaster API error:", await tmResponse.text());
      return NextResponse.json({ error: "Failed to fetch concerts" }, { status: 500 });
    }

    const tmData = await tmResponse.json();
    const events: TicketmasterEvent[] = tmData._embedded?.events || [];

    // Calculate group match scores for each concert
    const matchedConcerts = events.map((event) => {
      const artists = event._embedded?.attractions?.map((a) => a.name) || [];
      const genres =
        event._embedded?.attractions?.flatMap(
          (a) =>
            a.classifications?.flatMap((c) =>
              [c.genre?.name, c.subGenre?.name].filter(Boolean)
            ) || []
        ) || [];

      const matchResult = calculateGroupMatchScore(
        artists,
        genres as string[],
        group.members
      );

      // Get best image
      const image = event.images
        ?.filter((i) => i.width >= 400)
        .sort((a, b) => b.width - a.width)[0]?.url;

      return {
        id: event.id,
        name: event.name,
        artists,
        genres,
        date: event.dates.start.localDate,
        time: event.dates.start.localTime,
        venue: event._embedded?.venues?.[0]?.name,
        city: event._embedded?.venues?.[0]?.city?.name,
        state: event._embedded?.venues?.[0]?.state?.stateCode,
        image,
        priceRange: event.priceRanges?.[0],
        ticketUrl: event.url,
        match: {
          score: matchResult.score,
          type: matchResult.matchType,
          members: matchResult.matchedMembers,
        },
      };
    });

    // Sort by match score (universal > majority > some, then by score)
    const typeOrder = { universal: 0, majority: 1, some: 2 };
    matchedConcerts.sort((a, b) => {
      const typeCompare = typeOrder[a.match.type] - typeOrder[b.match.type];
      if (typeCompare !== 0) return typeCompare;
      return b.match.score - a.match.score;
    });

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
        overlapArtists: overlapArtists.slice(0, 10),
        overlapGenres: overlapGenres.slice(0, 10),
      },
      concerts: matchedConcerts,
      totalCount: matchedConcerts.length,
      universalMatches: matchedConcerts.filter((c) => c.match.type === "universal").length,
      majorityMatches: matchedConcerts.filter((c) => c.match.type === "majority").length,
    });
  } catch (error) {
    console.error("Error fetching group matches:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
