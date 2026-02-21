import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/user/profile
 * Get current user's profile from database
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { data: user, error } = await adminClient
      .from("users")
      .select("id, email, display_name, username, avatar_url, created_at")
      .eq("id", session.user.id)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error in user profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
