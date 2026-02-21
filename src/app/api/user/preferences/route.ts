import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";

interface LocationPreference {
  city: string;
  lat: number;
  lng: number;
}

interface UserPreferences {
  default_location?: LocationPreference | null;
  max_distance_miles?: number;
  notification_new_matches?: boolean;
  notification_price_drops?: boolean;
  notification_friend_activity?: boolean;
  onboarding_completed?: boolean;
}

/**
 * GET /api/user/preferences
 * Get current user's preferences
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("user_preferences")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found (not an error)
      console.error("Error fetching preferences:", error);
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
    }

    return NextResponse.json({ 
      preferences: data || null,
      hasPreferences: !!data,
    });
  } catch (error) {
    console.error("Error in GET /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/user/preferences
 * Create or update user preferences
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as UserPreferences;
    const adminClient = createAdminClient();

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {
      user_id: session.user.id,
      updated_at: new Date().toISOString(),
    };

    if (body.default_location !== undefined) {
      updateData.default_location = body.default_location;
    }
    if (body.max_distance_miles !== undefined) {
      updateData.max_distance_miles = body.max_distance_miles;
    }
    if (body.notification_new_matches !== undefined) {
      updateData.notification_new_matches = body.notification_new_matches;
    }
    if (body.notification_price_drops !== undefined) {
      updateData.notification_price_drops = body.notification_price_drops;
    }
    if (body.notification_friend_activity !== undefined) {
      updateData.notification_friend_activity = body.notification_friend_activity;
    }
    if (body.onboarding_completed !== undefined) {
      updateData.onboarding_completed = body.onboarding_completed;
    }

    // Upsert preferences
    const { error } = await adminClient
      .from("user_preferences")
      .upsert(updateData, {
        onConflict: "user_id",
      });

    if (error) {
      console.error("Error saving preferences:", error);
      return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in POST /api/user/preferences:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
