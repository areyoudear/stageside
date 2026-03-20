import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * Helper: resolve festival slug or UUID to UUID
 */
async function resolveFestivalId(supabase: any, idOrSlug: string): Promise<string | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  if (isUuid) return idOrSlug;
  
  const { data } = await supabase
    .from("festivals")
    .select("id")
    .eq("slug", idOrSlug)
    .single();
    
  return data?.id || null;
}

/**
 * POST /api/festivals/[id]/crew/join
 * Join an existing crew via invite code
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
    const { inviteCode } = body;
    
    const supabase = createAdminClient();
    
    // Resolve slug to UUID
    const festivalId = await resolveFestivalId(supabase, params.id);
    if (!festivalId) {
      return NextResponse.json({ error: "Festival not found" }, { status: 404 });
    }

  if (!inviteCode) {
    return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  }

  // Find crew by invite code
  const { data: crew, error: crewError } = await supabase
    .from("festival_crews")
    .select("*")
    .eq("invite_code", inviteCode.toLowerCase().trim())
    .eq("festival_id", festivalId)
    .single();

  if (crewError || !crew) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  // Check if already a member
  const { data: existingMember } = await supabase
    .from("festival_crew_members")
    .select("id")
    .eq("crew_id", crew.id)
    .eq("user_id", session.user.id)
    .single();

  if (existingMember) {
    return NextResponse.json({ error: "Already a member" }, { status: 400 });
  }

  // Check crew size (max 20)
  const { count } = await supabase
    .from("festival_crew_members")
    .select("*", { count: "exact", head: true })
    .eq("crew_id", crew.id);

  if (count && count >= 20) {
    return NextResponse.json({ error: "Crew is full (max 20 members)" }, { status: 400 });
  }

  // Check if user is in another crew for this festival
  const { data: otherCrew } = await supabase
    .from("festival_crew_members")
    .select(`
      crew_id,
      festival_crews!inner (festival_id)
    `)
    .eq("user_id", session.user.id)
    .eq("festival_crews.festival_id", festivalId)
    .single();

  if (otherCrew) {
    return NextResponse.json(
      { error: "You're already in a crew for this festival. Leave it first to join another." },
      { status: 400 }
    );
  }

  // Add as member
  const { error: memberError } = await supabase
    .from("festival_crew_members")
    .insert({
      crew_id: crew.id,
      user_id: session.user.id,
      role: "member",
    });

  if (memberError) {
    console.error("Error joining crew:", memberError);
    return NextResponse.json({ error: "Failed to join crew" }, { status: 500 });
  }

  // Get crew details with members
  const { data: members } = await supabase
    .from("festival_crew_members")
    .select(`
      user_id,
      users!inner (
        id,
        display_name,
        username,
        avatar_url
      )
    `)
    .eq("crew_id", crew.id);

  return NextResponse.json({
    success: true,
    crew: {
      id: crew.id,
      name: crew.name,
      festivalId: crew.festival_id,
      memberCount: members?.length || 1,
    },
  });
  } catch (error) {
    console.error("Error in POST /api/festivals/[id]/crew/join:", error);
    return NextResponse.json({ error: "Failed to join crew" }, { status: 500 });
  }
}
