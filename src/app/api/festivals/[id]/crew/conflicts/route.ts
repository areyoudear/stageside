import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getFestivalLineup } from "@/lib/festivals";

interface ScheduleConflict {
  artist1: {
    id: string;
    name: string;
    stage: string;
    startTime: string;
    endTime: string;
  };
  artist2: {
    id: string;
    name: string;
    stage: string;
    startTime: string;
    endTime: string;
  };
  day: string;
  affectedMembers: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  }[];
  severity: "high" | "medium" | "low"; // Both must-see vs one must-see vs both interested
}

/**
 * GET /api/festivals/[id]/crew/conflicts
 * Get schedule conflicts for a crew
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: festivalId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const crewId = searchParams.get("crewId");

    if (!crewId) {
      return NextResponse.json({ error: "crewId required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify user is a member of this crew
    const { data: membership } = await supabase
      .from("festival_crew_members")
      .select("crew_id")
      .eq("crew_id", crewId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a crew member" }, { status: 403 });
    }

    // Get lineup with set times
    const lineup = await getFestivalLineup(festivalId);
    const artistsWithTimes = lineup.filter(a => a.start_time && a.end_time);

    if (artistsWithTimes.length === 0) {
      return NextResponse.json({ 
        conflicts: [],
        scheduleReleased: false,
        message: "Set times not released yet" 
      });
    }

    // Get all crew member interests
    const { data: members } = await supabase
      .from("festival_crew_members")
      .select(`
        user_id,
        users!inner (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq("crew_id", crewId);

    const memberIds = members?.map(m => m.user_id) || [];

    const { data: interests } = await supabase
      .from("festival_artist_interests")
      .select("*")
      .eq("festival_id", festivalId)
      .in("user_id", memberIds);

    // Build map: artistId -> { users who want to see, with interest level }
    const artistInterests = new Map<string, { userId: string; level: string }[]>();
    interests?.forEach(i => {
      const existing = artistInterests.get(i.artist_id) || [];
      existing.push({ userId: i.user_id, level: i.interest_level });
      artistInterests.set(i.artist_id, existing);
    });

    // Find conflicts
    const conflicts: ScheduleConflict[] = [];

    for (let i = 0; i < artistsWithTimes.length; i++) {
      for (let j = i + 1; j < artistsWithTimes.length; j++) {
        const a1 = artistsWithTimes[i];
        const a2 = artistsWithTimes[j];

        // Must be same day
        if (a1.day !== a2.day) continue;

        // Check for time overlap
        const start1 = timeToMinutes(a1.start_time!);
        const end1 = timeToMinutes(a1.end_time!);
        const start2 = timeToMinutes(a2.start_time!);
        const end2 = timeToMinutes(a2.end_time!);

        if (start1 < end2 && start2 < end1) {
          // There's an overlap - find who is affected
          const interested1 = artistInterests.get(a1.id) || [];
          const interested2 = artistInterests.get(a2.id) || [];

          // Find users who want to see BOTH
          const affectedUserIds = interested1
            .filter(u1 => interested2.some(u2 => u2.userId === u1.userId))
            .map(u => u.userId);

          if (affectedUserIds.length > 0) {
            // Determine severity
            const hasMustSee1 = interested1.some(u => 
              affectedUserIds.includes(u.userId) && u.level === "must-see"
            );
            const hasMustSee2 = interested2.some(u => 
              affectedUserIds.includes(u.userId) && u.level === "must-see"
            );

            let severity: "high" | "medium" | "low";
            if (hasMustSee1 && hasMustSee2) {
              severity = "high";
            } else if (hasMustSee1 || hasMustSee2) {
              severity = "medium";
            } else {
              severity = "low";
            }

            const affectedMembers = members
              ?.filter(m => affectedUserIds.includes(m.user_id))
              .map(m => ({
                id: m.user_id,
                displayName: (m.users as any).display_name,
                avatarUrl: (m.users as any).avatar_url,
              })) || [];

            conflicts.push({
              artist1: {
                id: a1.id,
                name: a1.artist_name,
                stage: a1.stage || "TBA",
                startTime: a1.start_time!,
                endTime: a1.end_time!,
              },
              artist2: {
                id: a2.id,
                name: a2.artist_name,
                stage: a2.stage || "TBA",
                startTime: a2.start_time!,
                endTime: a2.end_time!,
              },
              day: a1.day || "Unknown",
              affectedMembers,
              severity,
            });
          }
        }
      }
    }

    // Sort by severity (high first) then by day/time
    conflicts.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return timeToMinutes(a.artist1.startTime) - timeToMinutes(b.artist1.startTime);
    });

    return NextResponse.json({
      conflicts,
      scheduleReleased: true,
      totalConflicts: conflicts.length,
      highSeverity: conflicts.filter(c => c.severity === "high").length,
    });
  } catch (error) {
    console.error("Error fetching conflicts:", error);
    return NextResponse.json({ error: "Failed to fetch conflicts" }, { status: 500 });
  }
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
