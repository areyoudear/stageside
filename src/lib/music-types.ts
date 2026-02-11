/**
 * Shared types for music service integrations
 */

/**
 * Supported music services
 */
export type MusicServiceType =
  | "spotify"
  | "apple_music"
  | "youtube_music"
  | "tidal"
  | "deezer";

/**
 * Music service connection stored in database
 */
export interface MusicConnection {
  id: string;
  user_id: string;
  service: MusicServiceType;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  service_user_id: string | null;
  service_username: string | null;
  is_active: boolean;
  error: string | null;
  connected_at: string;
  last_synced: string | null;
}

/**
 * Artist from any music service (normalized)
 */
export interface NormalizedArtist {
  id: string;
  name: string;
  genres: string[];
  popularity?: number;
  image_url?: string;
  source: MusicServiceType;
}

/**
 * Aggregated artist from multiple services
 */
export interface AggregatedArtist {
  name: string;
  normalizedName: string;
  score: number;
  genres: string[];
  sources: MusicServiceType[];
  image_url?: string;
  sourceIds: Partial<Record<MusicServiceType, string>>;
}

/**
 * Unified music profile combining all services
 */
export interface UserMusicProfile {
  topArtists: AggregatedArtist[];
  topGenres: string[];
  recentArtistNames: string[];
  connectedServices: MusicServiceType[];
  lastUpdated: string;
}

/**
 * Artist stored in user_artists table
 */
export interface StoredArtist {
  id: string;
  user_id: string;
  artist_name: string;
  normalized_name: string;
  source_services: MusicServiceType[];
  aggregated_score: number;
  genres: string[];
  image_url: string | null;
  source_ids: Partial<Record<MusicServiceType, string>>;
  created_at: string;
  updated_at: string;
}

/**
 * Music profile sync status
 */
export interface SyncStatus {
  service: MusicServiceType;
  status: "syncing" | "synced" | "error" | "pending";
  lastSynced: string | null;
  error?: string;
  artistCount?: number;
}

/**
 * Service-specific tokens stored in connection
 */
export interface ServiceTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  // Apple Music specific
  musicUserToken?: string;
  developerToken?: string;
}

/**
 * OAuth callback result
 */
export interface OAuthResult {
  success: boolean;
  service: MusicServiceType;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  userId?: string;
  username?: string;
}

/**
 * Music profile fetch result
 */
export interface MusicProfileResult {
  service: MusicServiceType;
  artists: NormalizedArtist[];
  genres: string[];
  recentArtists: string[];
  stats?: Record<string, number>;
  error?: string;
}
