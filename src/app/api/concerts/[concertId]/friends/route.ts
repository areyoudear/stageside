import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/concerts/[concertId]/friends
 * Get friends who are interested in or going to this concert
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ concertId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { concertId } = await params;
    const adminClient = createAdminClient();
    const userId = session.user.id;

    // First get user's friends
    const { data: friendships, error: friendsError } = await adminClient
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendsError) {
      console.error("Error fetching friendships:", friendsError);
      return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
    }

    // Extract friend IDs
    const friendIds = friendships?.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    ) || [];

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    // Get friends' interests in this concert
    const { data: interests, error: interestsError } = await adminClient
      .from("concert_interests")
      .select(`
        status,
        user:users!concert_interests_user_id_fkey(id, display_name, username)
      `)
      .eq("concert_id", concertId)
      .in("user_id", friendIds);

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
    }

    const friends = interests?.map((i) => ({
      id: i.user.id,
      name: i.user.display_name || i.user.username,
      username: i.user.username,
      status: i.status, // 'interested' or 'going'
    })) || [];

    // Separate by status
    const going = friends.filter((f) => f.status === "going");
    const interested = friends.filter((f) => f.status === "interested");

    return NextResponse.json({
      friends,
      going,
      interested,
      summary: {
        totalFriends: friends.length,
        goingCount: going.length,
        interestedCount: interested.length,
      },
    });
  } catch (error) {
    console.error("Error in concert friends GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
