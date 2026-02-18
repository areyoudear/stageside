import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/friends/search?q=query
 * Search for users to add as friends
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const adminClient = createAdminClient();
    let userId = session.user.id;

    // Verify user exists, fallback to email
    const { data: userCheck } = await adminClient
      .from("users")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!userCheck && session.user.email) {
      const { data: userByEmail } = await adminClient
        .from("users")
        .select("id")
        .eq("email", session.user.email)
        .maybeSingle();
      
      if (userByEmail) {
        userId = userByEmail.id;
      }
    }
    const searchTerm = query.trim();

    // Search users by username, display_name, or email
    const { data: users, error } = await adminClient
      .from("users")
      .select("id, display_name, username, email")
      .neq("id", userId)
      .or(`username.ilike.%${searchTerm}%,display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10);

    if (error) {
      console.error("Error searching users:", error);
      return NextResponse.json({ users: [] });
    }

    // Get existing friendships to show status
    const userIds = users?.map((u) => u.id) || [];
    let friendshipMap: Record<string, { status: string; isSender: boolean }> = {};

    if (userIds.length > 0) {
      const { data: friendships } = await adminClient
        .from("friendships")
        .select("id, status, requester_id, addressee_id")
        .or(
          userIds
            .map((id) => `and(requester_id.eq.${userId},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${userId})`)
            .join(",")
        );

      friendships?.forEach((f) => {
        const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id;
        friendshipMap[otherId] = {
          status: f.status,
          isSender: f.requester_id === userId,
        };
      });
    }

    const results = users?.map((u) => ({
      id: u.id,
      name: u.display_name || u.username || u.email?.split("@")[0] || "Unknown",
      username: u.username,
      email: u.email ? `${u.email.split("@")[0].slice(0, 2)}...@${u.email.split("@")[1]}` : null, // Partially hide email
      friendshipStatus: friendshipMap[u.id]?.status || null,
      isRequestSender: friendshipMap[u.id]?.isSender || false,
    })) || [];

    return NextResponse.json({ users: results });
  } catch (error) {
    console.error("Error in friends search:", error);
    return NextResponse.json({ users: [] });
  }
}
