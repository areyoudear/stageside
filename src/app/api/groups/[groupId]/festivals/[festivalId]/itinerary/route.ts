import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGroupById } from "@/lib/concert-buddy";
import { getAggregatedArtists, getMusicProfile } from "@/lib/supabase";
import {
  getFestival,
  getFestivalLineup,
  generateGroupFestivalItinerary,
  normalizeArtistName,
} from "@/lib/festivals";

/**
 * GET /api/groups/[groupId]/festivals/[festivalId]/itinerary
 * Generate a group festival itinerary with conflict resolution
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string; festivalId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { groupId, festivalId } = await params;
    const { searchParams } = new URL(request.url);

    const maxPerDay = parseInt(searchParams.get("maxPerDay") || "8");
    const restBreakMinutes = parseInt(searchParams.get("restBreak") || "60");

    // Get group
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Verify user is member
    const isMember = group.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // Get festival and lineup
    const festival = await getFestival(festivalId);
    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    const lineup = await getFestivalLineup(festivalId);
    if (lineup.length === 0) {
      return NextResponse.json(
        { error: "No lineup data available" },
        { status: 400 }
      );
    }

    // Build member profiles with artist matches
    const memberProfiles = [];

    for (const member of group.members) {
      const artistMatches = new Map<string, { score: number; type: string; reason?: string }>();

      // Get user's music data
      const userArtists = await getAggregatedArtists(member.userId);
      let userGenres: string[] = [];

      if (userArtists.length === 0) {
        // Fall back to legacy profile
        const legacyProfile = await getMusicProfile(member.userId);
        if (legacyProfile) {
          userGenres = legacyProfile.top_genres || [];
          // Add artists from legacy profile
          for (const artist of legacyProfile.top_artists || []) {
            const normalized = normalizeArtistName(artist.name);
            artistMatches.set(normalized, {
              score: Math.min(100, 60 + artist.popularity * 0.4),
              type: 'perfect',
              reason: 'In your top artists',
            });
          }
        }
      } else {
        // Use aggregated artists
        for (const artist of userArtists) {
          const normalized = normalizeArtistName(artist.artist_name);
          // Score based on rank (earlier = higher)
          const index = userArtists.indexOf(artist);
          const score = Math.max(50, 100 - index);
          artistMatches.set(normalized, {
            score,
            type: 'perfect',
            reason: index < 10 ? `Top ${index + 1} artist` : 'In your top artists',
          });
        }

        // Extract genres
        const genreCount = new Map<string, number>();
        userArtists.forEach((artist) => {
          artist.genres.forEach((genre) => {
            const normalized = genre.toLowerCase();
            genreCount.set(normalized, (genreCount.get(normalized) || 0) + 1);
          });
        });
        userGenres = Array.from(genreCount.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([genre]) => genre);
      }

      // Match lineup artists to user's profile
      for (const artist of lineup) {
        const normalized = normalizeArtistName(artist.artist_name);
        
        // Skip if already matched directly
        if (artistMatches.has(normalized)) continue;

        // Check genre match
        const artistGenres = artist.genres || [];
        const genreMatch = artistGenres.find((g) =>
          userGenres.some((ug) =>
            g.toLowerCase().includes(ug) || ug.includes(g.toLowerCase())
          )
        );

        if (genreMatch) {
          artistMatches.set(normalized, {
            score: 40,
            type: 'genre',
            reason: `Matches ${genreMatch} taste`,
          });
        }
      }

      memberProfiles.push({
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        artistMatches,
      });
    }

    // Generate group itinerary
    const itinerary = generateGroupFestivalItinerary(lineup, festival, memberProfiles, {
      maxPerDay,
      restBreakMinutes,
    });

    return NextResponse.json({
      festival: {
        id: festival.id,
        name: festival.name,
        dates: festival.dates,
        location: festival.location,
      },
      group: {
        id: group.id,
        name: group.name,
        memberCount: group.members.length,
        members: group.members.map((m) => ({
          userId: m.userId,
          username: m.username,
          displayName: m.displayName,
        })),
      },
      itinerary,
      stats: {
        totalSlots: itinerary.days.reduce((sum, d) => sum + d.slots.length, 0),
        consensusSlots: itinerary.days.reduce((sum, d) => sum + d.consensusCount, 0),
        compromiseSlots: itinerary.days.reduce((sum, d) => sum + d.compromiseCount, 0),
      },
    });
  } catch (error) {
    console.error("Error generating group itinerary:", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}
