import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMusicConnections,
  disconnectMusicService,
  MusicServiceType,
} from "@/lib/supabase";

/**
 * GET /api/music/connections
 * Get all music service connections for the current user
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const connections = await getMusicConnections(session.user.id);

    // Don't expose tokens to frontend
    const safeConnections = connections.map((conn) => ({
      id: conn.id,
      service: conn.service,
      service_username: conn.service_username,
      is_active: conn.is_active,
      error: conn.error,
      connected_at: conn.connected_at,
      last_synced: conn.last_synced,
    }));

    return NextResponse.json({ connections: safeConnections });
  } catch (error) {
    console.error("Error fetching connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/music/connections
 * Disconnect a music service
 *
 * Body: { service: "spotify" | "apple_music" | ... }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const service = body.service as MusicServiceType;

    if (!service) {
      return NextResponse.json({ error: "Service is required" }, { status: 400 });
    }

    const validServices: MusicServiceType[] = [
      "spotify",
      "apple_music",
      "youtube_music",
      "tidal",
      "deezer",
    ];

    if (!validServices.includes(service)) {
      return NextResponse.json({ error: "Invalid service" }, { status: 400 });
    }

    const success = await disconnectMusicService(session.user.id, service);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to disconnect service" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, service });
  } catch (error) {
    console.error("Error disconnecting service:", error);
    return NextResponse.json(
      { error: "Failed to disconnect service" },
      { status: 500 }
    );
  }
}
