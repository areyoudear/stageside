import { NextRequest, NextResponse } from "next/server";

const EARLY_ACCESS_PASSWORD = process.env.EARLY_ACCESS_PASSWORD || "stageside2026";
const COOKIE_NAME = "stageside_access";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (password === EARLY_ACCESS_PASSWORD) {
      const response = NextResponse.json({ success: true });
      
      response.cookies.set(COOKIE_NAME, "granted", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });

      return response;
    }

    return NextResponse.json({ success: false, error: "Invalid password" }, { status: 401 });
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
  }
}
