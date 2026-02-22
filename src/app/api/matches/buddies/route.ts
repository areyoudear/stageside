/**
 * Buddy Matching API - Find compatible concert buddies
 * 
 * GET /api/matches/buddies
 * 
 * Params:
 * - eventId: UUID (optional - if provided, find buddies interested in this event)
 * - limit: number (default 20)
 * - explain: boolean (optional, generates LLM explanations)
 * 
 * Compatibility score formula:
 * score = 0.5 * taste_similarity + 0.3 * event_overlap + 0.1 * energy_alignment + 0.1 * price_alignment
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getOrCreateUserEmbedding } from "@/lib/embeddings/user-embeddings";
import { cosineSimilarity } from "@/lib/embeddings/embedding-service";
import { EmbeddingVector } from "@/lib/embeddings/types";
import { generateMatchExplanation, getCachedExplanation } from "../_lib/explanations";

// Compatibility weights
const WEIGHTS = {
  TASTE_SIMILARITY: 0.5,
  EVENT_OVERLAP: 0.3,
  ENERGY_ALIGNMENT: 0.1,
  PRICE_ALIGNMENT: 0.1,
};

interface BuddyMatch {
  userId: string;
  displayName: string | null;
  profileImage: string | null;
  // Scores
  overallScore: number;
  tasteSimilarity: number;
  eventOverlap: number;
  energyAlignment: number;
  priceAlignment: number;
  // Shared data
  sharedSavedEvents: string[];
  sharedAttendedEvents: string[];
  // Metadata
  compatibilityLabel: string;
  explanation?: string;
}

/**
 * Get compatibility label based on score
 */
function getCompatibilityLabel(score: number): string {
  if (score >= 0.85) return "Soul twins 🎭";
  if (score >= 0.70) return "Great match 🎵";
  if (score >= 0.50) return "Good vibes 🎶";
  if (score >= 0.30) return "Some overlap 🎧";
  return "Different tastes 🌈";
}

/**
 * Calculate event overlap between two users
 */
async function calculateEventOverlap(
  userId1: string,
  userId2: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ 
  score: number; 
  sharedSaved: string[]; 
  sharedAttended: string[];
}> {
  // Get saved concerts for both users
  const [saved1, saved2] = await Promise.all([
    supabase
      .from("saved_concerts")
      .select("concert_id")
      .eq("user_id", userId1),
    supabase
      .from("saved_concerts")
      .select("concert_id")
      .eq("user_id", userId2),
  ]);

  const set1 = new Set<string>((saved1.data || []).map(s => s.concert_id));
  const set2 = new Set<string>((saved2.data || []).map(s => s.concert_id));

  // Find intersection
  const sharedSaved = Array.from(set1).filter(id => set2.has(id));

  // Get attended concerts (could be separate table or from feedback)
  // Placeholder: using saved concerts as proxy for now
  const sharedAttended: string[] = [];

  // Calculate overlap score
  const unionSize = new Set<string>([...Array.from(set1), ...Array.from(set2)]).size;
  const overlapScore = unionSize > 0 
    ? sharedSaved.length / Math.min(Math.max(set1.size, set2.size, 1), 20)
    : 0;

  return {
    score: Math.min(1, overlapScore),
    sharedSaved,
    sharedAttended,
  };
}

/**
 * Calculate energy alignment from onboarding data
 */
function calculateEnergyAlignment(
  user1Data: Record<string, unknown> | null,
  user2Data: Record<string, unknown> | null
): number {
  if (!user1Data || !user2Data) return 0.5; // Default neutral

  const sliders1 = user1Data.sliderValues as { energy?: number } | undefined;
  const sliders2 = user2Data.sliderValues as { energy?: number } | undefined;

  if (!sliders1?.energy || !sliders2?.energy) return 0.5;

  // Similarity based on energy preference closeness
  const diff = Math.abs(sliders1.energy - sliders2.energy);
  return 1 - diff;
}

/**
 * Calculate price alignment (placeholder - would use budget data)
 */
function calculatePriceAlignment(
  user1Data: Record<string, unknown> | null,
  user2Data: Record<string, unknown> | null
): number {
  // TODO: Implement when budget preferences are tracked
  return 0.5; // Default neutral
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get("eventId");
    const limit = parseInt(searchParams.get("limit") || "20");
    const shouldExplain = searchParams.get("explain") === "true";

    const supabase = createAdminClient();

    // Get current user's embedding
    const currentUserTaste = await getOrCreateUserEmbedding(session.user.id);
    
    if (!currentUserTaste?.coreEmbedding) {
      return NextResponse.json({
        buddies: [],
        hasEmbedding: false,
        message: "Complete onboarding to find compatible buddies",
      });
    }

    // Determine which users to compare against
    let candidateUserIds: string[] = [];

    if (eventId) {
      // Find users who saved this event
      const { data: savedBy } = await supabase
        .from("saved_concerts")
        .select("user_id")
        .eq("concert_id", eventId)
        .neq("user_id", session.user.id);

      candidateUserIds = (savedBy || []).map(s => s.user_id);
    } else {
      // Get friends/connections or users with similar taste
      // For now, get users with embeddings (limited)
      const { data: allUsers } = await supabase
        .from("user_taste_embeddings")
        .select("user_id")
        .neq("user_id", session.user.id)
        .not("core_embedding", "is", null)
        .limit(100);

      candidateUserIds = (allUsers || []).map(u => u.user_id);
    }

    if (candidateUserIds.length === 0) {
      return NextResponse.json({
        buddies: [],
        hasEmbedding: true,
        message: eventId 
          ? "No other users have saved this event yet"
          : "No compatible users found",
      });
    }

    // Fetch embeddings and user data for candidates
    const { data: candidateData } = await supabase
      .from("user_taste_embeddings")
      .select(`
        user_id,
        core_embedding,
        onboarding_data
      `)
      .in("user_id", candidateUserIds);

    const { data: userData } = await supabase
      .from("users")
      .select("id, display_name")
      .in("id", candidateUserIds);

    const userMap = new Map<string, { id: string; display_name: string | null }>(
      (userData || []).map(u => [u.id, u])
    );

    // Calculate compatibility for each candidate
    const buddyMatches: BuddyMatch[] = [];

    for (const candidate of candidateData || []) {
      if (!candidate.core_embedding) continue;

      // 1. Taste similarity (cosine similarity of embeddings)
      const tasteSimilarity = cosineSimilarity(
        currentUserTaste.coreEmbedding as EmbeddingVector,
        candidate.core_embedding as EmbeddingVector
      );

      // 2. Event overlap
      const eventOverlapData = await calculateEventOverlap(
        session.user.id,
        candidate.user_id,
        supabase
      );

      // 3. Energy alignment
      const energyAlignment = calculateEnergyAlignment(
        currentUserTaste.onboardingData,
        candidate.onboarding_data
      );

      // 4. Price alignment
      const priceAlignment = calculatePriceAlignment(
        currentUserTaste.onboardingData,
        candidate.onboarding_data
      );

      // Calculate weighted overall score
      const overallScore = 
        WEIGHTS.TASTE_SIMILARITY * tasteSimilarity +
        WEIGHTS.EVENT_OVERLAP * eventOverlapData.score +
        WEIGHTS.ENERGY_ALIGNMENT * energyAlignment +
        WEIGHTS.PRICE_ALIGNMENT * priceAlignment;

      const user = userMap.get(candidate.user_id);

      buddyMatches.push({
        userId: candidate.user_id,
        displayName: user?.display_name || null,
        profileImage: null, // Would fetch from user profile
        overallScore,
        tasteSimilarity,
        eventOverlap: eventOverlapData.score,
        energyAlignment,
        priceAlignment,
        sharedSavedEvents: eventOverlapData.sharedSaved,
        sharedAttendedEvents: eventOverlapData.sharedAttended,
        compatibilityLabel: getCompatibilityLabel(overallScore),
      });
    }

    // Sort by overall score descending
    buddyMatches.sort((a, b) => b.overallScore - a.overallScore);

    // Limit results
    const topBuddies = buddyMatches.slice(0, limit);

    // Generate explanations if requested
    if (shouldExplain) {
      await Promise.all(
        topBuddies.slice(0, 5).map(async (buddy) => {
          const cached = await getCachedExplanation(
            session.user.id,
            buddy.userId,
            "buddy"
          );

          if (cached) {
            buddy.explanation = cached;
          } else {
            const explanation = await generateMatchExplanation(
              session.user.id,
              buddy.userId,
              "buddy",
              {
                tasteSimilarity: buddy.tasteSimilarity,
                eventOverlap: buddy.eventOverlap,
                sharedEvents: buddy.sharedSavedEvents.length,
              }
            );
            buddy.explanation = explanation;
          }
        })
      );
    }

    // Summary stats
    const distribution = {
      highMatch: topBuddies.filter(b => b.overallScore >= 0.7).length,
      mediumMatch: topBuddies.filter(b => b.overallScore >= 0.4 && b.overallScore < 0.7).length,
      lowMatch: topBuddies.filter(b => b.overallScore < 0.4).length,
    };

    return NextResponse.json({
      buddies: topBuddies,
      total: buddyMatches.length,
      returned: topBuddies.length,
      distribution,
      hasEmbedding: true,
      eventId: eventId || null,
      weights: WEIGHTS, // Expose weights for transparency
    });

  } catch (error) {
    console.error("Error in /api/matches/buddies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
