import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/festivals/[id]/crew
 * Get user's crew for a festival (if any) with member interests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const festivalId = params.id;
    const supabase = createAdminClient();

  // Find user's crew for this festival
  const { data: membership } = await supabase
    .from("festival_crew_members")
    .select(`
      crew_id,
      role,
      festival_crews!inner (
        id,
        name,
        invite_code,
        festival_id,
        created_by
      )
    `)
    .eq("user_id", session.user.id)
    .eq("festival_crews.festival_id", festivalId)
    .single();

  if (!membership) {
    return NextResponse.json({ crew: null });
  }

  const crew = membership.festival_crews as any;

  // Get all crew members with their details
  const { data: members } = await supabase
    .from("festival_crew_members")
    .select(`
      user_id,
      role,
      joined_at,
      users!inner (
        id,
        display_name,
        username,
        avatar_url
      )
    `)
    .eq("crew_id", crew.id);

  // Get all artist interests for crew members
  const memberIds = members?.map(m => m.user_id) || [];
  
  const { data: interests } = await supabase
    .from("festival_artist_interests")
    .select("*")
    .eq("festival_id", festivalId)
    .in("user_id", memberIds);

  // Group interests by artist
  const artistInterestMap = new Map<string, any[]>();
  interests?.forEach(interest => {
    const existing = artistInterestMap.get(interest.artist_id) || [];
    const member = members?.find(m => m.user_id === interest.user_id);
    if (member) {
      existing.push({
        userId: interest.user_id,
        displayName: (member.users as any).display_name,
        username: (member.users as any).username,
        avatarUrl: (member.users as any).avatar_url,
        interestLevel: interest.interest_level,
      });
    }
    artistInterestMap.set(interest.artist_id, existing);
  });

  // Calculate stats
  const totalMembers = members?.length || 0;
  const artistsWithAllInterested = Array.from(artistInterestMap.entries())
    .filter(([_, interested]) => interested.length === totalMembers).length;
  
  const currentUserInterests = interests?.filter(i => i.user_id === session.user.id) || [];
  const otherMemberInterests = interests?.filter(i => i.user_id !== session.user.id) || [];
  const uniqueOtherArtists = new Set(otherMemberInterests.map(i => i.artist_id));
  const currentUserArtists = new Set(currentUserInterests.map(i => i.artist_id));
  const discoverFromCrew = Array.from(uniqueOtherArtists).filter(a => !currentUserArtists.has(a)).length;
  const youOnlyWant = Array.from(currentUserArtists).filter(a => {
    const interested = artistInterestMap.get(a);
    return interested?.length === 1 && interested[0].userId === session.user.id;
  }).length;

  return NextResponse.json({
    crew: {
      id: crew.id,
      name: crew.name,
      inviteCode: crew.invite_code,
      festivalId: crew.festival_id,
      isAdmin: membership.role === "admin",
    },
    members: members?.map(m => ({
      id: m.user_id,
      displayName: (m.users as any).display_name,
      username: (m.users as any).username,
      avatarUrl: (m.users as any).avatar_url,
      role: m.role,
      joinedAt: m.joined_at,
    })),
    artistInterests: Object.fromEntries(artistInterestMap),
    stats: {
      allWant: artistsWithAllInterested,
      someWant: artistInterestMap.size - artistsWithAllInterested,
      youOnlyWant,
      discoverFromCrew,
    },
  });
  } catch (error) {
    console.error("Error in GET /api/festivals/[id]/crew:", error);
    return NextResponse.json({ error: "Failed to fetch crew" }, { status: 500 });
  }
}

/**
 * POST /api/festivals/[id]/crew
 * Create a new crew for a festival
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const festivalId = params.id;
    const body = await request.json();
    const { name } = body;

    const supabase = createAdminClient();

  // Check if user already has a crew for this festival
  const { data: existingMembership } = await supabase
    .from("festival_crew_members")
    .select(`
      crew_id,
      festival_crews!inner (festival_id)
    `)
    .eq("user_id", session.user.id)
    .eq("festival_crews.festival_id", festivalId)
    .single();

  if (existingMembership) {
    return NextResponse.json(
      { error: "You already have a crew for this festival" },
      { status: 400 }
    );
  }

  // Create crew
  const { data: crew, error: crewError } = await supabase
    .from("festival_crews")
    .insert({
      festival_id: festivalId,
      name: name || null,
      created_by: session.user.id,
    })
    .select()
    .single();

  if (crewError) {
    console.error("Error creating crew:", crewError);
    return NextResponse.json({ error: "Failed to create crew" }, { status: 500 });
  }

  // Add creator as admin
  const { error: memberError } = await supabase
    .from("festival_crew_members")
    .insert({
      crew_id: crew.id,
      user_id: session.user.id,
      role: "admin",
    });

  if (memberError) {
    console.error("Error adding member:", memberError);
    // Cleanup
    await supabase.from("festival_crews").delete().eq("id", crew.id);
    return NextResponse.json({ error: "Failed to create crew" }, { status: 500 });
  }

  return NextResponse.json({
    crew: {
      id: crew.id,
      name: crew.name,
      inviteCode: crew.invite_code,
      festivalId: crew.festival_id,
      isAdmin: true,
    },
  });
  } catch (error) {
    console.error("Error in POST /api/festivals/[id]/crew:", error);
    return NextResponse.json({ error: "Failed to create crew" }, { status: 500 });
  }
}
