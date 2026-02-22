/**
 * POST /api/notifications/test-digest
 * 
 * Send a test digest email to the current user using their actual settings
 * and real matching concerts.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { sendConcertNotificationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // Get user profile
    const { data: user, error: userError } = await adminClient
      .from("users")
      .select("email, display_name")
      .eq("id", session.user.id)
      .single();

    if (userError || !user) {
      console.error("User fetch error:", userError);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const email = user.email;
    const name = user.display_name || "there";

    if (!email) {
      return NextResponse.json(
        { error: "No email address on file" },
        { status: 400 }
      );
    }

    // Get notification settings from concert_notifications table
    const { data: notificationSettings, error: notifError } = await adminClient
      .from("concert_notifications")
      .select("location_name, location_lat, location_lng, radius_miles, min_match_score, enabled")
      .eq("user_id", session.user.id)
      .single();

    // Use defaults if no settings found
    const locationName = notificationSettings?.location_name || "San Francisco";
    const minScore = notificationSettings?.min_match_score || 30;
    const radius = notificationSettings?.radius_miles || 50;
    const lat = notificationSettings?.location_lat || 37.7749;
    const lng = notificationSettings?.location_lng || -122.4194;

    // Fetch real matching concerts from the matches API
    let concerts: any[] = [];
    
    try {
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
