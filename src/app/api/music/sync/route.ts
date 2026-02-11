import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getMusicConnections,
  getMusicConnection,
  updateConnectionSyncTime,
  setConnectionError,
  saveAggregatedArtists,
  MusicServiceType,
} from "@/lib/supabase";
import { getUserMusicProfile as getSpotifyProfile } from "@/lib/spotify";
import { getUserMusicProfile as getYouTubeProfile } from "@/lib/youtube-music";
import { getUserMusicProfile as getTidalProfile } from "@/lib/tidal";
import { getUserMusicProfile as getDeezerProfile } from "@/lib/deezer";
import { getUserMusicProfile as getAppleMusicProfile, generateDeveloperToken } from "@/lib/apple-music";
import { aggregateArtists, aggregateGenres, MusicService } from "@/lib/music-aggregator";

interface ServiceProfile {
  service: MusicService;
  artists: Array<{
    name: string;
    id?: string;
    genres?: string[];
    popularity?: number;
    image_url?: string;
  }>;
  genres: string[];
  recentArtists?: string[];
}

/**
 * POST /api/music/sync
 * Sync music profile from all connected services
 *
 * Optional body: { service: "spotify" } to sync only one service
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const specificService = body.service as MusicServiceType | undefined;

    // Get all connections (or specific one)
    let connections;
    if (specificService) {
      const conn = await getMusicConnection(session.user.id, specificService);
      connections = conn ? [conn] : [];
    } else {
      connections = await getMusicConnections(session.user.id);
    }

    const activeConnections = connections.filter(
      (c) => c.is_active && c.access_token
    );

    if (activeConnections.length === 0) {
      return NextResponse.json(
        { error: "No active music service connections" },
        { status: 400 }
      );
    }

    // Fetch profiles from each service
    const profiles: ServiceProfile[] = [];
    const errors: Array<{ service: string; error: string }> = [];

    for (const connection of activeConnections) {
      try {
        const profile = await fetchServiceProfile(
          connection.service as MusicService,
          connection.access_token
        );

        if (profile) {
          profiles.push(profile);
          await updateConnectionSyncTime(connection.id);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error(`Error syncing ${connection.service}:`, errorMessage);
        errors.push({ service: connection.service, error: errorMessage });
        await setConnectionError(connection.id, errorMessage);
      }
    }

    if (profiles.length === 0) {
      return NextResponse.json(
        {
          error: "Failed to sync any service",
          details: errors,
        },
        { status: 500 }
      );
    }

    // Aggregate artists from all profiles
    const aggregatedArtists = aggregateArtists(profiles);

    // Save to database
    await saveAggregatedArtists(session.user.id, aggregatedArtists);

    // Aggregate genres for response
    const genreProfiles = profiles.map((p) => ({
      service: p.service,
      genres: p.genres,
    }));
    const aggregatedGenres = aggregateGenres(genreProfiles);

    return NextResponse.json({
      success: true,
      syncedServices: profiles.map((p) => p.service),
      artistCount: aggregatedArtists.length,
      genreCount: aggregatedGenres.length,
      topArtists: aggregatedArtists.slice(0, 10).map((a) => ({
        name: a.name,
        sources: a.sources,
        score: a.score,
      })),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing music profile:", error);
    return NextResponse.json(
      { error: "Failed to sync music profile" },
      { status: 500 }
    );
  }
}

/**
 * Fetch profile from a specific service
 */
async function fetchServiceProfile(
  service: MusicService,
  accessToken: string
): Promise<ServiceProfile | null> {
  switch (service) {
    case "spotify": {
      const profile = await getSpotifyProfile(accessToken);
      return {
        service: "spotify",
        artists: profile.topArtists.map((a) => ({
          name: a.name,
          id: a.id,
          genres: a.genres,
          popularity: a.popularity,
          image_url: a.images?.[0]?.url,
        })),
        genres: profile.topGenres,
        recentArtists: profile.recentArtistNames,
      };
    }

    case "youtube_music": {
      const profile = await getYouTubeProfile(accessToken);
      return {
        service: "youtube_music",
        artists: profile.topArtists.map((a) => ({
          name: a.name,
          id: a.id,
          genres: [],
          popularity: a.popularity,
        })),
        genres: profile.topGenres,
        recentArtists: profile.recentArtistNames,
      };
    }

    case "tidal": {
      const profile = await getTidalProfile(accessToken);
      return {
        service: "tidal",
        artists: profile.topArtists.map((a) => ({
          name: a.name,
          id: a.id,
          genres: a.genres || [],
          image_url: a.picture || undefined,
        })),
        genres: profile.topGenres,
        recentArtists: profile.recentArtistNames,
      };
    }

    case "deezer": {
      const profile = await getDeezerProfile(accessToken);
      return {
        service: "deezer",
        artists: profile.topArtists.map((a) => ({
          name: a.name,
          id: a.id,
          genres: a.genres || [],
          popularity: a.popularity,
          image_url: a.image_url,
        })),
        genres: profile.topGenres,
        recentArtists: profile.recentArtistNames,
      };
    }

    case "apple_music": {
      // Apple Music requires both developer token and user token
      const developerToken = await generateDeveloperToken();
      const profile = await getAppleMusicProfile(developerToken, accessToken);
      return {
        service: "apple_music",
        artists: profile.topArtists.map((a) => ({
          name: a.name,
          id: a.id,
          genres: a.genres,
          image_url: a.artwork?.url,
        })),
        genres: profile.topGenres,
        recentArtists: profile.recentArtistNames,
      };
    }

    default:
      console.warn(`Unknown service: ${service}`);
      return null;
  }
}

/**
 * GET /api/music/sync
 * Get sync status for all connected services
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const connections = await getMusicConnections(session.user.id);

    const status = connections.map((conn) => ({
      service: conn.service,
      isActive: conn.is_active,
      lastSynced: conn.last_synced,
      error: conn.error,
      username: conn.service_username,
    }));

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error getting sync status:", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 }
    );
  }
}
