import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * PATCH /api/friends/[friendshipId]
 * Accept or reject a friend request
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendshipId } = await params;
    const { action } = await request.json();

    if (!["accept", "reject", "block"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Get the friendship
    const { data: friendship, error: findError } = await adminClient
      .from("friendships")
      .select("*")
      .eq("id", friendshipId)
      .single();

    if (findError || !friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    // Only addressee can accept/reject/block
    if (friendship.addressee_id !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    if (action === "reject") {
      // Delete the request
      await adminClient.from("friendships").delete().eq("id", friendshipId);
      return NextResponse.json({ success: true, action: "rejected" });
    }

    // Update status
    const newStatus = action === "accept" ? "accepted" : "blocked";
    const { error: updateError } = await adminClient
      .from("friendships")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", friendshipId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action, status: newStatus });
  } catch (error) {
    console.error("Error in friendship PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/friends/[friendshipId]
 * Remove a friend or cancel a sent request
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendshipId } = await params;
    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Verify user is part of this friendship
    const { data: friendship, error: findError } = await adminClient
      .from("friendships")
      .select("*")
      .eq("id", friendshipId)
      .single();

    if (findError || !friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    if (friendship.requester_id !== userId && friendship.addressee_id !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Delete the friendship
    const { error: deleteError } = await adminClient
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (deleteError) {
      return NextResponse.json({ error: "Failed to remove" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in friendship DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
