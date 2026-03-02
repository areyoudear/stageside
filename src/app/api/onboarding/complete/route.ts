import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OnboardingData } from "@/lib/embeddings/types";
import { updateUserCoreFromOnboarding } from "@/lib/embeddings/user-embeddings";
import { createAdminClient } from "@/lib/supabase";

/**
 * Sync onboarding artists to music_profiles table for matching
 */
async function syncArtistsToMusicProfile(
  userId: string,
  likedArtists: string[],
  genres: string[] = []
) {
  const supabase = createAdminClient();
  
  // Transform artist names to music_profiles format
  const topArtists = likedArtists.map((name, index) => ({
    id: `onboarding-${index}`,
    name,
    genres: [],
    popularity: 100 - index, // Higher score for earlier picks
    source: 'manual',
    image_url: null,
  }));
  
  await supabase
    .from('music_profiles')
    .upsert({
      user_id: userId,
      top_artists: topArtists,
      top_genres: genres,
      last_synced: new Date().toISOString(),
    }, {
      onConflict: 'user_id',
    });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const body: OnboardingData = await request.json();
    
    // Validate required data
    if (!body.likedArtists || body.likedArtists.length < 3) {
      return NextResponse.json(
        { error: "At least 3 artists required" },
        { status: 400 }
      );
    }
    
    // Always sync artists to music_profiles for matching to work
    await syncArtistsToMusicProfile(
      session.user.id,
      body.likedArtists,
      body.culturalPreferences || []
    );
    
    // Try to create user embedding from onboarding data
    // If embedding generation fails, still mark onboarding as complete
    let userTaste = null;
    let embeddingError = null;
    
    try {
      userTaste = await updateUserCoreFromOnboarding(
        session.user.id,
        body
      );
    } catch (error) {
      console.error("Error generating embedding (will retry later):", error);
      embeddingError = error instanceof Error ? error.message : "Unknown error";
      
      // Still save the onboarding data so user can continue
      const supabase = createAdminClient();
      await supabase
        .from('user_taste_embeddings')
        .upsert({
          user_id: session.user.id,
          onboarding_type: 'manual',
          onboarding_data: body,
          onboarding_completed_at: new Date().toISOString(),
          embedding_version: 1,
        }, {
          onConflict: 'user_id',
        });
    }
    
    return NextResponse.json({
      success: true,
      onboardingType: userTaste?.onboardingType ?? 'manual',
      embeddingVersion: userTaste?.embeddingVersion ?? 1,
      embeddingPending: !!embeddingError,
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
