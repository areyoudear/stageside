import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail, sendConcertNotificationEmail } from "@/lib/email";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * POST /api/email/test
 * Test email sending (requires CRON_SECRET for auth)
 * 
 * Body: { type: "welcome" | "concert", email: string, name?: string }
 */
export async function POST(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, email, name = "Test User" } = body;

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    if (type === "welcome") {
      const result = await sendWelcomeEmail({
        to: email,
        userName: name,
      });
      return NextResponse.json(result);
    }

    if (type === "concert") {
      const result = await sendConcertNotificationEmail({
        to: email,
        userName: name,
        locationName: "San Francisco",
        concerts: [
          {
            id: "test-1",
            name: "Test Concert",
            artists: ["The National", "Phoebe Bridgers"],
            venue: {
              name: "The Fillmore",
              city: "San Francisco",
              state: "CA",
            },
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
            time: "8:00 PM",
            ticketUrl: "https://example.com/tickets",
            matchScore: 87,
          },
          {
            id: "test-2",
            name: "Another Show",
            artists: ["Arcade Fire"],
            venue: {
              name: "Chase Center",
              city: "San Francisco",
              state: "CA",
            },
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks from now
            ticketUrl: "https://example.com/tickets2",
            matchScore: 65,
          },
        ],
        filterDescription: "(50%+ match)",
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid type. Use 'welcome' or 'concert'" }, { status: 400 });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
