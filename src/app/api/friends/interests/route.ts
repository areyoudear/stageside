import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/friends/interests
 * Get all concert interests from user's friends
 * Returns a map of concertId -> array of friends interested/going
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const userId = session.user.id;

    // Get user's accepted friends
    const { data: friendships, error: friendsError } = await adminClient
      .from("friendships")
      .select("requester_id, addressee_id")
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);

    if (friendsError) {
      console.error("Error fetching friendships:", friendsError);
      return NextResponse.json({ error: "Failed to fetch friends" }, { status: 500 });
    }

    const friendIds = friendships?.map((f) =>
      f.requester_id === userId ? f.addressee_id : f.requester_id
    ) || [];

    if (friendIds.length === 0) {
      return NextResponse.json({
        interests: {},
        friendCount: 0,
        concertIds: { interested: [], going: [] },
      });
    }

    // Get all friends' concert interests
    const { data: interests, error: interestsError } = await adminClient
      .from("concert_interests")
      .select(`
        concert_id,
        status,
        concert_data,
        user:users!concert_interests_user_id_fkey(id, display_name, username, image_url)
      `)
      .in("user_id", friendIds);

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
    }

    // Group by concert_id
    const interestsByConvert: Record<string, {
      interested: Array<{ id: string; name: string; username: string; imageUrl: string | null }>;
      going: Array<{ id: string; name: string; username: string; imageUrl: string | null }>;
    }> = {};

    const concertIdsInterested = new Set<string>();
    const concertIdsGoing = new Set<string>();

    for (const interest of interests || []) {
      const concertId = interest.concert_id;
      if (!interestsByConvert[concertId]) {
        interestsByConvert[concertId] = { interested: [], going: [] };
      }

      const friendInfo = {
        id: interest.user.id,
        name: interest.user.display_name || interest.user.username || "Unknown",
        username: interest.user.username || "",
        imageUrl: interest.user.image_url,
      };

      if (interest.status === "interested") {
        interestsByConvert[concertId].interested.push(friendInfo);
        concertIdsInterested.add(concertId);
      } else if (interest.status === "going") {
        interestsByConvert[concertId].going.push(friendInfo);
        concertIdsGoing.add(concertId);
      }
    }

    return NextResponse.json({
      interests: interestsByConvert,
      friendCount: friendIds.length,
      concertIds: {
        interested: Array.from(concertIdsInterested),
        going: Array.from(concertIdsGoing),
      },
    });
  } catch (error) {
    console.error("Error in friends interests GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
