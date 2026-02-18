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
      .select("id, status, created_at, requester_id, addressee_id")
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
      console.error("No session or user ID found");
      return NextResponse.json({ error: "Please sign in to add friends" }, { status: 401 });
    }

    const body = await request.json();
    const { username, email, query } = body;
    
    const adminClient = createAdminClient();
    const userId = session.user.id;

    console.log("Friend request from user:", userId);
    console.log("Search params:", { username, email, query });

    let targetUser = null;

    // If query provided, search by multiple fields
    if (query) {
      const searchTerm = query.trim();
      console.log("Searching for:", searchTerm);
      
      // Try exact username match first (case insensitive)
      const { data: byUsername } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .ilike("username", searchTerm)
        .neq("id", userId)
        .maybeSingle();
      
      if (byUsername) {
        console.log("Found by username:", byUsername.display_name);
        targetUser = byUsername;
      } else {
        // Try exact email match
        const { data: byEmail } = await adminClient
          .from("users")
          .select("id, display_name, username, email")
          .ilike("email", searchTerm)
          .neq("id", userId)
          .maybeSingle();
        
        if (byEmail) {
          console.log("Found by email:", byEmail.display_name);
          targetUser = byEmail;
        } else {
          // Search by display name (partial match)
          const { data: nameMatches } = await adminClient
            .from("users")
            .select("id, display_name, username, email")
            .ilike("display_name", `%${searchTerm}%`)
            .neq("id", userId)
            .limit(1);
          
          if (nameMatches && nameMatches.length > 0) {
            console.log("Found by name:", nameMatches[0].display_name);
            targetUser = nameMatches[0];
          }
        }
      }
    } else if (username) {
      const { data } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .ilike("username", username)
        .neq("id", userId)
        .maybeSingle();
      targetUser = data;
    } else if (email) {
      const { data } = await adminClient
        .from("users")
        .select("id, display_name, username, email")
        .ilike("email", email)
        .neq("id", userId)
        .maybeSingle();
      targetUser = data;
    } else {
      return NextResponse.json({ error: "Please enter a username, email, or name to search" }, { status: 400 });
    }

    if (!targetUser) {
      console.log("No user found for search");
      return NextResponse.json({ 
        error: "No user found. They may need to create an account first." 
      }, { status: 404 });
    }

    console.log("Target user found:", targetUser.id, targetUser.display_name);

    // Check if friendship already exists (in either direction)
    // Query for requester -> addressee
    const { data: sentToTarget } = await adminClient
      .from("friendships")
      .select("id, status")
      .eq("requester_id", userId)
      .eq("addressee_id", targetUser.id)
      .maybeSingle();

    // Query for addressee <- requester (they sent to us)
    const { data: receivedFromTarget } = await adminClient
      .from("friendships")
      .select("id, status")
      .eq("requester_id", targetUser.id)
      .eq("addressee_id", userId)
      .maybeSingle();

    const existing = sentToTarget || receivedFromTarget;

    if (existing) {
      console.log("Existing friendship found:", existing);
      
      if (existing.status === "accepted") {
        return NextResponse.json({ error: "You're already friends!" }, { status: 400 });
      }
      
      if (existing.status === "pending") {
        // If they sent us a request, auto-accept it
        if (receivedFromTarget) {
          console.log("They sent us a request - auto-accepting");
          const { error: acceptError } = await adminClient
            .from("friendships")
            .update({ status: "accepted", updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          
          if (acceptError) {
            console.error("Error accepting request:", acceptError);
            return NextResponse.json({ error: "Failed to accept request" }, { status: 500 });
          }
          
          return NextResponse.json({
            success: true,
            message: `You and ${targetUser.display_name || targetUser.username} are now friends!`,
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
        
        // We already sent them a request
        return NextResponse.json({ error: "Friend request already sent" }, { status: 400 });
      }
      
      if (existing.status === "blocked") {
        return NextResponse.json({ error: "Unable to send friend request" }, { status: 400 });
      }
    }

    // Create friend request
    console.log("Creating new friend request...");
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
      return NextResponse.json({ 
        error: `Failed to send friend request: ${createError.message}` 
      }, { status: 500 });
    }

    console.log("Friendship created:", friendship);

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
    return NextResponse.json({ 
      error: `Something went wrong: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}
