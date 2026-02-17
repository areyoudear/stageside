import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/friends
 * Get user's friends list and pending requests
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Get accepted friends
    const { data: friendships, error: friendsError } = await adminClient
      .from("friendships")
      .select(`
        id,
        status,
        created_at,
        requester_id,
        addressee_id,
        requester:users!friendships_requester_id_fkey(id, display_name, username, email),
        addressee:users!friendships_addressee_id_fkey(id, display_name, username, email)
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (friendsError) {
      console.error("Error fetching friends:", friendsError);
      return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
    }

    // Transform to cleaner format
    const friends = friendships
      ?.filter((f) => f.status === "accepted")
      .map((f) => {
        const friend = f.requester_id === userId ? f.addressee : f.requester;
        return {
          friendshipId: f.id,
          id: friend.id,
          name: friend.display_name || friend.username || friend.email?.split("@")[0],
          username: friend.username,
          since: f.created_at,
        };
      }) || [];

    // Pending requests (where user is addressee)
    const pendingRequests = friendships
      ?.filter((f) => f.status === "pending" && f.addressee_id === userId)
      .map((f) => ({
        friendshipId: f.id,
        id: f.requester.id,
        name: f.requester.display_name || f.requester.username || f.requester.email?.split("@")[0],
        username: f.requester.username,
        requestedAt: f.created_at,
      })) || [];

    // Sent requests (where user is requester)
    const sentRequests = friendships
      ?.filter((f) => f.status === "pending" && f.requester_id === userId)
      .map((f) => ({
        friendshipId: f.id,
        id: f.addressee.id,
        name: f.addressee.display_name || f.addressee.username || f.addressee.email?.split("@")[0],
        username: f.addressee.username,
        sentAt: f.created_at,
      })) || [];

    return NextResponse.json({
      friends,
      pendingRequests,
      sentRequests,
    });
  } catch (error) {
    console.error("Error in friends API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/friends
 * Send a friend request (by username or email)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, email } = await request.json();
    if (!username && !email) {
      return NextResponse.json({ error: "Username or email required" }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Find user by username or email
    let query = adminClient.from("users").select("id, display_name, username");
    if (username) {
      query = query.eq("username", username);
    } else if (email) {
      query = query.eq("email", email);
    }

    const { data: targetUser, error: findError } = await query.single();

    if (findError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.id === userId) {
      return NextResponse.json({ error: "Cannot add yourself as a friend" }, { status: 400 });
    }

    // Check if friendship already exists
    const { data: existing } = await adminClient
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${userId})`
      )
      .single();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      }
      if (existing.status === "pending") {
        return NextResponse.json({ error: "Friend request already pending" }, { status: 400 });
      }
    }

    // Create friend request
    const { data: friendship, error: createError } = await adminClient
      .from("friendships")
      .insert({
        requester_id: userId,
        addressee_id: targetUser.id,
        status: "pending",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating friendship:", createError);
      return NextResponse.json({ error: "Failed to send request" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      friendship: {
        id: friendship.id,
        targetUser: {
          id: targetUser.id,
          name: targetUser.display_name || targetUser.username,
          username: targetUser.username,
        },
      },
    });
  } catch (error) {
    console.error("Error in friends POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
