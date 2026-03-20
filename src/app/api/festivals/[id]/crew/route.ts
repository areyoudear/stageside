import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * Helper: resolve festival slug or UUID to UUID
 */
async function resolveFestivalId(supabase: any, idOrSlug: string): Promise<string | null> {
  // Check if it looks like a UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  
  if (isUuid) {
    return idOrSlug;
  }
  
  // Try to resolve by slug
  const { data } = await supabase
    .from("festivals")
    .select("id")
    .eq("slug", idOrSlug)
    .single();
    
  return data?.id || null;
}

/**
 * GET /api/festivals/[id]/crew
 * Get user's crews for a festival (supports multiple crews)
 * Query params:
 *   - crewId: specific crew to fetch (optional, defaults to first crew)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedCrewId = searchParams.get("crewId");
    const inviteCodeParam = searchParams.get("inviteCode");
    const supabase = createAdminClient();
    
    // Resolve slug to UUID
    const festivalId = await resolveFestivalId(supabase, params.id);
    if (!festivalId) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

  // If inviteCode is provided, validate it and return crew info (public, no auth required)
  if (inviteCodeParam) {
    const { data: crew, error } = await supabase
      .from("festival_crews")
      .select("id, name, festival_id")
      .eq("invite_code", inviteCodeParam.toLowerCase().trim())
      .eq("festival_id", festivalId)
      .single();

    if (error || !crew) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    // Get member count
    const { count } = await supabase
      .from("festival_crew_members")
      .select("*", { count: "exact", head: true })
      .eq("crew_id", crew.id);

    return NextResponse.json({
      crew: {
        id: crew.id,
        name: crew.name,
        festival_id: crew.festival_id,
        member_count: count || 1,
      }
    });
  }

  // Auth required for all other operations
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find ALL user's crews for this festival
  const { data: memberships } = await supabase
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
    .eq("festival_crews.festival_id", festivalId);

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({ crew: null, allCrews: [] });
  }

  // Build list of all crews
  const allCrews = memberships.map(m => ({
    id: (m.festival_crews as any).id,
    name: (m.festival_crews as any).name,
    isAdmin: m.role === "admin",
  }));

  // Find the specific crew to return details for
  const membership = requestedCrewId 
    ? memberships.find(m => (m.festival_crews as any).id === requestedCrewId)
    : memberships[0];

  if (!membership) {
    return NextResponse.json({ crew: null, allCrews });
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
    allCrews,
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

    const body = await request.json();
    const { name } = body;

    const supabase = createAdminClient();
    
    // Resolve slug to UUID
    const festivalId = await resolveFestivalId(supabase, params.id);
    if (!festivalId) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

  // Note: Users CAN create multiple crews for the same festival
  // (e.g., "Weekend 1 Squad" and "Day-trip Friends")

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

/**
 * PATCH /api/festivals/[id]/crew
 * Update crew name (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    const supabase = createAdminClient();
    
    // Resolve slug to UUID
    const festivalId = await resolveFestivalId(supabase, params.id);
    if (!festivalId) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

    // Get user's membership and crew
    const { data: membership } = await supabase
      .from("festival_crew_members")
      .select(`
        crew_id,
        role,
        festival_crews!inner (
          id,
          festival_id
        )
      `)
      .eq("user_id", session.user.id)
      .eq("festival_crews.festival_id", festivalId)
      .single();

    if (!membership) {
      return NextResponse.json({ error: "Not a member of any crew" }, { status: 404 });
    }

    // Check if user is admin
    if (membership.role !== "admin") {
      return NextResponse.json({ error: "Only admins can edit crew settings" }, { status: 403 });
    }

    // Update crew name
    const { error: updateError } = await supabase
      .from("festival_crews")
      .update({ name: name || null })
      .eq("id", membership.crew_id);

    if (updateError) {
      console.error("Error updating crew:", updateError);
      return NextResponse.json({ error: "Failed to update crew" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in PATCH /api/festivals/[id]/crew:", error);
    return NextResponse.json({ error: "Failed to update crew" }, { status: 500 });
  }
}
