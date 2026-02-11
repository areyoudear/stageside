import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { subscribeEmail } from "@/lib/supabase";

/**
 * POST /api/subscribe
 * Subscribe email to concert notifications
 *
 * Body:
 * - email: Email address (required)
 * - location: { lat, lng, city } (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, location } = body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    // Get user ID if authenticated
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Subscribe the email
    const success = await subscribeEmail(email, location, userId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to subscribe. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully subscribed to concert updates!",
    });
  } catch (error) {
    console.error("Error in /api/subscribe:", error);
    return NextResponse.json(
      { error: "Failed to subscribe" },
      { status: 500 }
    );
  }
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
