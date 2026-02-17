import { NextRequest, NextResponse } from "next/server";
import { upsertMusicConnection, saveMusicProfile, saveRelatedArtists } from "@/lib/supabase";
import { getUserMusicProfile as getSpotifyMusicProfile, SpotifyArtist } from "@/lib/spotify";
import { getUserMusicProfile as getYouTubeMusicProfile } from "@/lib/youtube-music";
import { MusicServiceType } from "@/lib/music-types";

// Token endpoint configurations
const TOKEN_CONFIGS: Record<
  string,
  {
    tokenUrl: string;
    clientIdEnv: string;
    clientSecretEnv: string;
  }
> = {
  spotify: {
    tokenUrl: "https://accounts.spotify.com/api/token",
    clientIdEnv: "SPOTIFY_CLIENT_ID",
    clientSecretEnv: "SPOTIFY_CLIENT_SECRET",
  },
  youtube_music: {
    tokenUrl: "https://oauth2.googleapis.com/token",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
};

/**
 * GET /api/music/connect/[service]/callback
 * Handle OAuth callback from music service
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const { service } = await params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      console.error(`OAuth error for ${service}:`, error);
      return NextResponse.redirect(
        new URL(`/dashboard?error=oauth_${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_params", request.url)
      );
    }

    // Decode state
    let stateData: { userId: string; callbackUrl: string; timestamp: number };
    try {
      stateData = JSON.parse(Buffer.from(state, "base64").toString());
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard?error=invalid_state", request.url)
      );
    }

    // Validate timestamp (5 minute expiry)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/dashboard?error=state_expired", request.url)
      );
    }

    const config = TOKEN_CONFIGS[service];
    if (!config) {
      return NextResponse.redirect(
        new URL("/dashboard?error=unsupported_service", request.url)
      );
    }

    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/dashboard?error=service_not_configured", request.url)
      );
    }

    // Build redirect URI
    const baseUrl = process.env.NEXTAUTH_URL || `https://${request.headers.get("host")}`;
    const redirectUri = `${baseUrl}/api/music/connect/${service}/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(config.tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(service === "spotify"
          ? {
              Authorization: `Basic ${Buffer.from(
                `${clientId}:${clientSecret}`
              ).toString("base64")}`,
            }
          : {}),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        ...(service !== "spotify" ? { client_id: clientId, client_secret: clientSecret } : {}),
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`Token exchange failed for ${service}:`, errorText);
      return NextResponse.redirect(
        new URL("/dashboard?error=token_exchange_failed", request.url)
      );
    }

    const tokens = await tokenResponse.json();

    // Get user info from service
    let serviceUserId: string | null = null;
    let serviceUsername: string | null = null;

    if (service === "spotify") {
      try {
        const meResponse = await fetch("https://api.spotify.com/v1/me", {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (meResponse.ok) {
          const meData = await meResponse.json();
          serviceUserId = meData.id;
          serviceUsername = meData.display_name || meData.id;
        }
      } catch (e) {
        console.error("Error fetching Spotify user info:", e);
      }
    } else if (service === "youtube_music") {
      try {
        // Fetch Google user info
        const userInfoResponse = await fetch(
          "https://www.googleapis.com/oauth2/v2/userinfo",
          { headers: { Authorization: `Bearer ${tokens.access_token}` } }
        );
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          serviceUserId = userInfo.id;
          serviceUsername = userInfo.name || userInfo.email;
        }
      } catch (e) {
        console.error("Error fetching YouTube/Google user info:", e);
      }
    }

    // Save connection to database
    await upsertMusicConnection(stateData.userId, service as MusicServiceType, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      token_expires_at: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      service_user_id: serviceUserId,
      service_username: serviceUsername,
    });

    // Fetch and store music profile async
    if (tokens.access_token) {
      if (service === "spotify") {
        fetchAndStoreSpotifyProfile(tokens.access_token, stateData.userId).catch(console.error);
      } else if (service === "youtube_music") {
        fetchAndStoreYouTubeMusicProfile(tokens.access_token, stateData.userId).catch(console.error);
      }
    }

    // Redirect to callback URL
    const redirectUrl = new URL(stateData.callbackUrl, request.url);
    redirectUrl.searchParams.set("connected", service);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in music service OAuth callback:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=callback_failed", request.url)
    );
  }
}

/**
 * Fetch user's music profile from Spotify and store in Supabase
 */
async function fetchAndStoreSpotifyProfile(
  accessToken: string,
  userId: string
): Promise<void> {
  try {
    const profile = await getSpotifyMusicProfile(accessToken);

    // Transform to storage format
    const topArtists = profile.topArtists.slice(0, 50).map((artist: SpotifyArtist) => ({
      id: artist.id,
      name: artist.name,
      genres: artist.genres,
      popularity: artist.popularity,
      image_url: artist.images[0]?.url,
    }));

    // Save profile and related artists in parallel
    await Promise.all([
      saveMusicProfile(userId, topArtists, profile.topGenres),
      profile.relatedArtists && profile.relatedArtists.length > 0
        ? saveRelatedArtists(userId, profile.relatedArtists)
        : Promise.resolve(),
    ]);

    console.log(`Spotify music profile saved for user ${userId}`);
  } catch (error) {
    console.error("Error fetching/storing Spotify music profile:", error);
  }
}

/**
 * Fetch user's music profile from YouTube Music and store in Supabase
 */
async function fetchAndStoreYouTubeMusicProfile(
  accessToken: string,
  userId: string
): Promise<void> {
  try {
    const profile = await getYouTubeMusicProfile(accessToken);

    // Transform to storage format (YouTube Music returns simpler artist data)
    const topArtists = profile.topArtists.slice(0, 50).map((artist) => ({
      id: artist.id || `yt_${artist.name.toLowerCase().replace(/\s+/g, '_')}`,
      name: artist.name,
      genres: artist.genres || [],
      popularity: artist.popularity || 0,
      image_url: undefined, // YouTube Music doesn't provide artist images directly
    }));

    // Save profile (YouTube Music doesn't have related artists API like Spotify)
    await saveMusicProfile(userId, topArtists, profile.topGenres);

    console.log(`YouTube Music profile saved for user ${userId} (${profile.stats?.likedMusicVideos || 0} music videos analyzed)`);
  } catch (error) {
    console.error("Error fetching/storing YouTube Music profile:", error);
  }
}
