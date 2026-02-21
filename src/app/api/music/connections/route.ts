import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMusicConnections,
  disconnectMusicService,
  saveAggregatedArtists,
  getAggregatedArtists,
  MusicServiceType,
} from "@/lib/supabase";
import { getUserMusicProfile as getSpotifyProfile } from "@/lib/spotify";
import { getUserMusicProfile as getYouTubeProfile } from "@/lib/youtube-music";
import { aggregateArtists, MusicService } from "@/lib/music-aggregator";

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
 * Body: { 
 *   service: "spotify" | "apple_music" | ...,
 *   removeArtists?: boolean  // If true, removes artists that came from this service
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const service = body.service as MusicServiceType;
    const removeArtists = body.removeArtists === true;

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

    // Disconnect the service
    const success = await disconnectMusicService(session.user.id, service);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to disconnect service" },
        { status: 500 }
      );
    }

    let artistsRemoved = 0;

    // If removeArtists is true, re-aggregate from remaining services
    if (removeArtists) {
      // Get remaining active connections
      const connections = await getMusicConnections(session.user.id);
      const remainingConnections = connections.filter(
        (c) => c.is_active && c.access_token && c.service !== service
      );

      if (remainingConnections.length === 0) {
        // No other services, clear all artists
        const currentArtists = await getAggregatedArtists(session.user.id);
        artistsRemoved = currentArtists.length;
        await saveAggregatedArtists(session.user.id, []);
      } else {
        // Re-aggregate from remaining services
        const profiles = [];
        
        for (const conn of remainingConnections) {
          try {
            let profile = null;
            
            if (conn.service === "spotify") {
              const data = await getSpotifyProfile(conn.access_token);
              profile = {
                service: "spotify" as MusicService,
                artists: data.topArtists.map((a) => ({
                  name: a.name,
                  id: a.id,
                  genres: a.genres,
                  popularity: a.popularity,
                  image_url: a.images?.[0]?.url,
                })),
                genres: data.topGenres,
              };
            } else if (conn.service === "youtube_music") {
              const data = await getYouTubeProfile(conn.access_token);
              profile = {
                service: "youtube_music" as MusicService,
                artists: data.topArtists.map((a) => ({
                  name: a.name,
                  id: a.id,
                  genres: [],
                  popularity: a.popularity,
                })),
                genres: data.topGenres,
              };
            }
            
            if (profile) {
              profiles.push(profile);
            }
          } catch (err) {
            console.warn(`Could not fetch from ${conn.service} during disconnect:`, err);
          }
        }

        // Get current artist count
        const currentArtists = await getAggregatedArtists(session.user.id);
        const currentCount = currentArtists.length;

        // Aggregate from remaining services
        const newArtists = aggregateArtists(profiles);
        await saveAggregatedArtists(session.user.id, newArtists);
        
        artistsRemoved = Math.max(0, currentCount - newArtists.length);
      }
    }

    return NextResponse.json({ 
      success: true, 
      service,
      artistsRemoved: removeArtists ? artistsRemoved : 0,
    });
  } catch (error) {
    console.error("Error disconnecting service:", error);
    return NextResponse.json(
      { error: "Failed to disconnect service" },
      { status: 500 }
    );
  }
}
