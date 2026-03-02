import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import {
  buildCrewSchedule,
  getScheduleSummary,
  type ScheduledArtist,
  type CrewMemberInterest,
  type CrewSchedule,
} from "@/lib/schedule-planner";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/festivals/[id]/schedule/crew
 * 
 * Get crew schedule with conflicts, meetups, and free slots calculated.
 * 
 * Query params:
 * - crewId: UUID of the crew (required)
 * - day: Optional filter to specific day
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: festivalId } = await context.params;
    const crewId = request.nextUrl.searchParams.get("crewId");
    const dayFilter = request.nextUrl.searchParams.get("day");

    if (!crewId) {
      return NextResponse.json({ error: "crewId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify user is in this crew
    const { data: membership, error: memberError } = await supabase
      .from("festival_crew_members")
      .select("id, role")
      .eq("crew_id", crewId)
      .eq("user_id", session.user.id)
      .single();

    if (memberError || !membership) {
      return NextResponse.json(
        { error: "You are not a member of this crew" },
        { status: 403 }
      );
    }

    // Get crew info
    const { data: crew, error: crewError } = await supabase
      .from("festival_crews")
      .select("id, name, festival_id")
      .eq("id", crewId)
      .single();

    if (crewError || !crew) {
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    }

    // Verify crew is for this festival
    if (crew.festival_id !== festivalId) {
      return NextResponse.json(
        { error: "Crew is not for this festival" },
        { status: 400 }
      );
    }

    // Get all crew members
    const { data: members, error: membersError } = await supabase
      .from("festival_crew_members")
      .select(`
        user_id,
        role,
        user:users(id, display_name, username, avatar_url)
      `)
      .eq("crew_id", crewId);

    if (membersError) {
      console.error("Error fetching crew members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch crew members" },
        { status: 500 }
      );
    }

    const crewMembers = (members || []).map((m) => {
      const user = m.user as unknown as {
        id: string;
        display_name: string;
        username: string;
        avatar_url: string;
      };
      return {
        userId: user.id,
        displayName: user.display_name || user.username || "Unknown",
        username: user.username,
        avatarUrl: user.avatar_url,
      };
    });

    const crewSize = crewMembers.length;

    // Get festival with UUID lookup (festivalId might be a slug)
    const { data: festival, error: festivalError } = await supabase
      .from("festivals")
      .select("id, name, slug, dates")
      .or(`id.eq.${festivalId},slug.eq.${festivalId}`)
      .single();

    if (festivalError || !festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    // Get all artists for this festival with schedule info
    let artistsQuery = supabase
      .from("festival_artists")
      .select("*")
      .eq("festival_id", festival.id)
      .not("start_time", "is", null); // Only artists with schedule

    if (dayFilter) {
      artistsQuery = artistsQuery.eq("day", dayFilter);
    }

    const { data: artists, error: artistsError } = await artistsQuery;

    if (artistsError) {
      console.error("Error fetching artists:", artistsError);
      return NextResponse.json(
        { error: "Failed to fetch schedule" },
        { status: 500 }
      );
    }

    // Map to ScheduledArtist type
    const scheduledArtists: ScheduledArtist[] = (artists || []).map((a) => ({
      id: a.id,
      artistName: a.artist_name,
      stage: a.stage || "TBA",
      day: a.day || "Day 1",
      startTime: a.start_time,
      endTime: a.end_time,
      headliner: a.headliner || false,
      genres: a.genres || [],
      imageUrl: a.image_url,
      spotifyId: a.spotify_id,
    }));

    // Get all crew members' artist interests for this festival
    const { data: interests, error: interestsError } = await supabase
      .from("festival_artist_interests")
      .select("user_id, artist_id, interest_level")
      .eq("festival_id", crew.festival_id)
      .in(
        "user_id",
        crewMembers.map((m) => m.userId)
      );

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
      return NextResponse.json(
        { error: "Failed to fetch interests" },
        { status: 500 }
      );
    }

    // Build crew interests map: artistId -> crew members interested
    const crewInterests = new Map<string, CrewMemberInterest[]>();
    
    for (const interest of interests || []) {
      const member = crewMembers.find((m) => m.userId === interest.user_id);
      if (!member) continue;

      const existing = crewInterests.get(interest.artist_id) || [];
      existing.push({
        userId: member.userId,
        displayName: member.displayName,
        username: member.username,
        avatarUrl: member.avatarUrl,
        artistId: interest.artist_id,
        interestLevel: interest.interest_level as 'must-see' | 'interested' | 'maybe',
      });
      crewInterests.set(interest.artist_id, existing);
    }

    // Get unique days
    const days = [...new Set(scheduledArtists.map((a) => a.day))].sort();

    // Build schedule for each day
    const schedules: CrewSchedule[] = days.map((day) =>
      buildCrewSchedule(day, scheduledArtists, crewInterests, crewSize)
    );

    // Get summary
    const summary = getScheduleSummary(schedules);

    return NextResponse.json({
      festival: {
        id: festival.id,
        name: festival.name,
        slug: festival.slug,
      },
      crew: {
        id: crew.id,
        name: crew.name,
        members: crewMembers,
        size: crewSize,
      },
      days,
      schedules,
      summary,
      hasSchedule: scheduledArtists.length > 0,
      artistCount: scheduledArtists.length,
      interestedArtistCount: crewInterests.size,
    });
  } catch (error) {
    console.error("Error in crew schedule API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
