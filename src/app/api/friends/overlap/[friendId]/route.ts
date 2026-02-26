import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { calculateTasteOverlap, TasteOverlap } from "@/lib/concert-buddy";

interface RouteContext {
  params: Promise<{ friendId: string }>;
}

/**
 * GET /api/friends/[friendId]/overlap
 * Get taste overlap between current user and a friend
 * 
 * Returns:
 * - sharedArtists: Artists both users have in their top artists
 * - sharedGenres: Genres both users listen to
 * - overlapPercentage: Jaccard similarity percentage (0-100)
 * - totalUniqueArtists: Total unique artists across both profiles
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { friendId } = await context.params;
    const userId = session.user.id;

    if (!friendId) {
      return NextResponse.json({ error: "Friend ID is required" }, { status: 400 });
    }

    // Verify friendship exists and is accepted
    const adminClient = createAdminClient();
    const { data: friendship, error: friendshipError } = await adminClient
      .from("friendships")
      .select("id, status")
      .or(
        `and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`
      )
      .eq("status", "accepted")
      .single();

    if (friendshipError || !friendship) {
      return NextResponse.json(
        { error: "You must be friends to view taste overlap" },
        { status: 403 }
      );
    }

    // Get friend info for response
    const { data: friendUser, error: userError } = await adminClient
      .from("users")
      .select("id, display_name, username, avatar_url")
      .eq("id", friendId)
      .single();

    if (userError || !friendUser) {
      return NextResponse.json({ error: "Friend not found" }, { status: 404 });
    }

    // Calculate taste overlap
    const overlap = await calculateTasteOverlap(userId, friendId);

    if (!overlap) {
      return NextResponse.json(
        {
          error: "Could not calculate taste overlap. Make sure both users have connected music services.",
          friend: {
            id: friendUser.id,
            name: friendUser.display_name || friendUser.username,
            username: friendUser.username,
            avatarUrl: friendUser.avatar_url,
          },
          overlap: null,
        },
        { status: 200 }
      );
    }

    // Build response with friend info
    const response: {
      friend: {
        id: string;
        name: string;
        username: string;
        avatarUrl?: string;
      };
      overlap: TasteOverlap;
      summary: {
        matchStrength: "high" | "medium" | "low" | "minimal";
        description: string;
      };
    } = {
      friend: {
        id: friendUser.id,
        name: friendUser.display_name || friendUser.username,
        username: friendUser.username,
        avatarUrl: friendUser.avatar_url,
      },
      overlap,
      summary: getMatchSummary(overlap),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in taste overlap API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Generate a human-readable match summary
 */
function getMatchSummary(overlap: TasteOverlap): {
  matchStrength: "high" | "medium" | "low" | "minimal";
  description: string;
} {
  const { overlapPercentage, sharedArtists, sharedGenres } = overlap;

  if (overlapPercentage >= 50 || sharedArtists.length >= 10) {
    return {
      matchStrength: "high",
      description: `You're music soulmates! ${sharedArtists.length} artists in common.`,
    };
  }

  if (overlapPercentage >= 25 || sharedArtists.length >= 5) {
    return {
      matchStrength: "medium",
      description: `Great taste overlap! You share ${sharedArtists.length} artists and love ${sharedGenres.slice(0, 3).join(", ")}.`,
    };
  }

  if (overlapPercentage >= 10 || sharedArtists.length >= 2) {
    return {
      matchStrength: "low",
      description: `Some common ground with ${sharedArtists.length} shared artists. Different vibes, but concerts together could work!`,
    };
  }

  return {
    matchStrength: "minimal",
    description: sharedGenres.length > 0
      ? `Different tastes, but you both enjoy ${sharedGenres[0]}. Could discover new artists together!`
      : `Very different music tastes. A concert together would be an adventure!`,
  };
}
