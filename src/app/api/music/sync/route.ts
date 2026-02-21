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
 * Note: Even when syncing a specific service, we re-aggregate from ALL services
 * to preserve artists from other connected services.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const specificService = body.service as MusicServiceType | undefined;

    // Always get ALL connections to preserve data from all services
    const allConnections = await getMusicConnections(session.user.id);
    const activeConnections = allConnections.filter(
      (c) => c.is_active && c.access_token
    );

    if (activeConnections.length === 0) {
      return NextResponse.json(
        { error: "No active music service connections" },
        { status: 400 }
      );
    }

    // Determine which services to sync (specific one or all)
    const servicesToSync = specificService
      ? activeConnections.filter((c) => c.service === specificService)
      : activeConnections;

    if (specificService && servicesToSync.length === 0) {
      return NextResponse.json(
        { error: `Service ${specificService} is not connected or active` },
        { status: 400 }
      );
    }

    // Fetch profiles from each service that needs syncing
    const profiles: ServiceProfile[] = [];
    const errors: Array<{ service: string; error: string }> = [];
    const syncedServices: string[] = [];

    for (const connection of servicesToSync) {
      try {
        const profile = await fetchServiceProfile(
          connection.service as MusicService,
          connection.access_token
        );

        if (profile) {
          profiles.push(profile);
          syncedServices.push(connection.service);
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

    // If syncing specific service, also fetch from other services to preserve their artists
    if (specificService) {
      const otherConnections = activeConnections.filter(
        (c) => c.service !== specificService && !errors.some((e) => e.service === c.service)
      );

      for (const connection of otherConnections) {
        try {
          const profile = await fetchServiceProfile(
            connection.service as MusicService,
            connection.access_token
          );

          if (profile) {
            profiles.push(profile);
          }
        } catch (error) {
          // Don't fail for other services, just skip them
          console.warn(`Skipping ${connection.service} during partial sync:`, error);
        }
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

    // Aggregate artists from ALL profiles (including preserved ones)
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
      syncedServices, // Only services that were actually synced this request
      totalServices: profiles.map((p) => p.service), // All services included in aggregation
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
