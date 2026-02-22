/**
 * User Embedding Builder
 * 
 * Unified construction of user taste embeddings from:
 * - Manual onboarding (artists + sliders + cultural prefs)
 * - Spotify sync (top artists + recently played)
 * 
 * Both flows produce identical vector format for consistency.
 * 
 * Core formula:
 *   core = w1 * avg(artist_vectors) + w2 * slider_offsets + w3 * cultural_vectors
 * 
 * Weights:
 *   - Artists: 0.7 (primary signal)
 *   - Sliders: 0.2 (preference bias)
 *   - Cultural: 0.1 (accent)
 */

import { createClient } from '@supabase/supabase-js';
import { 
  EmbeddingVector, 
  OnboardingType,
  OnboardingSliderValues,
  OnboardingData,
  UserTasteEmbedding,
  EMBEDDING_DIMENSIONS 
} from './types';
import { 
  getOrCreateArtistEmbedding, 
  RawArtistData 
} from './artist-embeddings';
import { 
  weightedAverageVectors, 
  averageVectors,
  normalizeVector,
  zeroVector,
  addVectors,
  scaleVector 
} from './embedding-service';
import { 
  computeSliderVector, 
  computeCulturalVector,
  initializeAnchorVectors 
} from './anchor-vectors';
import { computeEffectiveEmbedding } from './session-embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Core embedding weights
const WEIGHTS = {
  artists: 0.7,    // Artists drive identity
  sliders: 0.2,    // Sliders bias slightly
  cultural: 0.1,   // Cultural preferences as accent
} as const;

// Spotify weighting config
const SPOTIFY_CONFIG = {
  topArtistDecay: 0.95,      // Decay per rank position
  recentPlayWeight: 0.4,     // Weight for recently played
  recencyDecayDays: 7,       // Days for recency decay
  minArtists: 3,             // Minimum artists for valid embedding
} as const;

/**
 * Input for building user embedding
 */
export interface BuildUserEmbeddingInput {
  userId: string;
  onboardingType: OnboardingType;
  
  // For manual onboarding
  artists?: string[];
  sliderValues?: OnboardingSliderValues;
  culturalPrefs?: string[];
  
  // For Spotify onboarding
  spotifyTopArtists?: SpotifyArtistData[];
  spotifyRecentlyPlayed?: SpotifyTrackData[];
}

export interface SpotifyArtistData {
  id: string;
  name: string;
  genres?: string[];
  popularity?: number;
  images?: { url: string }[];
}

export interface SpotifyTrackData {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  played_at?: string;
}

/**
 * Result of building user embedding
 */
export interface BuildUserEmbeddingResult {
  success: boolean;
  userId: string;
  onboardingType: OnboardingType;
  coreEmbedding: EmbeddingVector;
  embeddingVersion: number;
  artistCount: number;
  error?: string;
}

/**
 * Compute artist component of embedding
 */
async function computeArtistComponent(
  artistNames: string[]
): Promise<{ embedding: EmbeddingVector | null; count: number }> {
  if (!artistNames || artistNames.length === 0) {
    return { embedding: null, count: 0 };
  }
  
  const artistEmbeddings: EmbeddingVector[] = [];
  
  for (const artistName of artistNames) {
    try {
      const artistEmb = await getOrCreateArtistEmbedding({ name: artistName });
      if (artistEmb.embedding) {
        artistEmbeddings.push(artistEmb.embedding);
      }
    } catch (error) {
      console.error(`Error getting embedding for ${artistName}:`, error);
    }
  }
  
  if (artistEmbeddings.length === 0) {
    return { embedding: null, count: 0 };
  }
  
  return {
    embedding: averageVectors(artistEmbeddings),
    count: artistEmbeddings.length,
  };
}

/**
 * Compute artist component from Spotify data with weighting
 */
async function computeSpotifyArtistComponent(
  topArtists: SpotifyArtistData[],
  recentlyPlayed?: SpotifyTrackData[]
): Promise<{ embedding: EmbeddingVector | null; count: number }> {
  const artistEmbeddings: Array<{ embedding: EmbeddingVector; weight: number }> = [];
  const processedArtists = new Set<string>();
  
  // Process top artists with rank decay
  for (let i = 0; i < topArtists.length; i++) {
    const artist = topArtists[i];
    const normalizedName = artist.name.toLowerCase().trim();
    
    if (processedArtists.has(normalizedName)) continue;
    processedArtists.add(normalizedName);
    
    try {
      const artistEmb = await getOrCreateArtistEmbedding({
        name: artist.name,
        spotifyId: artist.id,
        genres: artist.genres,
        popularity: artist.popularity,
      });
      
      if (artistEmb.embedding) {
        // Weight by rank: 1.0, 0.95, 0.9, ... (exponential decay)
        const weight = Math.pow(SPOTIFY_CONFIG.topArtistDecay, i);
        artistEmbeddings.push({
          embedding: artistEmb.embedding,
          weight,
        });
      }
    } catch (error) {
      console.error(`Error getting embedding for ${artist.name}:`, error);
    }
  }
  
  // Process recently played with recency decay
  if (recentlyPlayed && recentlyPlayed.length > 0) {
    // Group by artist and count plays
    const artistPlays = new Map<string, { 
      name: string; 
      plays: number; 
      latestPlay: Date 
    }>();
    
    for (const track of recentlyPlayed) {
      for (const artist of track.artists) {
        const normalizedName = artist.name.toLowerCase().trim();
        const playTime = track.played_at ? new Date(track.played_at) : new Date();
        
        const existing = artistPlays.get(normalizedName);
        if (existing) {
          existing.plays++;
          if (playTime > existing.latestPlay) {
            existing.latestPlay = playTime;
          }
        } else {
          artistPlays.set(normalizedName, {
            name: artist.name,
            plays: 1,
            latestPlay: playTime,
          });
        }
      }
    }
    
    // Add recently played artists (not already in top artists)
    for (const [normalizedName, data] of Array.from(artistPlays.entries())) {
      if (processedArtists.has(normalizedName)) continue;
      processedArtists.add(normalizedName);
      
      try {
        const artistEmb = await getOrCreateArtistEmbedding({ name: data.name });
        
        if (artistEmb.embedding) {
          // Weight by play count and recency
          const playWeight = Math.log(data.plays + 1);
          const ageDays = (Date.now() - data.latestPlay.getTime()) / (1000 * 60 * 60 * 24);
          const recencyWeight = Math.exp(-ageDays / SPOTIFY_CONFIG.recencyDecayDays);
          
          const weight = SPOTIFY_CONFIG.recentPlayWeight * playWeight * recencyWeight;
          
          artistEmbeddings.push({
            embedding: artistEmb.embedding,
            weight,
          });
        }
      } catch (error) {
        console.error(`Error getting embedding for ${data.name}:`, error);
      }
    }
  }
  
  if (artistEmbeddings.length === 0) {
    return { embedding: null, count: 0 };
  }
  
  // Weighted average
  const embedding = weightedAverageVectors(
    artistEmbeddings.map(a => a.embedding),
    artistEmbeddings.map(a => a.weight)
  );
  
  return {
    embedding,
    count: artistEmbeddings.length,
  };
}

/**
 * Build user embedding from manual onboarding
 */
async function buildManualEmbedding(
  artists: string[],
  sliderValues?: OnboardingSliderValues,
  culturalPrefs?: string[]
): Promise<EmbeddingVector> {
  const components: Array<{ embedding: EmbeddingVector; weight: number }> = [];
  
  // Artist component (primary signal)
  const artistResult = await computeArtistComponent(artists);
  if (artistResult.embedding) {
    components.push({
      embedding: artistResult.embedding,
      weight: WEIGHTS.artists,
    });
  }
  
  // Slider component
  if (sliderValues) {
    const sliderVec = await computeSliderVector(sliderValues);
    const hasSignal = sliderVec.some(v => Math.abs(v) > 0.001);
    
    if (hasSignal) {
      components.push({
        embedding: sliderVec,
        weight: WEIGHTS.sliders,
      });
    }
  }
  
  // Cultural preferences
  if (culturalPrefs && culturalPrefs.length > 0) {
    const culturalVec = await computeCulturalVector(culturalPrefs);
    const hasSignal = culturalVec.some(v => Math.abs(v) > 0.001);
    
    if (hasSignal) {
      components.push({
        embedding: culturalVec,
        weight: WEIGHTS.cultural,
      });
    }
  }
  
  if (components.length === 0) {
    throw new Error('No embedding components available');
  }
  
  // Combine components with weights
  const combinedEmbedding = weightedAverageVectors(
    components.map(c => c.embedding),
    components.map(c => c.weight)
  );
  
  // Normalize final vector
  return normalizeVector(combinedEmbedding);
}

/**
 * Build user embedding from Spotify data
 */
async function buildSpotifyEmbedding(
  topArtists: SpotifyArtistData[],
  recentlyPlayed?: SpotifyTrackData[]
): Promise<EmbeddingVector> {
  const artistResult = await computeSpotifyArtistComponent(
    topArtists,
    recentlyPlayed
  );
  
  if (!artistResult.embedding) {
    throw new Error('No artist embeddings available from Spotify data');
  }
  
  // Spotify-based embedding is primarily artist-driven
  // Future: could add implicit slider values based on audio features
  return normalizeVector(artistResult.embedding);
}

/**
 * Main entry point: Build and store user embedding
 */
export async function buildUserEmbedding(
  input: BuildUserEmbeddingInput
): Promise<BuildUserEmbeddingResult> {
  const { userId, onboardingType } = input;
  
  try {
    let coreEmbedding: EmbeddingVector;
    let artistCount: number;
    let onboardingData: OnboardingData = {};
    
    if (onboardingType === 'spotify') {
      // Spotify-based embedding
      if (!input.spotifyTopArtists || input.spotifyTopArtists.length === 0) {
        throw new Error('Spotify top artists required');
      }
      
      coreEmbedding = await buildSpotifyEmbedding(
        input.spotifyTopArtists,
        input.spotifyRecentlyPlayed
      );
      
      artistCount = input.spotifyTopArtists.length;
      onboardingData = {
        likedArtists: input.spotifyTopArtists.map(a => a.name),
        likedArtistIds: input.spotifyTopArtists.map(a => a.id),
      };
    } else {
      // Manual onboarding
      if (!input.artists || input.artists.length < 3) {
        throw new Error('At least 3 artists required for manual onboarding');
      }
      
      coreEmbedding = await buildManualEmbedding(
        input.artists,
        input.sliderValues,
        input.culturalPrefs
      );
      
      artistCount = input.artists.length;
      onboardingData = {
        likedArtists: input.artists,
        sliderValues: input.sliderValues,
        culturalPreferences: input.culturalPrefs,
      };
    }
    
    // Store in database
    const { data, error } = await supabase
      .from('user_taste_embeddings')
      .upsert({
        user_id: userId,
        core_embedding: coreEmbedding,
        core_updated_at: new Date().toISOString(),
        onboarding_type: onboardingType,
        onboarding_data: onboardingData,
        onboarding_completed_at: new Date().toISOString(),
        embedding_version: 1,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();
      
    if (error) {
      console.error('Error storing user embedding:', error);
      throw error;
    }
    
    return {
      success: true,
      userId,
      onboardingType,
      coreEmbedding,
      embeddingVersion: data.embedding_version,
      artistCount,
    };
  } catch (error) {
    console.error('Error building user embedding:', error);
    return {
      success: false,
      userId,
      onboardingType,
      coreEmbedding: [],
      embeddingVersion: 0,
      artistCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Rebuild user embedding (for when tastes change or model updates)
 */
export async function rebuildUserEmbedding(
  userId: string
): Promise<BuildUserEmbeddingResult> {
  // Fetch existing onboarding data
  const { data, error } = await supabase
    .from('user_taste_embeddings')
    .select('onboarding_type, onboarding_data')
    .eq('user_id', userId)
    .single();
    
  if (error || !data) {
    return {
      success: false,
      userId,
      onboardingType: 'manual',
      coreEmbedding: [],
      embeddingVersion: 0,
      artistCount: 0,
      error: 'User embedding not found',
    };
  }
  
  const onboardingData = data.onboarding_data as OnboardingData;
  
  return buildUserEmbedding({
    userId,
    onboardingType: data.onboarding_type as OnboardingType,
    artists: onboardingData.likedArtists,
    sliderValues: onboardingData.sliderValues,
    culturalPrefs: onboardingData.culturalPreferences,
  });
}

/**
 * Get user's effective embedding (core + session)
 */
export async function getUserEffectiveEmbedding(
  userId: string,
  sessionWeight: number = 0.3
): Promise<EmbeddingVector | null> {
  const { data, error } = await supabase
    .from('user_taste_embeddings')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  const userTaste: UserTasteEmbedding = {
    id: data.id,
    userId: data.user_id,
    coreEmbedding: data.core_embedding,
    coreUpdatedAt: data.core_updated_at ? new Date(data.core_updated_at) : undefined,
    sessionEmbedding: data.session_embedding,
    sessionUpdatedAt: data.session_updated_at ? new Date(data.session_updated_at) : undefined,
    sessionDecayHours: data.session_decay_hours || 48,
    onboardingType: data.onboarding_type,
    onboardingCompletedAt: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : undefined,
    onboardingData: data.onboarding_data,
    embeddingVersion: data.embedding_version,
  };
  
  return computeEffectiveEmbedding(userTaste, sessionWeight);
}

/**
 * Ensure anchor vectors are initialized
 */
export async function ensureAnchorsInitialized(): Promise<void> {
  const { count, error } = await supabase
    .from('embedding_anchors')
    .select('*', { count: 'exact', head: true });
    
  if (error) {
    console.error('Error checking anchor vectors:', error);
    return;
  }
  
  // Initialize if empty
  if (!count || count === 0) {
    await initializeAnchorVectors();
  }
}
