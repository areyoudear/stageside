import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/festivals/[id]/schedule/meetups
 * 
 * Get all meetups for a crew.
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

    // Get meetups with ack status
    let query = supabase
      .from("festival_crew_meetups")
      .select(`
        *,
        created_by_user:users!created_by(id, display_name, username, avatar_url),
        acks:festival_crew_meetup_acks(user_id)
      `)
      .eq("crew_id", crewId)
      .order("day")
      .order("time");

    if (dayFilter) {
      query = query.eq("day", dayFilter);
    }

    const { data: meetups, error } = await query;

    if (error) {
      console.error("Error fetching meetups:", error);
      return NextResponse.json(
        { error: "Failed to fetch meetups" },
        { status: 500 }
      );
    }

    // Get crew size for ack percentage
    const { count: crewSize } = await supabase
      .from("festival_crew_members")
      .select("*", { count: "exact", head: true })
      .eq("crew_id", crewId);

    // Format response
    const formattedMeetups = (meetups || []).map((m) => {
      const creator = m.created_by_user as unknown as {
        id: string;
        display_name: string;
        username: string;
        avatar_url: string;
      };
      const acks = m.acks as unknown as { user_id: string }[];
      
      return {
        id: m.id,
        day: m.day,
        time: m.time,
        location: m.location,
        contextType: m.context_type,
        contextArtistIds: m.context_artist_ids,
        note: m.note,
        createdBy: {
          userId: creator.id,
          displayName: creator.display_name || creator.username,
          avatarUrl: creator.avatar_url,
        },
        createdAt: m.created_at,
        acknowledged: acks.some((a) => a.user_id === session.user.id),
        ackCount: acks.length,
        crewSize: crewSize || 0,
      };
    });

    return NextResponse.json({
      meetups: formattedMeetups,
      crewSize,
    });
  } catch (error) {
    console.error("Error in meetups API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/festivals/[id]/schedule/meetups
 * 
 * Create a new meetup point.
 * 
 * Body:
 * - crewId: UUID of the crew (required)
 * - day: Day of the meetup (required)
 * - time: Time in "HH:MM" format (required)
 * - location: Location/stage name (optional)
 * - contextType: "conflict" | "manual" | "break" (default: "manual")
 * - contextArtistIds: Related artist IDs if conflict (optional)
 * - note: Additional note (optional)
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: festivalId } = await context.params;
    const body = await request.json();

    const {
      crewId,
      day,
      time,
      location,
      contextType = "manual",
      contextArtistIds,
      note,
    } = body;

    if (!crewId || !day || !time) {
      return NextResponse.json(
        { error: "crewId, day, and time are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify user is in this crew
    const { data: membership } = await supabase
      .from("festival_crew_members")
      .select("id, role")
      .eq("crew_id", crewId)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this crew" },
        { status: 403 }
      );
    }

    // Verify crew is for this festival
    const { data: crew } = await supabase
      .from("festival_crews")
      .select("festival_id")
      .eq("id", crewId)
      .single();

    if (!crew || (crew.festival_id !== festivalId)) {
      return NextResponse.json(
        { error: "Crew is not for this festival" },
        { status: 400 }
      );
    }

    // Create meetup
    const { data: meetup, error } = await supabase
      .from("festival_crew_meetups")
      .insert({
        crew_id: crewId,
        festival_id: festivalId,
        day,
        time,
        location,
        context_type: contextType,
        context_artist_ids: contextArtistIds,
        note,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating meetup:", error);
      return NextResponse.json(
        { error: "Failed to create meetup" },
        { status: 500 }
      );
    }

    // Auto-acknowledge for creator
    await supabase.from("festival_crew_meetup_acks").insert({
      meetup_id: meetup.id,
      user_id: session.user.id,
    });

    return NextResponse.json({ meetup }, { status: 201 });
  } catch (error) {
    console.error("Error creating meetup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/festivals/[id]/schedule/meetups
 * 
 * Delete a meetup.
 * 
 * Query params:
 * - meetupId: UUID of the meetup (required)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const meetupId = request.nextUrl.searchParams.get("meetupId");

    if (!meetupId) {
      return NextResponse.json(
        { error: "meetupId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get meetup to check permissions
    const { data: meetup } = await supabase
      .from("festival_crew_meetups")
      .select("crew_id, created_by")
      .eq("id", meetupId)
      .single();

    if (!meetup) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }

    // Check if user can delete (creator or admin)
    const { data: membership } = await supabase
      .from("festival_crew_members")
      .select("role")
      .eq("crew_id", meetup.crew_id)
      .eq("user_id", session.user.id)
      .single();

    const canDelete =
      meetup.created_by === session.user.id ||
      membership?.role === "admin";

    if (!canDelete) {
      return NextResponse.json(
        { error: "You cannot delete this meetup" },
        { status: 403 }
      );
    }

    // Delete meetup (acks cascade)
    const { error } = await supabase
      .from("festival_crew_meetups")
      .delete()
      .eq("id", meetupId);

    if (error) {
      console.error("Error deleting meetup:", error);
      return NextResponse.json(
        { error: "Failed to delete meetup" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meetup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
