/**
 * POST /api/notifications/test-digest
 * 
 * Send a test digest email to the current user using their actual settings
 * and real matching concerts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";
import { sendConcertNotificationEmail } from "@/lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile and notification settings
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("email, name, notification_settings")
      .eq("id", session.user.id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const settings = user.notification_settings || {};
    const email = user.email;
    const name = user.name || "there";

    if (!email) {
      return NextResponse.json(
        { error: "No email address on file" },
        { status: 400 }
      );
    }

    // Get location and filter settings
    const locationName = settings.location || "your area";
    const minScore = settings.minMatchScore || 30;
    const radius = settings.radius || 50;

    // Fetch real matching concerts from the matches API
    let concerts: any[] = [];
    
    try {
      // Get lat/lng from location if available
      const lat = settings.lat || 37.7749;
      const lng = settings.lng || -122.4194;
      
      const matchesUrl = new URL("/api/matches/events", request.url);
      matchesUrl.searchParams.set("lat", String(lat));
      matchesUrl.searchParams.set("lng", String(lng));
      matchesUrl.searchParams.set("radius", String(radius));
      matchesUrl.searchParams.set("limit", "10");

      const matchesResponse = await fetch(matchesUrl.toString(), {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      });

      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        // Filter by min score and take top 5
        concerts = (matchesData.concerts || [])
          .filter((c: any) => (c.matchScore || 0) >= minScore)
          .slice(0, 5)
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            artists: c.artists || [],
            venue: c.venue || { name: "TBA", city: locationName },
            date: c.date,
            time: c.time,
            ticketUrl: c.ticketUrl,
            matchScore: c.matchScore || 0,
          }));
      }
    } catch (fetchError) {
      console.error("Error fetching matches for test email:", fetchError);
    }

    // If no real concerts found, use sample data
    if (concerts.length === 0) {
      concerts = [
        {
          id: "sample-1",
          name: "Sample Concert",
          artists: ["Your Favorite Artist"],
          venue: { name: "The Venue", city: locationName, state: "" },
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          time: "8:00 PM",
          ticketUrl: "https://getstageside.com/dashboard",
          matchScore: 85,
        },
        {
          id: "sample-2",
          name: "Another Great Show",
          artists: ["Another Artist", "Opening Act"],
          venue: { name: "Another Venue", city: locationName, state: "" },
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          time: "7:30 PM",
          ticketUrl: "https://getstageside.com/dashboard",
          matchScore: 72,
        },
      ];
    }

    // Send the test email
    const result = await sendConcertNotificationEmail({
      to: email,
      userName: name,
      locationName,
      concerts,
      filterDescription: `(${minScore}%+ match within ${radius} miles)`,
      isTest: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`,
      concertCount: concerts.length,
      usedRealData: concerts[0]?.id !== "sample-1",
    });
  } catch (error) {
    console.error("Test digest error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
