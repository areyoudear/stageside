import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sendConcertNotificationEmail } from "@/lib/email";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

interface NotificationRow {
  id: string;
  user_id: string;
  location_name: string;
  location_lat: number;
  location_lng: number;
  radius_miles: number;
  min_match_score: number;
  status_filter: string;
  enabled: boolean;
  frequency: string;
  last_notified_at: string | null;
  last_concert_ids: string[];
}

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  username: string | null;
}

/**
 * GET /api/cron/concert-notifications
 * Cron job to send concert notification emails
 * Should be called daily by Vercel Cron or external service
 */
export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();
    const results: { userId: string; success: boolean; error?: string; concertCount?: number }[] = [];

    // Get all enabled notifications
    const { data: notifications, error: notifError } = await adminClient
      .from("concert_notifications")
      .select("*")
      .eq("enabled", true);

    if (notifError) {
      console.error("Error fetching notifications:", notifError);
      return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: "No notifications to process", processed: 0 });
    }

    // Process each notification
    for (const notif of notifications as NotificationRow[]) {
      try {
        // Check frequency - skip if not due
        if (notif.last_notified_at) {
          const lastNotified = new Date(notif.last_notified_at);
          const now = new Date();
          const hoursSince = (now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60);

          if (notif.frequency === "daily" && hoursSince < 20) continue;
          if (notif.frequency === "weekly" && hoursSince < 160) continue;
        }

        // Get user info
        const { data: user, error: userError } = await adminClient
          .from("users")
          .select("id, email, display_name, username")
          .eq("id", notif.user_id)
          .single();

        if (userError || !user?.email) {
          results.push({ userId: notif.user_id, success: false, error: "User not found" });
          continue;
        }

        const typedUser = user as UserRow;

        // Fetch concerts matching their filters
        const concerts = await fetchMatchingConcerts({
          lat: notif.location_lat,
          lng: notif.location_lng,
          radius: notif.radius_miles,
          minMatchScore: notif.min_match_score,
          userId: notif.user_id,
          statusFilter: notif.status_filter,
        });

        // Filter out concerts we've already notified about
        const previousIds = new Set(notif.last_concert_ids || []);
        const newConcerts = concerts.filter((c) => !previousIds.has(c.id));

        if (newConcerts.length === 0) {
          results.push({ userId: notif.user_id, success: true, concertCount: 0 });
          continue;
        }

        // Send email
        const emailResult = await sendConcertNotificationEmail({
          to: typedUser.email,
          userName: typedUser.display_name || typedUser.username || "there",
          locationName: notif.location_name,
          concerts: newConcerts.slice(0, 10), // Limit to 10 concerts per email
          filterDescription: notif.min_match_score > 0 ? `(${notif.min_match_score}%+ match)` : undefined,
        });

        if (emailResult.success) {
          // Update last notified and concert IDs
          const allIds = [...previousIds, ...newConcerts.map((c) => c.id)].slice(-100); // Keep last 100 IDs
          await adminClient
            .from("concert_notifications")
            .update({
              last_notified_at: new Date().toISOString(),
              last_concert_ids: allIds,
            })
            .eq("id", notif.id);

          results.push({ userId: notif.user_id, success: true, concertCount: newConcerts.length });
        } else {
          results.push({ userId: notif.user_id, success: false, error: emailResult.error });
        }
      } catch (err) {
        console.error(`Error processing notification for user ${notif.user_id}:`, err);
        results.push({ userId: notif.user_id, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const totalConcerts = results.reduce((sum, r) => sum + (r.concertCount || 0), 0);

    return NextResponse.json({
      message: `Processed ${notifications.length} notifications`,
      success: successCount,
      failed: notifications.length - successCount,
      totalConcertsSent: totalConcerts,
      results,
    });
  } catch (error) {
    console.error("Error in cron job:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

interface FetchConcertsParams {
  lat: number;
  lng: number;
  radius: number;
  minMatchScore: number;
  userId: string;
  statusFilter: string;
}

async function fetchMatchingConcerts(params: FetchConcertsParams) {
  const { lat, lng, radius, minMatchScore, userId, statusFilter } = params;

  const adminClient = createAdminClient();

  try {
    // Get user's top artists for match scoring
    const { data: userArtists } = await adminClient
      .from("user_artists")
      .select("artist_name")
      .eq("user_id", userId)
      .order("rank", { ascending: true })
      .limit(100);

    const userArtistNames = new Set(
      (userArtists || []).map((a: { artist_name: string }) => a.artist_name.toLowerCase())
    );

    // Call the internal concerts API
    const baseUrl = process.env.NEXTAUTH_URL || "https://www.getstageside.com";
    
    const searchParams = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radius.toString(),
    });

    const response = await fetch(`${baseUrl}/api/concerts?${searchParams}`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error("Failed to fetch concerts:", response.status);
      return [];
    }

    const data = await response.json();
    let concerts = data.concerts || [];

    // Calculate match scores manually since API doesn't have user context
    concerts = concerts.map((concert: { artists?: string[]; matchScore?: number }) => {
      if (userArtistNames.size === 0) return concert;
      
      const concertArtists = concert.artists || [];
      const matchingArtists = concertArtists.filter((a: string) => 
        userArtistNames.has(a.toLowerCase())
      );
      
      // Simple match score: % of concert artists that match user's library
      const matchScore = concertArtists.length > 0 
        ? Math.round((matchingArtists.length / concertArtists.length) * 100)
        : 0;
      
      return { ...concert, matchScore };
    });

    // Apply min match score filter
    if (minMatchScore > 0) {
      concerts = concerts.filter((c: { matchScore?: number }) => (c.matchScore || 0) >= minMatchScore);
    }

    // Apply status filter if needed
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "interested" || statusFilter === "going") {
        const { data: interests } = await adminClient
          .from("concert_interests")
          .select("concert_id")
          .eq("user_id", userId)
          .eq("status", statusFilter);

        const interestIds = new Set((interests || []).map((i: { concert_id: string }) => i.concert_id));
        concerts = concerts.filter((c: { id: string }) => interestIds.has(c.id));
      }
    }

    return concerts;
  } catch (error) {
    console.error("Error fetching concerts:", error);
    return [];
  }
}
