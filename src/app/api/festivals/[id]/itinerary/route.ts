import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAggregatedArtists, getMusicProfile } from "@/lib/supabase";
import {
  getFestival,
  getFestivalLineup,
  calculateArtistMatch,
  generateSmartItinerary,
} from "@/lib/festivals";
import type { FestivalArtistMatch } from "@/lib/festival-types";

/**
 * GET /api/festivals/[id]/itinerary
 * Generate a smart itinerary for the user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required for personalized itinerary" },
        { status: 401 }
      );
    }

    const { id: festivalId } = await params;
    const { searchParams } = new URL(request.url);

    // Options from query params
    const maxPerDay = parseInt(searchParams.get("maxPerDay") || "8");
    const includeDiscoveries = searchParams.get("discoveries") !== "false";
    const restBreakMinutes = parseInt(searchParams.get("restBreak") || "90");

    // Get festival and lineup
    const festival = await getFestival(festivalId);
    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    const lineup = await getFestivalLineup(festivalId);
    if (lineup.length === 0) {
      return NextResponse.json(
        { error: "No lineup data available for this festival" },
        { status: 400 }
      );
    }

    // Get user's music profile
    const userArtists = await getAggregatedArtists(session.user.id);
    let userGenres: string[] = [];

    if (userArtists.length === 0) {
      // Fall back to legacy profile
      const legacyProfile = await getMusicProfile(session.user.id);
      if (legacyProfile) {
        userGenres = legacyProfile.top_genres || [];
      }
    } else {
      // Extract genres from aggregated artists
      const genreCount = new Map<string, number>();
      userArtists.forEach((artist) => {
        artist.genres.forEach((genre) => {
          const normalized = genre.toLowerCase();
          genreCount.set(normalized, (genreCount.get(normalized) || 0) + 1);
        });
      });
      userGenres = Array.from(genreCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 25)
        .map(([genre]) => genre);
    }

    // Calculate matches for entire lineup
    const matchedLineup: FestivalArtistMatch[] = lineup.map((artist) =>
      calculateArtistMatch(artist, userArtists, userGenres)
    );

    // Generate smart itinerary
    const itinerary = generateSmartItinerary(matchedLineup, festival, {
      maxPerDay,
      includeDiscoveries,
      restBreakMinutes,
    });

    return NextResponse.json({
      festival: {
        id: festival.id,
        name: festival.name,
        dates: festival.dates,
        location: festival.location,
      },
      itinerary,
      stats: {
        totalArtists: lineup.length,
        scheduledArtists: itinerary.days.reduce((sum, d) => sum + d.slots.length, 0),
        mustSeeCount: itinerary.days.reduce((sum, d) => sum + d.mustSeeCount, 0),
        conflictCount: itinerary.conflicts.length,
      },
    });
  } catch (error) {
    console.error("Error generating itinerary:", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/festivals/[id]/itinerary
 * Update itinerary (swap artists, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: festivalId } = await params;
    const body = await request.json();

    // TODO: Implement saving user's custom itinerary
    // For now, just acknowledge the request

    return NextResponse.json({
      success: true,
      message: "Itinerary preferences saved",
    });
  } catch (error) {
    console.error("Error saving itinerary:", error);
    return NextResponse.json(
      { error: "Failed to save itinerary" },
      { status: 500 }
    );
  }
}
