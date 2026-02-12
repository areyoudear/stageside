import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createConcertGroup, getUserGroups, joinGroup } from "@/lib/concert-buddy";

/**
 * GET /api/groups
 * Get all groups for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const groups = await getUserGroups(session.user.id);

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json({ error: "Failed to fetch groups" }, { status: 500 });
  }
}

/**
 * POST /api/groups
 * Create a new group or join an existing one
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();

    // Join existing group via invite code
    if (body.inviteCode) {
      const result = await joinGroup(session.user.id, body.inviteCode);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        group: result.group,
        message: "Joined group successfully",
      });
    }

    // Create new group
    if (body.name) {
      const group = await createConcertGroup(
        session.user.id,
        body.name,
        body.description
      );

      if (!group) {
        return NextResponse.json({ error: "Failed to create group" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        group,
        message: "Group created successfully",
      });
    }

    return NextResponse.json(
      { error: "Name or invite code required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating/joining group:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
