import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/user/onboarding-status
 * Check if user has completed onboarding
 * Returns: { completed: boolean, hasArtists: boolean, hasLocation: boolean, hasCompletedEmbeddingOnboarding: boolean }
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Check preferences (onboarding_completed flag and location)
    const { data: prefs } = await adminClient
      .from("user_preferences")
      .select("onboarding_completed, default_location")
      .eq("user_id", session.user.id)
      .single();

    // Check if user has music profile (artists or connected services)
    const { data: profile } = await adminClient
      .from("music_profiles")
      .select("top_artists")
      .eq("user_id", session.user.id)
      .single();

    // Check if user has any connected music services
    const { data: connections } = await adminClient
      .from("music_connections")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .limit(1);

    // Check if user has completed the embedding-based onboarding
    const { data: embeddingData } = await adminClient
      .from("user_taste_embeddings")
      .select("onboarding_completed_at, onboarding_type")
      .eq("user_id", session.user.id)
      .single();

    const hasArtists = !!(profile?.top_artists && Array.isArray(profile.top_artists) && profile.top_artists.length > 0);
    const hasConnections = !!(connections && connections.length > 0);
    const hasLocation = !!prefs?.default_location;
    const hasCompletedEmbeddingOnboarding = !!embeddingData?.onboarding_completed_at;
    
    // User is considered to have completed onboarding if:
    // 1. They explicitly completed it (onboarding_completed flag), OR
    // 2. They have artists or connected services (they added their music taste), OR
    // 3. They completed the embedding-based onboarding
    const completed = prefs?.onboarding_completed === true || hasArtists || hasConnections || hasCompletedEmbeddingOnboarding;

    return NextResponse.json({
      completed,
      hasArtists,
      hasConnections,
      hasLocation,
      // Explicit flag for when they clicked "complete"
      explicitlyCompleted: prefs?.onboarding_completed === true,
      // Embedding-based onboarding status
      hasCompletedEmbeddingOnboarding,
      embeddingOnboardingType: embeddingData?.onboarding_type || null,
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
