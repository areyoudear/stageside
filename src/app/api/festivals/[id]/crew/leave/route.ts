import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * POST /api/festivals/[id]/crew/leave
 * Leave the current crew
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const festivalId = params.id;
    const supabase = createAdminClient();

  // Find user's membership
  const { data: membership } = await supabase
    .from("festival_crew_members")
    .select(`
      id,
      crew_id,
      role,
      festival_crews!inner (
        id,
        festival_id,
        created_by
      )
    `)
    .eq("user_id", session.user.id)
    .eq("festival_crews.festival_id", festivalId)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not in a crew" }, { status: 404 });
  }

  const crew = membership.festival_crews as any;

  // If admin and only member, delete the crew
  if (membership.role === "admin") {
    const { count } = await supabase
      .from("festival_crew_members")
      .select("*", { count: "exact", head: true })
      .eq("crew_id", crew.id);

    if (count === 1) {
      // Delete crew entirely
      await supabase.from("festival_crews").delete().eq("id", crew.id);
      return NextResponse.json({ success: true, crewDeleted: true });
    }

    // Transfer admin to another member
    const { data: nextAdmin } = await supabase
      .from("festival_crew_members")
      .select("id, user_id")
      .eq("crew_id", crew.id)
      .neq("user_id", session.user.id)
      .order("joined_at", { ascending: true })
      .limit(1)
      .single();

    if (nextAdmin) {
      await supabase
        .from("festival_crew_members")
        .update({ role: "admin" })
        .eq("id", nextAdmin.id);
    }
  }

  // Remove membership
  const { error } = await supabase
    .from("festival_crew_members")
    .delete()
    .eq("id", membership.id);

  if (error) {
    console.error("Error leaving crew:", error);
    return NextResponse.json({ error: "Failed to leave crew" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/festivals/[id]/crew/leave:", error);
    return NextResponse.json({ error: "Failed to leave crew" }, { status: 500 });
  }
}
