import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/festivals/[id]/schedule/meetups/ack
 * 
 * Acknowledge a meetup.
 * 
 * Body:
 * - meetupId: UUID of the meetup (required)
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

    const body = await request.json();
    const { meetupId } = body;

    if (!meetupId) {
      return NextResponse.json(
        { error: "meetupId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get meetup to verify crew membership
    const { data: meetup } = await supabase
      .from("festival_crew_meetups")
      .select("crew_id")
      .eq("id", meetupId)
      .single();

    if (!meetup) {
      return NextResponse.json({ error: "Meetup not found" }, { status: 404 });
    }

    // Verify user is in crew
    const { data: membership } = await supabase
      .from("festival_crew_members")
      .select("id")
      .eq("crew_id", meetup.crew_id)
      .eq("user_id", session.user.id)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this crew" },
        { status: 403 }
      );
    }

    // Upsert acknowledgement
    const { error } = await supabase.from("festival_crew_meetup_acks").upsert(
      {
        meetup_id: meetupId,
        user_id: session.user.id,
      },
      { onConflict: "meetup_id,user_id" }
    );

    if (error) {
      console.error("Error acknowledging meetup:", error);
      return NextResponse.json(
        { error: "Failed to acknowledge meetup" },
        { status: 500 }
      );
    }

    // Get updated ack count
    const { count } = await supabase
      .from("festival_crew_meetup_acks")
      .select("*", { count: "exact", head: true })
      .eq("meetup_id", meetupId);

    return NextResponse.json({
      success: true,
      ackCount: count || 0,
    });
  } catch (error) {
    console.error("Error acknowledging meetup:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/festivals/[id]/schedule/meetups/ack
 * 
 * Remove acknowledgement.
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

    const { error } = await supabase
      .from("festival_crew_meetup_acks")
      .delete()
      .eq("meetup_id", meetupId)
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error removing ack:", error);
      return NextResponse.json(
        { error: "Failed to remove acknowledgement" },
        { status: 500 }
      );
    }

    // Get updated ack count
    const { count } = await supabase
      .from("festival_crew_meetup_acks")
      .select("*", { count: "exact", head: true })
      .eq("meetup_id", meetupId);

    return NextResponse.json({
      success: true,
      ackCount: count || 0,
    });
  } catch (error) {
    console.error("Error removing ack:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
