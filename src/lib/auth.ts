import { NextAuthOptions } from "next-auth";
import { JWT } from "next-auth/jwt";
import SpotifyProvider from "next-auth/providers/spotify";
import GoogleProvider from "next-auth/providers/google";
import { upsertUser, saveMusicProfile, upsertMusicConnection, saveRelatedArtists } from "./supabase";
import { getUserMusicProfile, SpotifyArtist } from "./spotify";
import { MusicServiceType } from "./music-types";

// Extend the default session types
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: {
      id: string;
      spotifyId?: string;
      provider?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    spotifyId?: string;
    provider?: string;
    userId?: string;
    error?: string;
  }
}

// Spotify scopes we need
const SPOTIFY_SCOPES = [
  "user-read-email",
  "user-top-read",
  "user-read-recently-played",
  "user-follow-read",
].join(" ");

// YouTube scopes for YouTube Music data
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

/**
 * Refresh Spotify access token
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const url = "https://accounts.spotify.com/api/token";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: token.refreshToken || "",
      }),
    });

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    return {
      ...token,
      error: "RefreshAccessTokenError",
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID!,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: SPOTIFY_SCOPES,
        },
      },
    }),
    // Google provider for YouTube Music access
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                scope: YOUTUBE_SCOPES,
                access_type: "offline",
                prompt: "consent",
              },
            },
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        const provider = account.provider;

        // Store user in Supabase
        const dbUser = await upsertUser(
          account.providerAccountId,
          user.email || null,
          user.name || null
        );

        // Store music connection for the provider
        if (dbUser?.id && account.access_token) {
          const serviceType = providerToService(provider);
          if (serviceType) {
            await upsertMusicConnection(dbUser.id, serviceType, {
              access_token: account.access_token,
              refresh_token: account.refresh_token || null,
              token_expires_at: account.expires_at
                ? new Date(account.expires_at * 1000).toISOString()
                : null,
              service_user_id: account.providerAccountId,
              service_username: user.name || null,
            });
          }
        }

        // Fetch and store music profile (async, don't block login)
        if (account.access_token && provider === "spotify") {
          fetchAndStoreMusicProfile(account.access_token, dbUser?.id).catch(
            console.error
          );
        }

        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : 0,
          spotifyId: provider === "spotify" ? account.providerAccountId : token.spotifyId,
          provider,
          userId: dbUser?.id,
        };
      }

      // Return previous token if not expired
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token;
      }

      // Access token expired, refresh it
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.id = token.userId as string;
      session.user.spotifyId = token.spotifyId as string;
      session.user.provider = token.provider as string;
      return session;
    },
  },

  pages: {
    signIn: "/",
    error: "/",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === "development",
};

/**
 * Map NextAuth provider name to our music service type
 */
function providerToService(provider: string): MusicServiceType | null {
  const mapping: Record<string, MusicServiceType> = {
    spotify: "spotify",
    google: "youtube_music",
    apple: "apple_music",
    tidal: "tidal",
    deezer: "deezer",
  };
  return mapping[provider] || null;
}

/**
 * Fetch user's music profile from Spotify and store in Supabase
 */
async function fetchAndStoreMusicProfile(
  accessToken: string,
  userId?: string
): Promise<void> {
  if (!userId) return;

  try {
    const profile = await getUserMusicProfile(accessToken);

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
      // Save related artists for better matching
      profile.relatedArtists && profile.relatedArtists.length > 0
        ? saveRelatedArtists(userId, profile.relatedArtists)
        : Promise.resolve(),
    ]);

    console.log(`Music profile saved for user ${userId} (${profile.relatedArtists?.length || 0} related artists)`);
  } catch (error) {
    console.error("Error fetching/storing music profile:", error);
  }
}
