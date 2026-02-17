import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/concerts/interest
 * Get user's concert interests (interested + going)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // 'interested', 'going', or null for all

    let query = adminClient
      .from("concert_interests")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching interests:", error);
      return NextResponse.json({ error: "Failed to fetch interests" }, { status: 500 });
    }

    return NextResponse.json({
      interests: data?.map((i) => ({
        id: i.id,
        concertId: i.concert_id,
        status: i.status,
        concert: i.concert_data,
        createdAt: i.created_at,
      })) || [],
    });
  } catch (error) {
    console.error("Error in interests GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/concerts/interest
 * Mark interest in a concert (interested or going)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { concertId, status, concert } = await request.json();

    if (!concertId || !status || !concert) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["interested", "going"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Upsert the interest
    const { data, error } = await adminClient
      .from("concert_interests")
      .upsert(
        {
          user_id: session.user.id,
          concert_id: concertId,
          status,
          concert_data: {
            id: concert.id,
            name: concert.name,
            artists: concert.artists,
            venue: concert.venue,
            date: concert.date,
            time: concert.time,
            imageUrl: concert.imageUrl,
            ticketUrl: concert.ticketUrl,
            priceRange: concert.priceRange,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,concert_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving interest:", error);
      return NextResponse.json({ error: "Failed to save interest" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      interest: {
        id: data.id,
        concertId: data.concert_id,
        status: data.status,
      },
    });
  } catch (error) {
    console.error("Error in interests POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/concerts/interest
 * Remove interest from a concert
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const concertId = searchParams.get("concertId");

    if (!concertId) {
      return NextResponse.json({ error: "Concert ID required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("concert_interests")
      .delete()
      .eq("user_id", session.user.id)
      .eq("concert_id", concertId);

    if (error) {
      console.error("Error removing interest:", error);
      return NextResponse.json({ error: "Failed to remove interest" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in interests DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
