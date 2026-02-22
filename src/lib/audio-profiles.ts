/**
 * Audio Profile System for V3 Matching Algorithm
 * Computes and caches audio feature profiles for users and artists
 */

import { createClient } from "@supabase/supabase-js";
import {
  getTopTracks,
  getAudioFeaturesForTracks,
  getArtistTopTracks,
  getArtistInfo,
  searchArtist,
  getSpotifyClientToken,
  SpotifyAudioFeatures,
  SpotifyTrack,
} from "./spotify";

// Supabase client with service role for writing artist profiles
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// =============================================================================
// Types
// =============================================================================

export interface UserAudioProfile {
  id: string;
  userId: string;
  avgDanceability: number;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
  avgLiveness: number;
  avgSpeechiness: number;
  energyRange: [number, number];
  tempoRange: [number, number];
  valenceRange: [number, number];
  trackCount: number;
  computedAt: Date;
}

export interface ArtistAudioProfile {
  id: string;
  spotifyId: string;
  artistName: string;
  normalizedName: string;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgDanceability: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
  avgLiveness: number;
  avgSpeechiness: number;
  topTrackId: string | null;
  topTrackName: string | null;
  topTrackPreviewUrl: string | null;
  highlightStartMs: number;
  genres: string[];
  popularity: number;
  computedAt: Date;
}

// =============================================================================
// User Audio Profile
// =============================================================================

/**
 * Compute and save a user's audio profile from their Spotify top tracks
 * Call this during music sync when user connects/refreshes Spotify
 */
export async function computeUserAudioProfile(
  userId: string,
  spotifyAccessToken: string
): Promise<UserAudioProfile | null> {
  try {
    // 1. Get user's top 50 tracks from Spotify (medium term for balanced view)
    const topTracks = await getTopTracks(spotifyAccessToken, "medium_term", 50);
    
    if (topTracks.length === 0) {
      console.warn(`No top tracks found for user ${userId}`);
      return null;
    }
    
    // 2. Fetch audio features for all tracks
    const trackIds = topTracks.map(t => t.id);
    const audioFeatures = await getAudioFeaturesForTracks(trackIds, spotifyAccessToken);
    
    if (audioFeatures.length === 0) {
      console.warn(`No audio features found for user ${userId}'s tracks`);
      return null;
    }
    
    // 3. Calculate averages and ranges
    const profile = calculateAverageFeatures(audioFeatures);
    
    // 4. Save to user_audio_profiles table (upsert)
    const { data, error } = await supabase
      .from("user_audio_profiles")
      .upsert({
        user_id: userId,
        avg_danceability: profile.avgDanceability,
        avg_energy: profile.avgEnergy,
        avg_valence: profile.avgValence,
        avg_tempo: profile.avgTempo,
        avg_acousticness: profile.avgAcousticness,
        avg_instrumentalness: profile.avgInstrumentalness,
        avg_liveness: profile.avgLiveness,
        avg_speechiness: profile.avgSpeechiness,
        energy_range: profile.energyRange,
        tempo_range: profile.tempoRange,
        valence_range: profile.valenceRange,
        track_count: audioFeatures.length,
        computed_at: new Date().toISOString(),
      }, {
        onConflict: "user_id",
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error saving user audio profile:", error);
      return null;
    }
    
    console.log(`Computed audio profile for user ${userId} from ${audioFeatures.length} tracks`);
    
    return {
      id: data.id,
      userId: data.user_id,
      avgDanceability: data.avg_danceability,
      avgEnergy: data.avg_energy,
      avgValence: data.avg_valence,
      avgTempo: data.avg_tempo,
      avgAcousticness: data.avg_acousticness,
      avgInstrumentalness: data.avg_instrumentalness,
      avgLiveness: data.avg_liveness,
      avgSpeechiness: data.avg_speechiness,
      energyRange: data.energy_range,
      tempoRange: data.tempo_range,
      valenceRange: data.valence_range,
      trackCount: data.track_count,
      computedAt: new Date(data.computed_at),
    };
  } catch (error) {
    console.error(`Error computing audio profile for user ${userId}:`, error);
    return null;
  }
}

/**
 * Get a user's cached audio profile
 */
export async function getUserAudioProfile(userId: string): Promise<UserAudioProfile | null> {
  const { data, error } = await supabase
    .from("user_audio_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    avgDanceability: data.avg_danceability,
    avgEnergy: data.avg_energy,
    avgValence: data.avg_valence,
    avgTempo: data.avg_tempo,
    avgAcousticness: data.avg_acousticness,
    avgInstrumentalness: data.avg_instrumentalness,
    avgLiveness: data.avg_liveness,
    avgSpeechiness: data.avg_speechiness,
    energyRange: data.energy_range,
    tempoRange: data.tempo_range,
    valenceRange: data.valence_range,
    trackCount: data.track_count,
    computedAt: new Date(data.computed_at),
  };
}

// =============================================================================
// Artist Audio Profile
// =============================================================================

const CACHE_FRESHNESS_DAYS = 7;

/**
 * Get or compute an artist's audio profile
 * Checks cache first, computes if stale or missing
 */
export async function getOrComputeArtistProfile(
  artistName: string
): Promise<ArtistAudioProfile | null> {
  const normalizedName = normalizeArtistName(artistName);
  
  // 1. Check cache
  const cached = await getCachedArtistProfile(normalizedName);
  
  if (cached) {
    // 2. Check if fresh (< 7 days)
    const ageMs = Date.now() - cached.computedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays < CACHE_FRESHNESS_DAYS) {
      return cached;
    }
  }
  
  // 3. Compute new profile
  return computeArtistProfile(artistName);
}

/**
 * Get cached artist profile by normalized name
 */
async function getCachedArtistProfile(normalizedName: string): Promise<ArtistAudioProfile | null> {
  const { data, error } = await supabase
    .from("artist_audio_profiles")
    .select("*")
    .eq("normalized_name", normalizedName)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return mapArtistProfileFromDb(data);
}

/**
 * Compute and cache an artist's audio profile from Spotify
 */
async function computeArtistProfile(artistName: string): Promise<ArtistAudioProfile | null> {
  try {
    // 1. Get client credentials token
    const token = await getSpotifyClientToken();
    if (!token) {
      console.error("Could not get Spotify client token");
      return null;
    }
    
    // 2. Search for artist on Spotify
    const artist = await searchArtist(artistName);
    if (!artist) {
      console.warn(`Artist not found on Spotify: ${artistName}`);
      return null;
    }
    
    // 3. Get artist's top tracks
    const topTracks = await getArtistTopTracks(artist.id, token);
    if (topTracks.length === 0) {
      console.warn(`No top tracks found for artist: ${artistName}`);
      return null;
    }
    
    // 4. Get audio features for top tracks
    const trackIds = topTracks.map(t => t.id);
    const audioFeatures = await getAudioFeaturesForTracks(trackIds, token);
    
    if (audioFeatures.length === 0) {
      console.warn(`No audio features found for artist: ${artistName}`);
      return null;
    }
    
    // 5. Calculate averages
    const avgFeatures = calculateAverageFeatures(audioFeatures);
    
    // 6. Find best preview track (first one with preview URL)
    const previewTrack = findBestPreviewTrack(topTracks);
    
    // 7. Get full artist info for genres and popularity
    const artistInfo = await getArtistInfo(artist.id, token);
    
    // 8. Cache in database
    const normalizedName = normalizeArtistName(artistName);
    
    const { data, error } = await supabase
      .from("artist_audio_profiles")
      .upsert({
        spotify_id: artist.id,
        artist_name: artist.name,
        normalized_name: normalizedName,
        avg_energy: avgFeatures.avgEnergy,
        avg_valence: avgFeatures.avgValence,
        avg_tempo: avgFeatures.avgTempo,
        avg_danceability: avgFeatures.avgDanceability,
        avg_acousticness: avgFeatures.avgAcousticness,
        avg_instrumentalness: avgFeatures.avgInstrumentalness,
        avg_liveness: avgFeatures.avgLiveness,
        avg_speechiness: avgFeatures.avgSpeechiness,
        top_track_id: previewTrack?.id || null,
        top_track_name: previewTrack?.name || null,
        top_track_preview_url: previewTrack?.preview_url || null,
        highlight_start_ms: 30000, // Default: skip first 30s
        genres: artistInfo?.genres || [],
        popularity: artistInfo?.popularity || 0,
        computed_at: new Date().toISOString(),
      }, {
        onConflict: "spotify_id",
      })
      .select()
      .single();
    
    if (error) {
      console.error(`Error caching artist profile for ${artistName}:`, error);
      return null;
    }
    
    console.log(`Computed audio profile for artist: ${artist.name}`);
    
    return mapArtistProfileFromDb(data);
  } catch (error) {
    console.error(`Error computing artist profile for ${artistName}:`, error);
    return null;
  }
}

/**
 * Batch get or compute artist profiles for multiple artists
 * More efficient than calling getOrComputeArtistProfile individually
 */
export async function getOrComputeArtistProfiles(
  artistNames: string[]
): Promise<Map<string, ArtistAudioProfile>> {
  const results = new Map<string, ArtistAudioProfile>();
  const toCompute: string[] = [];
  
  // Normalize all names
  const normalizedNames = artistNames.map(name => ({
    original: name,
    normalized: normalizeArtistName(name),
  }));
  
  // Check cache for all artists at once
  const { data: cached } = await supabase
    .from("artist_audio_profiles")
    .select("*")
    .in("normalized_name", normalizedNames.map(n => n.normalized));
  
  const cachedMap = new Map(
    (cached || []).map(row => [row.normalized_name, row])
  );
  
  const now = Date.now();
  
  for (const { original, normalized } of normalizedNames) {
    const cachedProfile = cachedMap.get(normalized);
    
    if (cachedProfile) {
      const ageMs = now - new Date(cachedProfile.computed_at).getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      
      if (ageDays < CACHE_FRESHNESS_DAYS) {
        results.set(normalized, mapArtistProfileFromDb(cachedProfile));
        continue;
      }
    }
    
    toCompute.push(original);
  }
  
  // Compute missing profiles (rate-limited)
  const batchSize = 3; // Be gentle with Spotify API
  for (let i = 0; i < toCompute.length; i += batchSize) {
    const batch = toCompute.slice(i, i + batchSize);
    const computed = await Promise.all(
      batch.map(name => computeArtistProfile(name))
    );
    
    for (let j = 0; j < batch.length; j++) {
      const profile = computed[j];
      if (profile) {
        results.set(profile.normalizedName, profile);
      }
    }
    
    // Rate limit delay
    if (i + batchSize < toCompute.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return results;
}

// =============================================================================
// Audio Similarity (for scoring)
// =============================================================================

/**
 * Calculate audio DNA similarity between a user and artist profile
 * Returns a score from 0 to 1
 */
export function calculateAudioSimilarity(
  userProfile: UserAudioProfile,
  artistProfile: ArtistAudioProfile
): number {
  // Feature weights (based on importance for live concert experience)
  const weights = {
    energy: 0.25,      // Most important for concert vibe
    tempo: 0.20,       // BPM preference matters
    valence: 0.15,     // Emotional tone
    danceability: 0.15,
    acousticness: 0.10,
    liveness: 0.10,
    instrumentalness: 0.05,
  };
  
  let similarityScore = 0;
  
  // Energy similarity (check if artist is within user's range)
  const energySim = calculateFeatureSimilarity(
    artistProfile.avgEnergy,
    userProfile.avgEnergy,
    userProfile.energyRange
  );
  similarityScore += energySim * weights.energy;
  
  // Tempo similarity (normalized to 0-1 scale, typical range 60-180 BPM)
  const normalizedUserTempo = (userProfile.avgTempo - 60) / 120;
  const normalizedArtistTempo = (artistProfile.avgTempo - 60) / 120;
  const tempoSim = 1 - Math.abs(normalizedUserTempo - normalizedArtistTempo);
  similarityScore += Math.max(0, tempoSim) * weights.tempo;
  
  // Valence similarity
  const valenceSim = calculateFeatureSimilarity(
    artistProfile.avgValence,
    userProfile.avgValence,
    userProfile.valenceRange
  );
  similarityScore += valenceSim * weights.valence;
  
  // Danceability similarity
  const danceSim = 1 - Math.abs(userProfile.avgDanceability - artistProfile.avgDanceability);
  similarityScore += danceSim * weights.danceability;
  
  // Acousticness similarity
  const acousticSim = 1 - Math.abs(userProfile.avgAcousticness - artistProfile.avgAcousticness);
  similarityScore += acousticSim * weights.acousticness;
  
  // Liveness similarity
  const livenessSim = 1 - Math.abs(userProfile.avgLiveness - artistProfile.avgLiveness);
  similarityScore += livenessSim * weights.liveness;
  
  // Instrumentalness similarity
  const instrSim = 1 - Math.abs(userProfile.avgInstrumentalness - artistProfile.avgInstrumentalness);
  similarityScore += instrSim * weights.instrumentalness;
  
  return Math.min(1, Math.max(0, similarityScore));
}

/**
 * Calculate similarity for a single feature, considering user's range
 */
function calculateFeatureSimilarity(
  artistValue: number,
  userAvg: number,
  userRange: [number, number] | null
): number {
  if (!userRange) {
    // No range data, use simple distance
    return 1 - Math.abs(userAvg - artistValue);
  }
  
  const [min, max] = userRange;
  
  // If artist is within user's range, high similarity
  if (artistValue >= min && artistValue <= max) {
    return 1;
  }
  
  // Distance from range edges
  const distanceFromRange = artistValue < min
    ? min - artistValue
    : artistValue - max;
  
  // Penalize based on distance (0.5 distance = 50% similarity)
  return Math.max(0, 1 - distanceFromRange * 2);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize artist name for consistent matching
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Calculate average features from an array of audio features
 */
function calculateAverageFeatures(features: SpotifyAudioFeatures[]): {
  avgDanceability: number;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgAcousticness: number;
  avgInstrumentalness: number;
  avgLiveness: number;
  avgSpeechiness: number;
  energyRange: [number, number];
  tempoRange: [number, number];
  valenceRange: [number, number];
} {
  const count = features.length;
  
  const sums = {
    danceability: 0,
    energy: 0,
    valence: 0,
    tempo: 0,
    acousticness: 0,
    instrumentalness: 0,
    liveness: 0,
    speechiness: 0,
  };
  
  const ranges = {
    energy: { min: 1, max: 0 },
    tempo: { min: 300, max: 0 },
    valence: { min: 1, max: 0 },
  };
  
  for (const f of features) {
    sums.danceability += f.danceability;
    sums.energy += f.energy;
    sums.valence += f.valence;
    sums.tempo += f.tempo;
    sums.acousticness += f.acousticness;
    sums.instrumentalness += f.instrumentalness;
    sums.liveness += f.liveness;
    sums.speechiness += f.speechiness;
    
    // Track ranges
    ranges.energy.min = Math.min(ranges.energy.min, f.energy);
    ranges.energy.max = Math.max(ranges.energy.max, f.energy);
    ranges.tempo.min = Math.min(ranges.tempo.min, f.tempo);
    ranges.tempo.max = Math.max(ranges.tempo.max, f.tempo);
    ranges.valence.min = Math.min(ranges.valence.min, f.valence);
    ranges.valence.max = Math.max(ranges.valence.max, f.valence);
  }
  
  return {
    avgDanceability: sums.danceability / count,
    avgEnergy: sums.energy / count,
    avgValence: sums.valence / count,
    avgTempo: sums.tempo / count,
    avgAcousticness: sums.acousticness / count,
    avgInstrumentalness: sums.instrumentalness / count,
    avgLiveness: sums.liveness / count,
    avgSpeechiness: sums.speechiness / count,
    energyRange: [ranges.energy.min, ranges.energy.max],
    tempoRange: [ranges.tempo.min, ranges.tempo.max],
    valenceRange: [ranges.valence.min, ranges.valence.max],
  };
}

/**
 * Find the best track for previewing (has preview URL, preferably most popular)
 */
function findBestPreviewTrack(tracks: SpotifyTrack[]): SpotifyTrack | null {
  // Prefer tracks with preview URLs, sorted by their original order (most popular first)
  for (const track of tracks) {
    if (track.preview_url) {
      return track;
    }
  }
  // No tracks with previews
  return tracks[0] || null;
}

/**
 * Map database row to ArtistAudioProfile
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapArtistProfileFromDb(row: any): ArtistAudioProfile {
  return {
    id: row.id,
    spotifyId: row.spotify_id,
    artistName: row.artist_name,
    normalizedName: row.normalized_name,
    avgEnergy: row.avg_energy,
    avgValence: row.avg_valence,
    avgTempo: row.avg_tempo,
    avgDanceability: row.avg_danceability,
    avgAcousticness: row.avg_acousticness,
    avgInstrumentalness: row.avg_instrumentalness || 0,
    avgLiveness: row.avg_liveness || 0,
    avgSpeechiness: row.avg_speechiness || 0,
    topTrackId: row.top_track_id,
    topTrackName: row.top_track_name,
    topTrackPreviewUrl: row.top_track_preview_url,
    highlightStartMs: row.highlight_start_ms || 30000,
    genres: row.genres || [],
    popularity: row.popularity || 0,
    computedAt: new Date(row.computed_at),
  };
}
