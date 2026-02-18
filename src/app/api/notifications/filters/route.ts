import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

export interface FilterNotificationSettings {
  id?: string;
  locationName: string;
  locationLat: number;
  locationLng: number;
  radiusMiles: number;
  minMatchScore?: number;
  enabled: boolean;
  frequency: "daily" | "weekly" | "instant";
}

/**
 * GET /api/notifications/filters
 * Get user's concert filter notification settings
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    
    const { data, error } = await adminClient
      .from("concert_notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (which is fine)
      console.error("Error fetching notification settings:", error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ notification: null });
    }

    return NextResponse.json({
      notification: {
        id: data.id,
        locationName: data.location_name,
        locationLat: data.location_lat,
        locationLng: data.location_lng,
        radiusMiles: data.radius_miles,
        minMatchScore: data.min_match_score,
        enabled: data.enabled,
        frequency: data.frequency,
        lastNotifiedAt: data.last_notified_at,
        createdAt: data.created_at,
      },
    });
  } catch (error) {
    console.error("Error in notifications GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/notifications/filters
 * Create or update concert filter notification settings
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: FilterNotificationSettings = await request.json();

    if (!body.locationName || body.locationLat === undefined || body.locationLng === undefined) {
      return NextResponse.json({ error: "Location is required" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Upsert the notification settings
    const { data, error } = await adminClient
      .from("concert_notifications")
      .upsert(
        {
          user_id: session.user.id,
          location_name: body.locationName,
          location_lat: body.locationLat,
          location_lng: body.locationLng,
          radius_miles: body.radiusMiles || 50,
          min_match_score: body.minMatchScore || 0,
          status_filter: "all", // Always notify about all concerts
          enabled: body.enabled !== false,
          frequency: body.frequency || "daily",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Error saving notification settings:", error);
      return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      notification: {
        id: data.id,
        locationName: data.location_name,
        locationLat: data.location_lat,
        locationLng: data.location_lng,
        radiusMiles: data.radius_miles,
        minMatchScore: data.min_match_score,
        enabled: data.enabled,
        frequency: data.frequency,
      },
    });
  } catch (error) {
    console.error("Error in notifications POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/filters
 * Delete/disable concert filter notifications
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from("concert_notifications")
      .delete()
      .eq("user_id", session.user.id);

    if (error) {
      console.error("Error deleting notification settings:", error);
      return NextResponse.json({ error: "Failed to delete settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in notifications DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
