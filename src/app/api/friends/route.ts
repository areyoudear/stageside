import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/friends
 * Get user's friends list and pending requests
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Get all friendships involving this user
    const { data: friendships, error: friendsError } = await adminClient
      .from("friendships")
      .select(`
        id,
        status,
        created_at,
        requester_id,
        addressee_id
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (friendsError) {
      console.error("Error fetching friendships:", friendsError);
      return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
    }

    // Get all user IDs we need to fetch
    const userIds = new Set<string>();
    friendships?.forEach((f) => {
      if (f.requester_id !== userId) userIds.add(f.requester_id);
      if (f.addressee_id !== userId) userIds.add(f.addressee_id);
    });

    // Fetch user details
    let usersMap: Record<string, { id: string; display_name: string | null; username: string | null; email: string | null }> = {};
    if (userIds.size > 0) {
      const { data: users } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .in("id", Array.from(userIds));
      
      users?.forEach((u) => {
        usersMap[u.id] = u;
      });
    }

    // Transform friendships
    const friends = friendships
      ?.filter((f) => f.status === "accepted")
      .map((f) => {
        const friendId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        const friend = usersMap[friendId];
        return {
          friendshipId: f.id,
          id: friendId,
          name: friend?.display_name || friend?.username || friend?.email?.split("@")[0] || "Unknown",
          username: friend?.username,
          since: f.created_at,
        };
      }) || [];

    // Pending requests (where user is addressee)
    const pendingRequests = friendships
      ?.filter((f) => f.status === "pending" && f.addressee_id === userId)
      .map((f) => {
        const friend = usersMap[f.requester_id];
        return {
          friendshipId: f.id,
          id: f.requester_id,
          name: friend?.display_name || friend?.username || friend?.email?.split("@")[0] || "Unknown",
          username: friend?.username,
          requestedAt: f.created_at,
        };
      }) || [];

    // Sent requests (where user is requester)
    const sentRequests = friendships
      ?.filter((f) => f.status === "pending" && f.requester_id === userId)
      .map((f) => {
        const friend = usersMap[f.addressee_id];
        return {
          friendshipId: f.id,
          id: f.addressee_id,
          name: friend?.display_name || friend?.username || friend?.email?.split("@")[0] || "Unknown",
          username: friend?.username,
          sentAt: f.created_at,
        };
      }) || [];

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
 * Send a friend request (by username, email, or name search)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username, email, query } = await request.json();
    
    const adminClient = createAdminClient();
    const userId = session.user.id;

    let targetUser = null;

    // If query provided, search by multiple fields
    if (query) {
      const searchTerm = query.trim().toLowerCase();
      
      // Try exact username match first
      const { data: exactUsername } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .ilike("username", searchTerm)
        .neq("id", userId)
        .single();
      
      if (exactUsername) {
        targetUser = exactUsername;
      } else {
        // Try exact email match
        const { data: exactEmail } = await adminClient
          .from("users")
          .select("id, display_name, username, email")
          .ilike("email", searchTerm)
          .neq("id", userId)
          .single();
        
        if (exactEmail) {
          targetUser = exactEmail;
        } else {
          // Search by display name (partial match)
          const { data: nameMatches } = await adminClient
            .from("users")
            .select("id, display_name, username, email")
            .ilike("display_name", `%${searchTerm}%`)
            .neq("id", userId)
            .limit(1);
          
          if (nameMatches && nameMatches.length > 0) {
            targetUser = nameMatches[0];
          }
        }
      }
    } else if (username) {
      const { data } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .eq("username", username)
        .single();
      targetUser = data;
    } else if (email) {
      const { data } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .ilike("email", email)
        .single();
      targetUser = data;
    } else {
      return NextResponse.json({ error: "Please enter a username, email, or name to search" }, { status: 400 });
    }

    if (!targetUser) {
      return NextResponse.json({ 
        error: "No user found with that username, email, or name. They may need to create an account first." 
      }, { status: 404 });
    }

    if (targetUser.id === userId) {
      return NextResponse.json({ error: "You can't add yourself as a friend" }, { status: 400 });
    }

    // Check if friendship already exists (in either direction)
    const { data: existing } = await adminClient
      .from("friendships")
      .select("id, status, requester_id")
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${targetUser.id}),and(requester_id.eq.${targetUser.id},addressee_id.eq.${userId})`)
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "You're already friends!" }, { status: 400 });
      }
      if (existing.status === "pending") {
        if (existing.requester_id === targetUser.id) {
          // They sent us a request - auto-accept it
          const { error: acceptError } = await adminClient
            .from("friendships")
            .update({ status: "accepted", updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          
          if (acceptError) {
            return NextResponse.json({ error: "Failed to accept request" }, { status: 500 });
          }
          
          return NextResponse.json({
            success: true,
            message: "Friend request accepted!",
            friendship: {
              id: existing.id,
              targetUser: {
                id: targetUser.id,
                name: targetUser.display_name || targetUser.username || targetUser.email?.split("@")[0],
                username: targetUser.username,
              },
            },
          });
        }
        return NextResponse.json({ error: "Friend request already sent" }, { status: 400 });
      }
      if (existing.status === "blocked") {
        return NextResponse.json({ error: "Unable to send friend request" }, { status: 400 });
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
      return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Friend request sent to ${targetUser.display_name || targetUser.username || targetUser.email?.split("@")[0]}!`,
      friendship: {
        id: friendship.id,
        targetUser: {
          id: targetUser.id,
          name: targetUser.display_name || targetUser.username || targetUser.email?.split("@")[0],
          username: targetUser.username,
        },
      },
    });
  } catch (error) {
    console.error("Error in friends POST:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

/**
 * GET /api/friends/search?q=query
 * Search for users to add as friends
 */
export async function searchUsers(query: string, currentUserId: string) {
  const adminClient = createAdminClient();
  const searchTerm = query.trim().toLowerCase();
  
  const { data: users } = await adminClient
    .from("users")
    .select("id, display_name, username, email")
    .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
    .neq("id", currentUserId)
    .limit(10);
  
  return users || [];
}
