import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import {
  buildCrewSchedule,
  type ScheduledArtist,
  type CrewMemberInterest,
} from "@/lib/schedule-planner";
import {
  exportCrewScheduleToICS,
  getICSFilename,
} from "@/lib/calendar-export";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/festivals/[id]/schedule/export
 * 
 * Export crew schedule as ICS calendar file.
 * 
 * Query params:
 * - crewId: UUID of the crew (required)
 * - format: "ics" (default) | "json"
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
    const format = request.nextUrl.searchParams.get("format") || "ics";

    if (!crewId) {
      return NextResponse.json({ error: "crewId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify user is in this crew
    const { data: membership } = await supabase
      .from("festival_crew_members")
      .select("id")
      .eq("crew_id", crewId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this crew" },
        { status: 403 }
      );
    }

    // Get crew info
    const { data: crew } = await supabase
      .from("festival_crews")
      .select("id, name, festival_id")
      .eq("id", crewId)
      .single();

    if (!crew) {
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    }

    // Get festival
    const { data: festival } = await supabase
      .from("festivals")
      .select("id, name, slug, dates")
      .or(`id.eq.${festivalId},slug.eq.${festivalId}`)
      .single();

    if (!festival) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    // Get all crew members
    const { data: members } = await supabase
      .from("festival_crew_members")
      .select(`
        user_id,
        user:users(id, display_name, username, avatar_url)
      `)
      .eq("crew_id", crewId);

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

    // Get scheduled artists
    const { data: artists } = await supabase
      .from("festival_artists")
      .select("*")
      .eq("festival_id", festival.id)
      .not("start_time", "is", null);

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

    // Get crew interests
    const { data: interests } = await supabase
      .from("festival_artist_interests")
      .select("user_id, artist_id, interest_level")
      .eq("festival_id", crew.festival_id)
      .in("user_id", crewMembers.map((m) => m.userId));

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

    // Build schedules
    const days = Array.from(new Set(scheduledArtists.map((a) => a.day))).sort();
    const schedules = days.map((day) =>
      buildCrewSchedule(day, scheduledArtists, crewInterests, crewSize)
    );

    // Build festival dates map from festival.dates
    const festivalDates: { [day: string]: string } = {};
    const startDate = new Date((festival.dates as { start: string }).start);
    
    // Map day names to dates
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    for (let i = 0; i < days.length; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Try to match by day name or "Day X" format
      const dayName = days[i];
      if (dayName.startsWith("Day ")) {
        const dayNum = parseInt(dayName.replace("Day ", "")) - 1;
        const d = new Date(startDate);
        d.setDate(d.getDate() + dayNum);
        festivalDates[dayName] = d.toISOString().split("T")[0];
      } else {
        // It's a weekday name like "Friday"
        const idx = days.indexOf(dayName);
        const d = new Date(startDate);
        d.setDate(d.getDate() + idx);
        festivalDates[dayName] = d.toISOString().split("T")[0];
      }
    }

    if (format === "json") {
      return NextResponse.json({
        schedules,
        festivalDates,
        filename: getICSFilename(festival.name, crew.name),
      });
    }

    // Generate ICS
    const icsContent = exportCrewScheduleToICS(
      schedules,
      festival.name,
      festivalDates,
      crew.name
    );

    const filename = getICSFilename(festival.name, crew.name);

    return new NextResponse(icsContent, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting schedule:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
