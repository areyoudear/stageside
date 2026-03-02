import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/users/[userId]/profile
 * Get a user's profile including their concerts and music compatibility
 * Only accessible if you are friends with this user
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId: friendId } = await params;
    const currentUserId = session.user.id;
    const adminClient = createAdminClient();

    // Verify they are friends
    const { data: friendship, error: friendshipError } = await adminClient
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${currentUserId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${currentUserId})`)
      .single();

    if (friendshipError || !friendship) {
      return NextResponse.json({ error: "Not friends with this user" }, { status: 403 });
    }

    // Get friend's profile
    const { data: friendProfile, error: profileError } = await adminClient
      .from("users")
      .select("id, display_name, username, avatar_url, created_at")
      .eq("id", friendId)
      .single();

    if (profileError || !friendProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get friend's concert interests
    const { data: interests, error: interestsError } = await adminClient
      .from("concert_interests")
      .select("*")
      .eq("user_id", friendId)
      .order("created_at", { ascending: false });

    if (interestsError) {
      console.error("Error fetching interests:", interestsError);
    }

    const now = new Date();
    const concerts = interests || [];
    
    // Separate past vs upcoming based on concert date
    const upcomingConcerts = concerts.filter(c => {
      const concertDate = c.concert_data?.date ? new Date(c.concert_data.date) : null;
      return concertDate && concertDate >= now;
    });
    
    const pastConcerts = concerts.filter(c => {
      const concertDate = c.concert_data?.date ? new Date(c.concert_data.date) : null;
      return concertDate && concertDate < now;
    });

    const interestedConcerts = upcomingConcerts.filter(c => c.status === "interested");
    const goingConcerts = upcomingConcerts.filter(c => c.status === "going");

    // Get friend's top artists from music_profiles
    const { data: friendProfile2 } = await adminClient
      .from("music_profiles")
      .select("top_artists")
      .eq("user_id", friendId)
      .single();

    // Get current user's top artists from music_profiles
    const { data: userProfile } = await adminClient
      .from("music_profiles")
      .select("top_artists")
      .eq("user_id", currentUserId)
      .single();

    // Extract artist names
    const friendArtistNames = (friendProfile2?.top_artists || []).map((a: { name: string }) => a.name.toLowerCase());
    const userArtistNames = (userProfile?.top_artists || []).map((a: { name: string }) => a.name.toLowerCase());

    // Find common artists (case-insensitive match)
    const commonArtistNames: string[] = [];
    const friendOriginalNames = (friendProfile2?.top_artists || []).map((a: { name: string }) => a.name);
    
    for (const friendArtist of friendOriginalNames) {
      const normalizedFriend = friendArtist.toLowerCase();
      if (userArtistNames.includes(normalizedFriend)) {
        commonArtistNames.push(friendArtist);
      }
    }

    // Calculate total unique artists
    const allArtistsSet = new Set([...friendArtistNames, ...userArtistNames]);
    const totalUniqueArtists = allArtistsSet.size;
    
    const compatibilityScore = totalUniqueArtists > 0 
      ? Math.round((commonArtistNames.length / totalUniqueArtists) * 100)
      : 0;

    // Get current user's concert interests to find overlap
    const { data: userInterests } = await adminClient
      .from("concert_interests")
      .select("concert_id, status")
      .eq("user_id", currentUserId);

    const userConcertMap = new Map((userInterests || []).map(i => [i.concert_id, i.status]));
    
    // Find concerts both are interested in
    const sharedInterests = upcomingConcerts.filter(c => userConcertMap.has(c.concert_id));

    return NextResponse.json({
      profile: {
        id: friendProfile.id,
        name: friendProfile.display_name || friendProfile.username || "Unknown",
        username: friendProfile.username,
        avatarUrl: friendProfile.avatar_url,
        memberSince: friendProfile.created_at,
        friendsSince: friendship.created_at,
      },
      concerts: {
        interested: interestedConcerts.map(c => ({
          id: c.concert_id,
          ...c.concert_data,
          markedAt: c.created_at,
        })),
        going: goingConcerts.map(c => ({
          id: c.concert_id,
          ...c.concert_data,
          markedAt: c.created_at,
        })),
        past: pastConcerts.slice(0, 20).map(c => ({
          id: c.concert_id,
          ...c.concert_data,
          status: c.status,
          markedAt: c.created_at,
        })),
      },
      sharedInterests: sharedInterests.map(c => ({
        id: c.concert_id,
        ...c.concert_data,
        friendStatus: c.status,
        yourStatus: userConcertMap.get(c.concert_id),
      })),
      compatibility: {
        score: compatibilityScore,
        commonArtists: commonArtistNames.slice(0, 10),
        totalCommonArtists: commonArtistNames.length,
      },
    });
  } catch (error) {
    console.error("Error in user profile GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
