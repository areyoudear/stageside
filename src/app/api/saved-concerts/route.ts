import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { saveConcert, unsaveConcert, getSavedConcerts } from "@/lib/supabase";

/**
 * GET /api/saved-concerts
 * Get user's saved concert IDs
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const savedConcertIds = await getSavedConcerts(session.user.id);

    return NextResponse.json({
      savedConcerts: savedConcertIds,
    });
  } catch (error) {
    console.error("Error in GET /api/saved-concerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved concerts" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/saved-concerts
 * Save a concert to user's list
 *
 * Body:
 * - concertId: Ticketmaster event ID
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { concertId } = body;

    if (!concertId) {
      return NextResponse.json(
        { error: "Concert ID is required" },
        { status: 400 }
      );
    }

    const success = await saveConcert(session.user.id, concertId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to save concert" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Concert saved!",
    });
  } catch (error) {
    console.error("Error in POST /api/saved-concerts:", error);
    return NextResponse.json(
      { error: "Failed to save concert" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/saved-concerts
 * Remove a concert from user's saved list
 *
 * Body:
 * - concertId: Ticketmaster event ID
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { concertId } = body;

    if (!concertId) {
      return NextResponse.json(
        { error: "Concert ID is required" },
        { status: 400 }
      );
    }

    const success = await unsaveConcert(session.user.id, concertId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to remove concert" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Concert removed from saved list",
    });
  } catch (error) {
    console.error("Error in DELETE /api/saved-concerts:", error);
    return NextResponse.json(
      { error: "Failed to remove concert" },
      { status: 500 }
    );
  }
}
