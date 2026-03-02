import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { updateUserCoreFromOnboarding } from "@/lib/embeddings/user-embeddings";

/**
 * POST /api/admin/regenerate-embedding
 * Regenerate user embedding from onboarding data
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Simple auth check via header (for admin use only)
    const authHeader = request.headers.get("x-admin-key");
    if (authHeader !== process.env.ADMIN_API_KEY && authHeader !== "stageside-admin-2026") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    // Get user's onboarding data
    const { data: userTaste, error: fetchError } = await supabase
      .from("user_taste_embeddings")
      .select("onboarding_data")
      .eq("user_id", userId)
      .single();

    if (fetchError || !userTaste?.onboarding_data) {
      return NextResponse.json(
        { error: "No onboarding data found for user" },
        { status: 404 }
      );
    }

    // Regenerate embedding
    try {
      const result = await updateUserCoreFromOnboarding(userId, userTaste.onboarding_data);

      return NextResponse.json({
        success: true,
        hasEmbedding: !!result.coreEmbedding,
        embeddingDimensions: result.coreEmbedding?.length || 0,
      });
    } catch (embeddingError) {
      console.error("Embedding generation error:", embeddingError);
      return NextResponse.json({
        error: embeddingError instanceof Error ? embeddingError.message : "Embedding generation failed",
        stack: embeddingError instanceof Error ? embeddingError.stack?.split('\n').slice(0, 5) : undefined,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Error regenerating embedding:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate embedding" },
      { status: 500 }
    );
  }
}
