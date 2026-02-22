import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { calculateBatchTasteCompatibility } from "@/lib/taste-compatibility";

/**
 * Enhanced friend interest data with taste compatibility
 */
interface EnhancedFriendInfo {
  id: string;
  name: string;
  username: string;
  imageUrl: string | null;
  tasteCompatibility: number;
  tasteLabel: string;
  sharedArtists: string[];
  status: "interested" | "going";
}

interface ConcertFriendsData {
  interested: EnhancedFriendInfo[];
  going: EnhancedFriendInfo[];
}

/**
 * GET /api/friends/interests
 * Get all concert interests from user's friends with taste compatibility scores
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
      .select("concert_id, status, concert_data, user_id")
      .in("user_id", friendIds);

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
    }

    // Get friend user details
    const { data: friendUsers, error: usersError } = await adminClient
      .from("users")
      .select("id, display_name, username, image_url")
      .in("id", friendIds);

    if (usersError) {
      console.error("Error fetching friend users:", usersError);
    }

    const friendUserMap = new Map(
      (friendUsers || []).map((u) => [u.id, u])
    );

    // Calculate taste compatibility for all friends in batch
    const tasteCompatibilityMap = await calculateBatchTasteCompatibility(userId, friendIds);

    // Group by concert_id with enhanced friend data
    const interestsByConvert: Record<string, ConcertFriendsData> = {};

    const concertIdsInterested = new Set<string>();
    const concertIdsGoing = new Set<string>();

    for (const interest of interests || []) {
      const concertId = interest.concert_id;
      if (!interestsByConvert[concertId]) {
        interestsByConvert[concertId] = { interested: [], going: [] };
      }

      const user = friendUserMap.get(interest.user_id);
      const tasteCompat = tasteCompatibilityMap.get(interest.user_id);
      
      const enhancedFriendInfo: EnhancedFriendInfo = {
        id: interest.user_id,
        name: user?.display_name || user?.username || "Unknown",
        username: user?.username || "",
        imageUrl: user?.image_url || null,
        tasteCompatibility: tasteCompat?.score || 0,
        tasteLabel: tasteCompat?.label || "Unknown",
        sharedArtists: tasteCompat?.sharedArtists.slice(0, 5) || [],
        status: interest.status as "interested" | "going",
      };

      if (interest.status === "interested") {
        interestsByConvert[concertId].interested.push(enhancedFriendInfo);
        concertIdsInterested.add(concertId);
      } else if (interest.status === "going") {
        interestsByConvert[concertId].going.push(enhancedFriendInfo);
        concertIdsGoing.add(concertId);
      }
    }

    // Sort friends by taste compatibility within each concert
    Object.values(interestsByConvert).forEach(data => {
      data.interested.sort((a, b) => b.tasteCompatibility - a.tasteCompatibility);
      data.going.sort((a, b) => b.tasteCompatibility - a.tasteCompatibility);
    });

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
