import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGroupById, leaveGroup } from "@/lib/concert-buddy";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/groups/[groupId]
 * Get a specific group's details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { groupId } = await params;
    const group = await getGroupById(groupId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Check if user is a member
    const isMember = group.members.some((m) => m.userId === session.user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("Error fetching group:", error);
    return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
  }
}

/**
 * PATCH /api/groups/[groupId]
 * Update group settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { groupId } = await params;
    const body = await request.json();

    // Verify user is owner/admin
    const group = await getGroupById(groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const member = group.members.find((m) => m.userId === session.user.id);
    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      return NextResponse.json({ error: "Not authorized to update group" }, { status: 403 });
    }

    // Update allowed fields
    const adminClient = createAdminClient();
    const updates: Record<string, unknown> = {};

    if (body.name) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.location) updates.location = body.location;
    if (body.dateRange) updates.date_range = body.dateRange;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString();

      const { error } = await adminClient
        .from("concert_groups")
        .update(updates)
        .eq("id", groupId);

      if (error) {
        console.error("Error updating group:", error);
        return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
      }
    }

    const updatedGroup = await getGroupById(groupId);
    return NextResponse.json({ group: updatedGroup });
  } catch (error) {
    console.error("Error updating group:", error);
    return NextResponse.json({ error: "Failed to update group" }, { status: 500 });
  }
}

/**
 * DELETE /api/groups/[groupId]
 * Leave or delete a group
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { groupId } = await params;
    const group = await getGroupById(groupId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const member = group.members.find((m) => m.userId === session.user.id);
    if (!member) {
      return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
    }

    // If owner and only member, delete group
    if (member.role === "owner" && group.members.length === 1) {
      const adminClient = createAdminClient();
      await adminClient.from("concert_groups").delete().eq("id", groupId);
      return NextResponse.json({ success: true, message: "Group deleted" });
    }

    // Otherwise just leave
    const success = await leaveGroup(session.user.id, groupId);
    if (!success) {
      return NextResponse.json({ error: "Failed to leave group" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Left group" });
  } catch (error) {
    console.error("Error leaving/deleting group:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
