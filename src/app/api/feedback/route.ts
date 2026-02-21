import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, message, email, userAgent, url } = body;

    if (!message || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get user ID if logged in
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Store in Supabase
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("feedback")
      .insert({
        user_id: userId,
        type,
        message,
        email: email || null,
        url: url || null,
        user_agent: userAgent || null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving feedback to database:", error);
      // Still log it even if DB fails
      console.log("📝 Feedback (DB failed):", { type, message, email, url });
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    console.log("📝 New Feedback saved:", data.id);

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error("Error saving feedback:", error);
    return NextResponse.json(
      { error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/feedback
 * Get all feedback (admin only - requires service role)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Simple auth check - in production you'd want proper admin role check
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "new";
    const limit = parseInt(searchParams.get("limit") || "50");

    const adminClient = createAdminClient();
    
    let query = adminClient
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching feedback:", error);
      return NextResponse.json(
        { error: "Failed to fetch feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: data });
  } catch (error) {
    console.error("Error in feedback GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
