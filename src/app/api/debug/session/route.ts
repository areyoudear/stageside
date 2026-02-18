import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

/**
 * GET /api/debug/session
 * Debug endpoint to check session and database state
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ 
        error: "No session",
        session: null 
      });
    }

    const adminClient = createAdminClient();
    
    // Check if the session user ID exists in database
    const { data: dbUser, error: dbError } = await adminClient
      .from("users")
      .select("id, email, display_name, username, spotify_id, auth_provider")
      .eq("id", session.user.id)
      .maybeSingle();

    // Also try to find by email if ID doesn't match
    let userByEmail = null;
    if (!dbUser && session.user.email) {
      const { data } = await adminClient
        .from("users")
        .select("id, email, display_name, username, spotify_id, auth_provider")
        .eq("email", session.user.email)
        .maybeSingle();
      userByEmail = data;
    }

    return NextResponse.json({
      session: {
        userId: session.user.id,
        email: session.user.email,
        name: session.user.name,
        username: session.user.username,
        provider: session.user.provider,
      },
      database: {
        userFoundById: !!dbUser,
        dbUser: dbUser,
        dbError: dbError?.message,
        userByEmail: userByEmail,
        idMismatch: userByEmail && userByEmail.id !== session.user.id,
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}
