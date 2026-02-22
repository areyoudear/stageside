import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OnboardingData } from "@/lib/embeddings/types";
import { updateUserCoreFromOnboarding } from "@/lib/embeddings/user-embeddings";

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
    
    // Create user embedding from onboarding data
    const userTaste = await updateUserCoreFromOnboarding(
      session.user.id,
      body
    );
    
    return NextResponse.json({
      success: true,
      onboardingType: userTaste.onboardingType,
      embeddingVersion: userTaste.embeddingVersion,
    });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
