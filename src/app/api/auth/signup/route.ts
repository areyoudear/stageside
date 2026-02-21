import { NextRequest, NextResponse } from "next/server";
import { createUser } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { name, email, username, password } = await request.json();

    // Validation
    if (!name || !email || !username || !password) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(email, password, name, username);

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Send welcome email (fire-and-forget, don't block signup)
    sendWelcomeEmail({
      to: email,
      userName: name.split(" ")[0], // Use first name
    }).catch((err) => console.error("Failed to send welcome email:", err));

    return NextResponse.json({
      success: true,
      userId: user.id,
    });
  } catch (error) {
    console.error("Signup error:", error);

    if (error instanceof Error) {
      // Known errors (email/username taken)
      if (
        error.message.includes("already") ||
        error.message.includes("taken")
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }

    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
