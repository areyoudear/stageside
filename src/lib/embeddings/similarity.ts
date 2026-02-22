/**
 * Similarity & Matching Engine
 * 
 * All matching is deterministic cosine similarity.
 * No LLM ranking. No magic.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  EmbeddingVector, 
  MatchResult,
  UserMatchContext 
} from './types';
import { cosineSimilarity } from './embedding-service';
import { getOrCreateUserEmbedding, getEffectiveEmbedding } from './user-embeddings';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get user's matching context (effective embedding + settings)
 */
export async function getUserMatchContext(
  userId: string
): Promise<UserMatchContext | null> {
  const userTaste = await getOrCreateUserEmbedding(userId);
  
  if (!userTaste) {
    return null;
  }
  
  const effectiveEmbedding = getEffectiveEmbedding(userTaste);
  
  if (!effectiveEmbedding) {
    return null;
  }
  
  return {
    userId,
    effectiveEmbedding,
    sessionWeight: 0.3,
  };
}

/**
 * Find matching events for a user
 */
export async function findUserEventMatches(
  userId: string,
  options: {
    city?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<MatchResult[]> {
  const context = await getUserMatchContext(userId);
  
  if (!context) {
    console.error('User has no embedding');
    return [];
  }
  
  const {
    city,
    dateFrom = new Date(),
    dateTo = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    limit = 50,
    minSimilarity = 0.3,
  } = options;
  
  // Use pgvector for efficient similarity search
  const { data, error } = await supabase.rpc('find_matching_events', {
    p_user_id: userId,
    p_city: city || null,
    p_date_from: dateFrom.toISOString().split('T')[0],
    p_date_to: dateTo.toISOString().split('T')[0],
    p_limit: limit,
  });
  
  if (error) {
    console.error('Error finding event matches:', error);
    return [];
  }
  
  return data
    .filter((r: { similarity: number }) => r.similarity >= minSimilarity)
    .map((r: {
      event_id: string;
      name: string;
      similarity: number;
      city?: string;
      date?: string;
    }) => ({
      entityId: r.event_id,
      entityType: 'event' as const,
      similarity: r.similarity,
      name: r.name,
      metadata: {
        city: r.city,
        date: r.date,
      },
    }));
}

/**
 * Find similar artists for a user
 */
export async function findUserArtistMatches(
  userId: string,
  limit: number = 30
): Promise<MatchResult[]> {
  const context = await getUserMatchContext(userId);
  
  if (!context) {
    return [];
  }
  
  const { data, error } = await supabase.rpc('find_similar_artists', {
    p_embedding: context.effectiveEmbedding,
    p_limit: limit,
  });
  
  if (error) {
    console.error('Error finding artist matches:', error);
    return [];
  }
  
  return data.map((r: {
    artist_id: string;
    name: string;
    similarity: number;
  }) => ({
    entityId: r.artist_id,
    entityType: 'artist' as const,
    similarity: r.similarity,
    name: r.name,
  }));
}

/**
 * Calculate buddy compatibility between two users
 */
export interface BuddyCompatibility {
  overallScore: number;
  tasteSimilarity: number;
  eventOverlap: number;
  priceAlignment: number;
  energyAlignment: number;
}

export async function calculateBuddyCompatibility(
  userId1: string,
  userId2: string
): Promise<BuddyCompatibility | null> {
  const [user1, user2] = await Promise.all([
    getOrCreateUserEmbedding(userId1),
    getOrCreateUserEmbedding(userId2),
  ]);
  
  if (!user1?.coreEmbedding || !user2?.coreEmbedding) {
    return null;
  }
  
  // Taste similarity (0-1)
  const tasteSimilarity = cosineSimilarity(
    user1.coreEmbedding,
    user2.coreEmbedding
  );
  
  // TODO: Fetch additional compatibility factors
  // For now, using taste as primary signal
  const eventOverlap = 0.5; // Placeholder
  const priceAlignment = 0.5; // Placeholder
  const energyAlignment = 0.5; // Placeholder
  
  // Weighted combination
  const overallScore = 
    0.5 * tasteSimilarity +
    0.2 * eventOverlap +
    0.15 * priceAlignment +
    0.15 * energyAlignment;
  
  return {
    overallScore,
    tasteSimilarity,
    eventOverlap,
    priceAlignment,
    energyAlignment,
  };
}

/**
 * Rank events by similarity for a user
 * Used to sort already-fetched events
 */
export function rankEventsBySimilarity(
  userEmbedding: EmbeddingVector,
  events: Array<{ id: string; embedding: EmbeddingVector | null; [key: string]: unknown }>
): Array<{ id: string; similarity: number; [key: string]: unknown }> {
  return events
    .map(event => ({
      ...event,
      similarity: event.embedding 
        ? cosineSimilarity(userEmbedding, event.embedding)
        : 0,
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

/**
 * Compute match tier based on similarity
 */
export function getMatchTier(similarity: number): 'perfect' | 'great' | 'good' | 'discovery' {
  if (similarity >= 0.85) return 'perfect';
  if (similarity >= 0.7) return 'great';
  if (similarity >= 0.5) return 'good';
  return 'discovery';
}

/**
 * Get match explanation data (for LLM to generate copy)
 * This is NOT the explanation itself - just structured data
 */
export interface MatchExplanationData {
  tier: 'perfect' | 'great' | 'good' | 'discovery';
  similarity: number;
  sharedGenres: string[];
  sharedArtists: string[];
  vibeMatch: string;
}

export async function getMatchExplanationData(
  userId: string,
  eventId: string
): Promise<MatchExplanationData | null> {
  const [userTaste, eventData] = await Promise.all([
    getOrCreateUserEmbedding(userId),
    supabase
      .from('event_embeddings')
      .select('*, lineup_artist_ids')
      .eq('id', eventId)
      .single(),
  ]);
  
  if (!userTaste?.coreEmbedding || !eventData.data?.embedding) {
    return null;
  }
  
  const similarity = cosineSimilarity(
    userTaste.coreEmbedding,
    eventData.data.embedding
  );
  
  // Get shared genres/artists (simplified for now)
  // TODO: Fetch actual overlaps from artist metadata
  
  return {
    tier: getMatchTier(similarity),
    similarity,
    sharedGenres: [], // TODO
    sharedArtists: [], // TODO
    vibeMatch: similarity > 0.7 ? 'strong' : similarity > 0.5 ? 'moderate' : 'exploration',
  };
}
