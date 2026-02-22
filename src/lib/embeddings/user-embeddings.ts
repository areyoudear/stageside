/**
 * User Taste Embedding System
 * 
 * Handles core and session embeddings for users.
 * Supports both Spotify-based and manual onboarding.
 * 
 * Core embedding: stable long-term taste
 * Session embedding: short-term intent with decay
 * Effective embedding: core + α * session (where α decays)
 */

import { createClient } from '@supabase/supabase-js';
import { 
  UserTasteEmbedding, 
  OnboardingData, 
  OnboardingSliderValues,
  EmbeddingVector,
  EmbeddingAnchor,
  EMBEDDING_DIMENSIONS,
  OnboardingType
} from './types';
import { 
  getOrCreateArtistEmbedding, 
  getArtistEmbeddings,
  RawArtistData 
} from './artist-embeddings';
import { 
  weightedAverageVectors, 
  averageVectors,
  addVectors,
  scaleVector,
  normalizeVector,
  interpolateVectors,
  zeroVector,
  parseVectorFromDb 
} from './embedding-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Weights for combining embedding components
const ARTIST_WEIGHT = 0.7;       // Artists drive identity
const SLIDER_WEIGHT = 0.2;       // Sliders bias slightly
const CULTURAL_WEIGHT = 0.1;     // Cultural preferences as accent

// Session decay
const DEFAULT_SESSION_DECAY_HOURS = 48;
const DEFAULT_SESSION_WEIGHT = 0.3;

/**
 * Get anchor vectors for onboarding sliders
 */
async function getAnchorVectors(): Promise<Map<string, EmbeddingAnchor>> {
  const { data, error } = await supabase
    .from('embedding_anchors')
    .select('*');
    
  if (error || !data) {
    console.error('Error fetching anchor vectors:', error);
    return new Map();
  }
  
  const anchors = new Map<string, EmbeddingAnchor>();
  for (const row of data) {
    const key = `${row.anchor_type}_${row.anchor_name}`;
    anchors.set(key, {
      id: row.id,
      anchorType: row.anchor_type,
      anchorName: row.anchor_name,
      embedding: row.embedding,
      defaultWeight: row.default_weight,
      description: row.description,
    });
  }
  
  return anchors;
}

/**
 * Compute slider vector from onboarding values
 */
async function computeSliderVector(
  sliders: OnboardingSliderValues
): Promise<EmbeddingVector> {
  const anchors = await getAnchorVectors();
  
  const components: EmbeddingVector[] = [];
  const weights: number[] = [];
  
  // Energy slider: interpolate between low and high
  const energyLow = anchors.get('energy_low');
  const energyHigh = anchors.get('energy_high');
  if (energyLow && energyHigh) {
    const energyVec = interpolateVectors(
      energyLow.embedding,
      energyHigh.embedding,
      sliders.energy
    );
    components.push(energyVec);
    weights.push(0.3);
  }
  
  // Crowd size slider
  const crowdIntimate = anchors.get('crowd_size_intimate');
  const crowdMassive = anchors.get('crowd_size_massive');
  if (crowdIntimate && crowdMassive) {
    const crowdVec = interpolateVectors(
      crowdIntimate.embedding,
      crowdMassive.embedding,
      sliders.crowdSize
    );
    components.push(crowdVec);
    weights.push(0.2);
  }
  
  // Vibe components
  if (sliders.vibes.dance > 0.5) {
    const danceAnchor = anchors.get('vibe_dance_high');
    if (danceAnchor) {
      components.push(danceAnchor.embedding);
      weights.push(sliders.vibes.dance * 0.15);
    }
  }
  
  if (sliders.vibes.lyrical > 0.5) {
    const lyricalAnchor = anchors.get('vibe_lyrical_high');
    if (lyricalAnchor) {
      components.push(lyricalAnchor.embedding);
      weights.push(sliders.vibes.lyrical * 0.15);
    }
  }
  
  if (sliders.vibes.spectacle > 0.5) {
    const spectacleAnchor = anchors.get('vibe_spectacle_high');
    if (spectacleAnchor) {
      components.push(spectacleAnchor.embedding);
      weights.push(sliders.vibes.spectacle * 0.15);
    }
  }
  
  if (components.length === 0) {
    return zeroVector();
  }
  
  return weightedAverageVectors(components, weights);
}

/**
 * Compute user embedding from Spotify data
 */
export async function computeSpotifyUserEmbedding(
  userId: string,
  topArtists: RawArtistData[],
  recentlyPlayed?: RawArtistData[]
): Promise<EmbeddingVector> {
  // Get embeddings for top artists
  const artistEmbeddings: Array<{ embedding: EmbeddingVector; weight: number }> = [];
  
  for (let i = 0; i < topArtists.length; i++) {
    try {
      const artistEmb = await getOrCreateArtistEmbedding(topArtists[i]);
      if (artistEmb.embedding) {
        // Decay weight by rank position
        // Top artist gets weight 1.0, decays exponentially
        const weight = Math.pow(0.95, i);
        artistEmbeddings.push({
          embedding: artistEmb.embedding,
          weight,
        });
      }
    } catch (error) {
      console.error(`Error getting embedding for ${topArtists[i].name}:`, error);
    }
  }
  
  // Add recently played with lower weight
  if (recentlyPlayed) {
    for (const artist of recentlyPlayed.slice(0, 10)) {
      try {
        const artistEmb = await getOrCreateArtistEmbedding(artist);
        if (artistEmb.embedding) {
          artistEmbeddings.push({
            embedding: artistEmb.embedding,
            weight: 0.3, // Lower weight for recent plays
          });
        }
      } catch (error) {
        // Skip on error
      }
    }
  }
  
  if (artistEmbeddings.length === 0) {
    throw new Error('No artist embeddings available');
  }
  
  // Weighted average
  const userEmbedding = weightedAverageVectors(
    artistEmbeddings.map(a => a.embedding),
    artistEmbeddings.map(a => a.weight)
  );
  
  return normalizeVector(userEmbedding);
}

/**
 * Compute user embedding from manual onboarding
 */
export async function computeManualUserEmbedding(
  onboardingData: OnboardingData
): Promise<EmbeddingVector> {
  const components: EmbeddingVector[] = [];
  const weights: number[] = [];
  
  // Artist component (primary signal)
  if (onboardingData.likedArtists && onboardingData.likedArtists.length > 0) {
    const artistEmbeddings: EmbeddingVector[] = [];
    
    for (const artistName of onboardingData.likedArtists) {
      try {
        const artistEmb = await getOrCreateArtistEmbedding({ name: artistName });
        if (artistEmb.embedding) {
          artistEmbeddings.push(artistEmb.embedding);
        }
      } catch (error) {
        console.error(`Error getting embedding for ${artistName}:`, error);
      }
    }
    
    if (artistEmbeddings.length > 0) {
      components.push(averageVectors(artistEmbeddings));
      weights.push(ARTIST_WEIGHT);
    }
  }
  
  // Slider component
  if (onboardingData.sliderValues) {
    const sliderVec = await computeSliderVector(onboardingData.sliderValues);
    if (sliderVec.some(v => v !== 0)) {
      components.push(sliderVec);
      weights.push(SLIDER_WEIGHT);
    }
  }
  
  // Cultural preferences
  if (onboardingData.culturalPreferences && onboardingData.culturalPreferences.length > 0) {
    const anchors = await getAnchorVectors();
    const culturalVecs: EmbeddingVector[] = [];
    
    for (const pref of onboardingData.culturalPreferences) {
      const anchor = anchors.get(`cultural_${pref}`);
      if (anchor) {
        culturalVecs.push(anchor.embedding);
      }
    }
    
    if (culturalVecs.length > 0) {
      components.push(averageVectors(culturalVecs));
      weights.push(CULTURAL_WEIGHT);
    }
  }
  
  if (components.length === 0) {
    throw new Error('No onboarding data to compute embedding');
  }
  
  const userEmbedding = weightedAverageVectors(components, weights);
  return normalizeVector(userEmbedding);
}

/**
 * Get or create user taste embedding
 */
export async function getOrCreateUserEmbedding(
  userId: string
): Promise<UserTasteEmbedding | null> {
  const { data, error } = await supabase
    .from('user_taste_embeddings')
    .select('*')
    .eq('user_id', userId)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    coreEmbedding: parseVectorFromDb(data.core_embedding),
    coreUpdatedAt: data.core_updated_at ? new Date(data.core_updated_at) : undefined,
    sessionEmbedding: parseVectorFromDb(data.session_embedding),
    sessionUpdatedAt: data.session_updated_at ? new Date(data.session_updated_at) : undefined,
    sessionDecayHours: data.session_decay_hours,
    onboardingType: data.onboarding_type,
    onboardingCompletedAt: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : undefined,
    onboardingData: data.onboarding_data,
    embeddingVersion: data.embedding_version,
  };
}

/**
 * Update user's core embedding from Spotify sync
 */
export async function updateUserCoreFromSpotify(
  userId: string,
  topArtists: RawArtistData[],
  recentlyPlayed?: RawArtistData[]
): Promise<UserTasteEmbedding> {
  const coreEmbedding = await computeSpotifyUserEmbedding(
    userId,
    topArtists,
    recentlyPlayed
  );
  
  const { data, error } = await supabase
    .from('user_taste_embeddings')
    .upsert({
      user_id: userId,
      core_embedding: coreEmbedding,
      core_updated_at: new Date().toISOString(),
      onboarding_type: 'spotify',
      onboarding_completed_at: new Date().toISOString(),
      embedding_version: 1,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error updating user core embedding:', error);
    throw error;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    coreEmbedding: parseVectorFromDb(data.core_embedding),
    coreUpdatedAt: new Date(data.core_updated_at),
    sessionEmbedding: parseVectorFromDb(data.session_embedding),
    sessionUpdatedAt: data.session_updated_at ? new Date(data.session_updated_at) : undefined,
    sessionDecayHours: data.session_decay_hours,
    onboardingType: data.onboarding_type,
    onboardingCompletedAt: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : undefined,
    onboardingData: data.onboarding_data,
    embeddingVersion: data.embedding_version,
  };
}

/**
 * Update user's core embedding from manual onboarding
 */
export async function updateUserCoreFromOnboarding(
  userId: string,
  onboardingData: OnboardingData
): Promise<UserTasteEmbedding> {
  const coreEmbedding = await computeManualUserEmbedding(onboardingData);
  
  const { data, error } = await supabase
    .from('user_taste_embeddings')
    .upsert({
      user_id: userId,
      core_embedding: coreEmbedding,
      core_updated_at: new Date().toISOString(),
      onboarding_type: 'manual',
      onboarding_data: onboardingData,
      onboarding_completed_at: new Date().toISOString(),
      embedding_version: 1,
    }, {
      onConflict: 'user_id',
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error updating user core embedding:', error);
    throw error;
  }
  
  return {
    id: data.id,
    userId: data.user_id,
    coreEmbedding: parseVectorFromDb(data.core_embedding),
    coreUpdatedAt: new Date(data.core_updated_at),
    sessionEmbedding: parseVectorFromDb(data.session_embedding),
    sessionUpdatedAt: data.session_updated_at ? new Date(data.session_updated_at) : undefined,
    sessionDecayHours: data.session_decay_hours,
    onboardingType: data.onboarding_type,
    onboardingCompletedAt: data.onboarding_completed_at ? new Date(data.onboarding_completed_at) : undefined,
    onboardingData: data.onboarding_data,
    embeddingVersion: data.embedding_version,
  };
}

/**
 * Update user's session embedding based on recent activity
 */
export async function updateUserSession(
  userId: string,
  recentInteractions: Array<{ artistName: string; weight: number }>
): Promise<void> {
  if (recentInteractions.length === 0) return;
  
  const embeddings: EmbeddingVector[] = [];
  const weights: number[] = [];
  
  for (const interaction of recentInteractions) {
    try {
      const artistEmb = await getOrCreateArtistEmbedding({ name: interaction.artistName });
      if (artistEmb.embedding) {
        embeddings.push(artistEmb.embedding);
        weights.push(interaction.weight);
      }
    } catch (error) {
      // Skip on error
    }
  }
  
  if (embeddings.length === 0) return;
  
  const sessionEmbedding = normalizeVector(
    weightedAverageVectors(embeddings, weights)
  );
  
  await supabase
    .from('user_taste_embeddings')
    .update({
      session_embedding: sessionEmbedding,
      session_updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Get effective user embedding (core + decayed session)
 */
export function getEffectiveEmbedding(
  userTaste: UserTasteEmbedding,
  sessionWeight: number = DEFAULT_SESSION_WEIGHT
): EmbeddingVector | null {
  if (!userTaste.coreEmbedding) {
    return null;
  }
  
  // No session or too old
  if (!userTaste.sessionEmbedding || !userTaste.sessionUpdatedAt) {
    return userTaste.coreEmbedding;
  }
  
  // Calculate session age and decay
  const sessionAgeHours = 
    (Date.now() - userTaste.sessionUpdatedAt.getTime()) / (1000 * 60 * 60);
  
  if (sessionAgeHours > userTaste.sessionDecayHours) {
    return userTaste.coreEmbedding;
  }
  
  // Exponential decay
  const decayFactor = Math.exp(-sessionAgeHours / userTaste.sessionDecayHours);
  const effectiveSessionWeight = sessionWeight * decayFactor;
  
  // Combine core + session
  const sessionContribution = scaleVector(
    userTaste.sessionEmbedding,
    effectiveSessionWeight
  );
  
  return normalizeVector(
    addVectors(userTaste.coreEmbedding, sessionContribution)
  );
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_taste_embeddings')
    .select('onboarding_completed_at')
    .eq('user_id', userId)
    .single();
    
  return !!data?.onboarding_completed_at;
}
