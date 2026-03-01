import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAggregatedArtists,
  getMusicProfile,
  getUserItinerary,
  saveUserItinerary,
  deleteUserItinerary,
} from "@/lib/supabase";
import {
  getFestival,
  getFestivalLineup,
  calculateArtistMatch,
  generateSmartItinerary,
} from "@/lib/festivals";
import type { FestivalArtistMatch } from "@/lib/festival-types";

/**
 * GET /api/festivals/[id]/itinerary
 * Get user's itinerary - returns saved version if exists, otherwise generates new
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

    // Check if user wants to force regeneration
    const forceRegenerate = searchParams.get("regenerate") === "true";

    // Get festival info first
    const festival = await getFestival(festivalId);
    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    // Check for saved itinerary (unless forcing regeneration)
    if (!forceRegenerate) {
      const savedItinerary = await getUserItinerary(session.user.id, festivalId);
      if (savedItinerary) {
        return NextResponse.json({
          festival: {
            id: festival.id,
            name: festival.name,
            dates: festival.dates,
            location: festival.location,
          },
          itinerary: savedItinerary.itinerary,
          settings: savedItinerary.settings,
          isSaved: true,
          savedAt: savedItinerary.updated_at,
          stats: calculateStats(savedItinerary.itinerary),
        });
      }
    }

    // Options from query params
    const maxPerDay = parseInt(searchParams.get("maxPerDay") || "8");
    const includeDiscoveries = searchParams.get("discoveries") !== "false";
    const restBreakMinutes = parseInt(searchParams.get("restBreak") || "90");

    // Use festival.id (UUID) not festivalId (could be slug)
    const lineup = await getFestivalLineup(festival.id);
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
      settings: {
        maxPerDay,
        restBreak: restBreakMinutes,
        includeDiscoveries,
      },
      isSaved: false,
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
 * Save user's custom itinerary
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

    const { itinerary, settings } = body;

    if (!itinerary) {
      return NextResponse.json(
        { error: "Itinerary data is required" },
        { status: 400 }
      );
    }

    // Verify festival exists
    const festival = await getFestival(festivalId);
    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    // Save the itinerary
    const saved = await saveUserItinerary(
      session.user.id,
      festivalId,
      itinerary,
      settings
    );

    if (!saved) {
      return NextResponse.json(
        { error: "Failed to save itinerary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Itinerary saved successfully",
      savedAt: saved.updated_at,
    });
  } catch (error) {
    console.error("Error saving itinerary:", error);
    return NextResponse.json(
      { error: "Failed to save itinerary" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/festivals/[id]/itinerary
 * Delete saved itinerary (reset to AI-generated)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: festivalId } = await params;

    const deleted = await deleteUserItinerary(session.user.id, festivalId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Failed to reset itinerary" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Itinerary reset to AI suggestions",
    });
  } catch (error) {
    console.error("Error resetting itinerary:", error);
    return NextResponse.json(
      { error: "Failed to reset itinerary" },
      { status: 500 }
    );
  }
}

// Helper to calculate stats from saved itinerary
function calculateStats(itinerary: unknown): {
  totalArtists: number;
  scheduledArtists: number;
  mustSeeCount: number;
  conflictCount: number;
} {
  // Type guard for itinerary structure
  const it = itinerary as {
    days?: Array<{
      slots?: Array<unknown>;
      mustSeeCount?: number;
    }>;
    conflicts?: Array<unknown>;
  };

  if (!it?.days) {
    return {
      totalArtists: 0,
      scheduledArtists: 0,
      mustSeeCount: 0,
      conflictCount: 0,
    };
  }

  return {
    totalArtists: 0, // We don't store total lineup in saved itinerary
    scheduledArtists: it.days.reduce((sum, d) => sum + (d.slots?.length || 0), 0),
    mustSeeCount: it.days.reduce((sum, d) => sum + (d.mustSeeCount || 0), 0),
    conflictCount: it.conflicts?.length || 0,
  };
}
