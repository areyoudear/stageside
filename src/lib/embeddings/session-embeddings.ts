/**
 * Session Embedding Service
 * 
 * Tracks user interactions (clicks, saves, browses) to build
 * a short-term session embedding that captures current intent.
 * 
 * Session embedding decays over 24-72h (configurable).
 * Effective embedding = core + α * session, where α is tunable.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  EmbeddingVector,
  UserTasteEmbedding,
  EMBEDDING_DIMENSIONS 
} from './types';
import { 
  getOrCreateArtistEmbedding, 
  getArtistEmbeddings 
} from './artist-embeddings';
import { 
  weightedAverageVectors, 
  normalizeVector,
  addVectors,
  scaleVector,
  zeroVector 
} from './embedding-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configuration
const DEFAULT_SESSION_WEIGHT = 0.3; // α in effective = core + α * session
const DEFAULT_DECAY_HOURS = 48;

// Interaction weights by type
export const INTERACTION_WEIGHTS = {
  click: 0.3,        // Clicked on event/artist
  view: 0.1,         // Viewed details
  save: 0.6,         // Saved/bookmarked
  purchase: 1.0,     // Purchased ticket
  share: 0.5,        // Shared with friends
  browse: 0.05,      // Scrolled past (implicit)
  search: 0.4,       // Searched for
  dismiss: -0.3,     // Explicitly dismissed
} as const;

export type InteractionType = keyof typeof INTERACTION_WEIGHTS;

/**
 * Interaction record for tracking
 */
export interface UserInteraction {
  userId: string;
  entityType: 'artist' | 'event' | 'festival';
  entityId: string;
  entityName?: string;
  interactionType: InteractionType;
  timestamp?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Log a user interaction (stored for session embedding calculation)
 */
export async function logInteraction(
  interaction: UserInteraction
): Promise<void> {
  const { error } = await supabase
    .from('user_interactions')
    .insert({
      user_id: interaction.userId,
      entity_type: interaction.entityType,
      entity_id: interaction.entityId,
      entity_name: interaction.entityName,
      interaction_type: interaction.interactionType,
      metadata: interaction.metadata || {},
      created_at: interaction.timestamp?.toISOString() || new Date().toISOString(),
    });
    
  if (error) {
    console.error('Error logging interaction:', error);
  }
}

/**
 * Get recent interactions for a user (within decay window)
 */
export async function getRecentInteractions(
  userId: string,
  hoursBack: number = DEFAULT_DECAY_HOURS
): Promise<UserInteraction[]> {
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('user_interactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', cutoffTime.toISOString())
    .order('created_at', { ascending: false });
    
  if (error || !data) {
    console.error('Error fetching interactions:', error);
    return [];
  }
  
  return data.map(row => ({
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    interactionType: row.interaction_type,
    timestamp: new Date(row.created_at),
    metadata: row.metadata,
  }));
}

/**
 * Calculate exponential decay weight based on interaction age
 */
function calculateDecayWeight(
  interactionTime: Date,
  decayHours: number
): number {
  const ageHours = (Date.now() - interactionTime.getTime()) / (1000 * 60 * 60);
  
  // Exponential decay: weight = e^(-age/decay)
  // At age = decay, weight ≈ 0.37
  // At age = 2*decay, weight ≈ 0.14
  return Math.exp(-ageHours / decayHours);
}

/**
 * Compute session embedding from recent interactions
 */
export async function computeSessionEmbedding(
  userId: string,
  decayHours: number = DEFAULT_DECAY_HOURS
): Promise<EmbeddingVector | null> {
  const interactions = await getRecentInteractions(userId, decayHours * 2);
  
  if (interactions.length === 0) {
    return null;
  }
  
  // Group by artist and compute weighted signal
  const artistSignals = new Map<string, {
    name: string;
    weight: number;
    latestTime: Date;
  }>();
  
  for (const interaction of interactions) {
    // Only process artist-related interactions for now
    let artistName: string | undefined;
    
    if (interaction.entityType === 'artist') {
      artistName = interaction.entityName || interaction.entityId;
    } else if (interaction.entityType === 'event' && interaction.metadata?.headliner) {
      artistName = interaction.metadata.headliner as string;
    }
    
    if (!artistName) continue;
    
    const interactionWeight = INTERACTION_WEIGHTS[interaction.interactionType];
    const decayWeight = calculateDecayWeight(
      interaction.timestamp || new Date(),
      decayHours
    );
    const combinedWeight = interactionWeight * decayWeight;
    
    const existing = artistSignals.get(artistName);
    if (existing) {
      existing.weight += combinedWeight;
      if (interaction.timestamp && interaction.timestamp > existing.latestTime) {
        existing.latestTime = interaction.timestamp;
      }
    } else {
      artistSignals.set(artistName, {
        name: artistName,
        weight: combinedWeight,
        latestTime: interaction.timestamp || new Date(),
      });
    }
  }
  
  if (artistSignals.size === 0) {
    return null;
  }
  
  // Get embeddings for all artists
  const embeddings: EmbeddingVector[] = [];
  const weights: number[] = [];
  
  for (const [artistName, signal] of Array.from(artistSignals.entries())) {
    // Skip negative signals (dismissals exceed positive)
    if (signal.weight <= 0) continue;
    
    try {
      const artistEmb = await getOrCreateArtistEmbedding({ name: artistName });
      if (artistEmb.embedding) {
        embeddings.push(artistEmb.embedding);
        weights.push(signal.weight);
      }
    } catch (error) {
      console.error(`Error getting embedding for ${artistName}:`, error);
    }
  }
  
  if (embeddings.length === 0) {
    return null;
  }
  
  // Compute weighted average
  return normalizeVector(weightedAverageVectors(embeddings, weights));
}

/**
 * Update user's session embedding in database
 */
export async function updateUserSessionEmbedding(
  userId: string,
  decayHours: number = DEFAULT_DECAY_HOURS
): Promise<void> {
  const sessionEmbedding = await computeSessionEmbedding(userId, decayHours);
  
  if (!sessionEmbedding) {
    return; // No recent interactions
  }
  
  const { error } = await supabase
    .from('user_taste_embeddings')
    .update({
      session_embedding: sessionEmbedding,
      session_updated_at: new Date().toISOString(),
      session_decay_hours: decayHours,
    })
    .eq('user_id', userId);
    
  if (error) {
    console.error('Error updating session embedding:', error);
  }
}

/**
 * Get effective user embedding (core + decayed session)
 */
export function computeEffectiveEmbedding(
  userTaste: UserTasteEmbedding,
  sessionWeight: number = DEFAULT_SESSION_WEIGHT
): EmbeddingVector | null {
  if (!userTaste.coreEmbedding) {
    return null;
  }
  
  // No session or no session timestamp
  if (!userTaste.sessionEmbedding || !userTaste.sessionUpdatedAt) {
    return userTaste.coreEmbedding;
  }
  
  // Calculate session age and decay
  const sessionAgeHours = 
    (Date.now() - userTaste.sessionUpdatedAt.getTime()) / (1000 * 60 * 60);
  const decayHours = userTaste.sessionDecayHours || DEFAULT_DECAY_HOURS;
  
  // Session too old - use core only
  if (sessionAgeHours > decayHours * 2) {
    return userTaste.coreEmbedding;
  }
  
  // Exponential decay of session weight
  const decayFactor = Math.exp(-sessionAgeHours / decayHours);
  const effectiveSessionWeight = sessionWeight * decayFactor;
  
  // effective = core + α * session
  const sessionContribution = scaleVector(
    userTaste.sessionEmbedding,
    effectiveSessionWeight
  );
  
  return normalizeVector(
    addVectors(userTaste.coreEmbedding, sessionContribution)
  );
}

/**
 * Batch log multiple interactions efficiently
 */
export async function logInteractionsBatch(
  interactions: UserInteraction[]
): Promise<void> {
  if (interactions.length === 0) return;
  
  const rows = interactions.map(interaction => ({
    user_id: interaction.userId,
    entity_type: interaction.entityType,
    entity_id: interaction.entityId,
    entity_name: interaction.entityName,
    interaction_type: interaction.interactionType,
    metadata: interaction.metadata || {},
    created_at: interaction.timestamp?.toISOString() || new Date().toISOString(),
  }));
  
  const { error } = await supabase
    .from('user_interactions')
    .insert(rows);
    
  if (error) {
    console.error('Error batch logging interactions:', error);
  }
}

/**
 * Clear old interactions beyond retention window
 */
export async function pruneOldInteractions(
  retentionDays: number = 30
): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  const { data, error } = await supabase
    .from('user_interactions')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');
    
  if (error) {
    console.error('Error pruning old interactions:', error);
    return 0;
  }
  
  return data?.length || 0;
}
