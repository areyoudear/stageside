import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  MusicConnection,
  MusicServiceType,
  AggregatedArtist,
  StoredArtist,
} from "./music-types";

// Types for our database tables
export interface User {
  id: string;
  spotify_id: string | null;
  email: string | null;
  display_name: string | null;
  default_location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  } | null;
  notification_preferences: {
    email_weekly: boolean;
    email_instant: boolean;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface MusicProfile {
  id: string;
  user_id: string;
  top_artists: {
    id: string;
    name: string;
    genres: string[];
    popularity: number;
    image_url?: string;
  }[];
  top_genres: string[];
  last_synced: string;
}

// Re-export music types for convenience
export type { MusicConnection, MusicServiceType, StoredArtist };

export interface SavedConcert {
  id: string;
  user_id: string;
  concert_id: string;
  created_at: string;
}

export interface EmailSubscription {
  id: string;
  user_id: string | null;
  email: string;
  frequency: "weekly" | "daily" | "none";
  location: {
    lat: number;
    lng: number;
    city: string;
  } | null;
  is_active: boolean;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, "public", any>;

// Create Supabase client for client-side usage (lazy initialization)
let _supabaseClient: AnySupabaseClient | null = null;

export function getSupabaseClient(): AnySupabaseClient {
  if (!_supabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error("Supabase URL and anon key are required. Check your environment variables.");
    }
    
    _supabaseClient = createClient(url, key);
  }
  return _supabaseClient;
}

// Alias for backward compatibility
export const supabase = {
  get client() {
    return getSupabaseClient();
  }
};

// Create admin client for server-side operations (uses service role key)
let _adminClient: AnySupabaseClient | null = null;

export function createAdminClient(): AnySupabaseClient {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      throw new Error("Supabase URL and service role key are required for admin operations.");
    }
    
    _adminClient = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _adminClient;
}

// Helper functions for common database operations

/**
 * Get or create user by Spotify ID
 */
export async function upsertUser(
  spotifyId: string,
  email: string | null,
  displayName: string | null
): Promise<User | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("users")
    .upsert(
      {
        spotify_id: spotifyId,
        email,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "spotify_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting user:", error);
    return null;
  }

  return data as User;
}

/**
 * Save or update user's music profile
 */
export async function saveMusicProfile(
  userId: string,
  topArtists: MusicProfile["top_artists"],
  topGenres: string[]
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("music_profiles").upsert(
    {
      user_id: userId,
      top_artists: topArtists,
      top_genres: topGenres,
      last_synced: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    console.error("Error saving music profile:", error);
    return false;
  }

  return true;
}

/**
 * Get user's music profile
 */
export async function getMusicProfile(userId: string): Promise<MusicProfile | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("music_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching music profile:", error);
    return null;
  }

  return data as MusicProfile;
}

/**
 * Subscribe email to notifications
 */
export async function subscribeEmail(
  email: string,
  location?: { lat: number; lng: number; city: string },
  userId?: string
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("email_subscriptions").insert({
    email,
    user_id: userId || null,
    location: location || null,
    frequency: "weekly",
    is_active: true,
  });

  if (error) {
    // Check if it's a duplicate
    if (error.code === "23505") {
      // Already subscribed, that's fine
      return true;
    }
    console.error("Error subscribing email:", error);
    return false;
  }

  return true;
}

/**
 * Save a concert to user's list
 */
export async function saveConcert(userId: string, concertId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient.from("saved_concerts").insert({
    user_id: userId,
    concert_id: concertId,
  });

  if (error) {
    if (error.code === "23505") {
      // Already saved
      return true;
    }
    console.error("Error saving concert:", error);
    return false;
  }

  return true;
}

/**
 * Get user's saved concerts
 */
export async function getSavedConcerts(userId: string): Promise<string[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("saved_concerts")
    .select("concert_id")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching saved concerts:", error);
    return [];
  }

  return (data as { concert_id: string }[]).map((row) => row.concert_id);
}

/**
 * Remove saved concert
 */
export async function unsaveConcert(userId: string, concertId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("saved_concerts")
    .delete()
    .eq("user_id", userId)
    .eq("concert_id", concertId);

  if (error) {
    console.error("Error removing saved concert:", error);
    return false;
  }

  return true;
}

// ============================================
// MUSIC SERVICE CONNECTIONS
// ============================================

/**
 * Get all music service connections for a user
 */
export async function getMusicConnections(userId: string): Promise<MusicConnection[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("user_music_connections")
    .select("*")
    .eq("user_id", userId)
    .order("connected_at", { ascending: false });

  if (error) {
    console.error("Error fetching music connections:", error);
    return [];
  }

  return data as MusicConnection[];
}

/**
 * Get a specific music service connection
 */
export async function getMusicConnection(
  userId: string,
  service: MusicServiceType
): Promise<MusicConnection | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("user_music_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("service", service)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // Not found
    console.error("Error fetching music connection:", error);
    return null;
  }

  return data as MusicConnection;
}

/**
 * Create or update a music service connection
 */
export async function upsertMusicConnection(
  userId: string,
  service: MusicServiceType,
  data: {
    access_token: string;
    refresh_token?: string | null;
    token_expires_at?: string | null;
    service_user_id?: string | null;
    service_username?: string | null;
  }
): Promise<MusicConnection | null> {
  const adminClient = createAdminClient();

  const { data: result, error } = await adminClient
    .from("user_music_connections")
    .upsert(
      {
        user_id: userId,
        service,
        access_token: data.access_token,
        refresh_token: data.refresh_token || null,
        token_expires_at: data.token_expires_at || null,
        service_user_id: data.service_user_id || null,
        service_username: data.service_username || null,
        is_active: true,
        error: null,
        connected_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id,service",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error upserting music connection:", error);
    return null;
  }

  return result as MusicConnection;
}

/**
 * Update connection tokens (for refresh)
 */
export async function updateConnectionTokens(
  connectionId: string,
  tokens: {
    access_token: string;
    refresh_token?: string;
    token_expires_at?: string;
  }
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_music_connections")
    .update({
      access_token: tokens.access_token,
      ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      ...(tokens.token_expires_at && { token_expires_at: tokens.token_expires_at }),
      error: null,
    })
    .eq("id", connectionId);

  if (error) {
    console.error("Error updating connection tokens:", error);
    return false;
  }

  return true;
}

/**
 * Mark connection as having an error
 */
export async function setConnectionError(
  connectionId: string,
  errorMessage: string
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_music_connections")
    .update({
      error: errorMessage,
      is_active: false,
    })
    .eq("id", connectionId);

  if (error) {
    console.error("Error setting connection error:", error);
    return false;
  }

  return true;
}

/**
 * Update last synced timestamp
 */
export async function updateConnectionSyncTime(connectionId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_music_connections")
    .update({
      last_synced: new Date().toISOString(),
      error: null,
    })
    .eq("id", connectionId);

  if (error) {
    console.error("Error updating sync time:", error);
    return false;
  }

  return true;
}

/**
 * Disconnect (soft delete) a music service
 */
export async function disconnectMusicService(
  userId: string,
  service: MusicServiceType
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_music_connections")
    .update({
      is_active: false,
      access_token: "", // Clear sensitive data
      refresh_token: null,
    })
    .eq("user_id", userId)
    .eq("service", service);

  if (error) {
    console.error("Error disconnecting service:", error);
    return false;
  }

  return true;
}

/**
 * Permanently delete a music service connection
 */
export async function deleteMusicConnection(
  userId: string,
  service: MusicServiceType
): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("user_music_connections")
    .delete()
    .eq("user_id", userId)
    .eq("service", service);

  if (error) {
    console.error("Error deleting music connection:", error);
    return false;
  }

  return true;
}

// ============================================
// AGGREGATED USER ARTISTS
// ============================================

/**
 * Save aggregated artists for a user
 * Replaces all existing artist data
 */
export async function saveAggregatedArtists(
  userId: string,
  artists: AggregatedArtist[]
): Promise<boolean> {
  const adminClient = createAdminClient();

  // Delete existing artists for user
  await adminClient.from("user_artists").delete().eq("user_id", userId);

  // Insert new artists
  const artistRows = artists.map((artist) => ({
    user_id: userId,
    artist_name: artist.name,
    normalized_name: artist.normalizedName,
    source_services: artist.sources,
    aggregated_score: artist.score,
    genres: artist.genres,
    image_url: artist.image_url || null,
    source_ids: artist.sourceIds,
    updated_at: new Date().toISOString(),
  }));

  if (artistRows.length === 0) return true;

  const { error } = await adminClient.from("user_artists").insert(artistRows);

  if (error) {
    console.error("Error saving aggregated artists:", error);
    return false;
  }

  return true;
}

/**
 * Get aggregated artists for a user
 */
export async function getAggregatedArtists(userId: string): Promise<StoredArtist[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("user_artists")
    .select("*")
    .eq("user_id", userId)
    .order("aggregated_score", { ascending: false });

  if (error) {
    console.error("Error fetching aggregated artists:", error);
    return [];
  }

  return data as StoredArtist[];
}

/**
 * Get unified music profile (combines stored artists with profile data)
 */
export async function getUnifiedMusicProfile(userId: string): Promise<{
  topArtists: Array<{
    name: string;
    genres: string[];
    sources: MusicServiceType[];
    score: number;
  }>;
  topGenres: string[];
  connectedServices: MusicServiceType[];
} | null> {
  // Get all active connections
  const connections = await getMusicConnections(userId);
  const activeConnections = connections.filter((c) => c.is_active && !c.error);

  if (activeConnections.length === 0) {
    // Fall back to legacy music profile if exists
    const legacyProfile = await getMusicProfile(userId);
    if (legacyProfile) {
      return {
        topArtists: legacyProfile.top_artists.map((a) => ({
          name: a.name,
          genres: a.genres,
          sources: ["spotify" as MusicServiceType],
          score: a.popularity,
        })),
        topGenres: legacyProfile.top_genres,
        connectedServices: ["spotify" as MusicServiceType],
      };
    }
    return null;
  }

  // Get aggregated artists
  const artists = await getAggregatedArtists(userId);

  if (artists.length === 0) {
    return null;
  }

  // Extract top genres from artists
  const genreCount = new Map<string, number>();
  artists.forEach((artist) => {
    artist.genres.forEach((genre) => {
      const normalized = genre.toLowerCase();
      genreCount.set(normalized, (genreCount.get(normalized) || 0) + artist.aggregated_score);
    });
  });

  const topGenres = Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([genre]) => genre);

  return {
    topArtists: artists.map((a) => ({
      name: a.artist_name,
      genres: a.genres,
      sources: a.source_services,
      score: a.aggregated_score,
    })),
    topGenres,
    connectedServices: activeConnections.map((c) => c.service),
  };
}
