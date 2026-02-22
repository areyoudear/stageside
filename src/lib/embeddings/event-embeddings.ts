/**
 * Event Embedding Pipeline
 * 
 * Generates embeddings for events based on their lineup.
 * Single artist = artist embedding (direct copy)
 * Multi-artist = weighted average (headliner gets 0.6, supports split 0.4)
 * 
 * Smart caching: Only recomputes if lineup has changed.
 */

import { createClient } from '@supabase/supabase-js';
import { 
  EventEmbedding, 
  EmbeddingVector,
  EMBEDDING_DIMENSIONS 
} from './types';
import { 
  getOrCreateArtistEmbedding, 
  getArtistEmbeddings, 
  normalizeArtistName,
  RawArtistData 
} from './artist-embeddings';
import { 
  weightedAverageVectors, 
  averageVectors,
  getEmbeddingConfig 
} from './embedding-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Headliner gets 60% weight, supports share 40%
export const HEADLINER_WEIGHT = 0.6;
export const SUPPORT_WEIGHT = 0.4;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Create a hash of the lineup for change detection
 */
export function computeLineupHash(lineup: string[]): string {
  const normalized = lineup.map(normalizeArtistName).sort().join('|');
  // Simple hash - fnv1a-like
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16);
}

/**
 * Raw event data from ticket sources
 */
export interface RawEventData {
  externalId: string;
  source: 'ticketmaster' | 'eventbrite' | 'bandsintown' | 'seatgeek';
  name: string;
  venueName?: string;
  city?: string;
  date?: Date | string;
  lineup: string[]; // Artist names, first = headliner
  artistData?: RawArtistData[]; // Optional enriched artist data
}

/**
 * Compute event embedding from lineup
 */
async function computeEventEmbedding(
  lineup: string[],
  artistData?: RawArtistData[]
): Promise<{ embedding: EmbeddingVector; artistIds: string[] }> {
  if (lineup.length === 0) {
    throw new Error('Cannot compute embedding for empty lineup');
  }
  
  // Get or create embeddings for all artists
  const artistEmbeddings: Array<{ id: string; embedding: EmbeddingVector }> = [];
  
  for (let i = 0; i < lineup.length; i++) {
    const artistName = lineup[i];
    const rawData = artistData?.[i] || { name: artistName };
    
    try {
      const artistEmb = await getOrCreateArtistEmbedding(rawData);
      if (artistEmb.embedding) {
        artistEmbeddings.push({
          id: artistEmb.id,
          embedding: artistEmb.embedding,
        });
      }
    } catch (error) {
      console.error(`Error getting embedding for ${artistName}:`, error);
    }
  }
  
  if (artistEmbeddings.length === 0) {
    throw new Error('No artist embeddings available for lineup');
  }
  
  // Single artist = use their embedding directly
  if (artistEmbeddings.length === 1) {
    return {
      embedding: artistEmbeddings[0].embedding,
      artistIds: [artistEmbeddings[0].id],
    };
  }
  
  // Multi-artist = weighted average
  const headliner = artistEmbeddings[0];
  const supports = artistEmbeddings.slice(1);
  
  // Average support acts
  const supportAvg = averageVectors(supports.map(s => s.embedding));
  
  // Weighted combination: 60% headliner + 40% supports
  const eventEmbedding = weightedAverageVectors(
    [headliner.embedding, supportAvg],
    [HEADLINER_WEIGHT, SUPPORT_WEIGHT]
  );
  
  return {
    embedding: eventEmbedding,
    artistIds: artistEmbeddings.map(a => a.id),
  };
}

/**
 * Get or create event embedding
 */
export async function getOrCreateEventEmbedding(
  raw: RawEventData
): Promise<EventEmbedding> {
  // Check cache first
  const { data: existing } = await supabase
    .from('event_embeddings')
    .select('*')
    .eq('external_id', raw.externalId)
    .eq('source', raw.source)
    .single();
    
  if (existing && existing.embedding) {
    return {
      id: existing.id,
      externalId: existing.external_id,
      source: existing.source,
      name: existing.name,
      venueName: existing.venue_name,
      city: existing.city,
      date: existing.date ? new Date(existing.date) : undefined,
      lineup: existing.lineup,
      lineupArtistIds: existing.lineup_artist_ids,
      embedding: existing.embedding,
      embeddingMethod: existing.embedding_method,
      embeddingVersion: existing.embedding_version,
      lastEmbeddedAt: new Date(existing.last_embedded_at),
    };
  }
  
  // Compute embedding from lineup
  const { embedding, artistIds } = await computeEventEmbedding(
    raw.lineup,
    raw.artistData
  );
  
  // Compute lineup hash for smart caching
  const lineupHash = computeLineupHash(raw.lineup);
  
  // Store in DB
  const { data: inserted, error } = await supabase
    .from('event_embeddings')
    .upsert({
      external_id: raw.externalId,
      source: raw.source,
      name: raw.name,
      venue_name: raw.venueName,
      city: raw.city,
      date: raw.date ? new Date(raw.date).toISOString().split('T')[0] : null,
      lineup: raw.lineup,
      lineup_hash: lineupHash,
      lineup_artist_ids: artistIds,
      headliner_weight: raw.lineup.length > 1 ? HEADLINER_WEIGHT : 1.0,
      support_weight: raw.lineup.length > 1 ? SUPPORT_WEIGHT : 0,
      embedding: embedding,
      embedding_method: raw.lineup.length === 1 ? 'headliner_only' : 'weighted_average',
      embedding_version: 1,
      last_embedded_at: new Date().toISOString(),
    }, {
      onConflict: 'external_id,source',
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error storing event embedding:', error);
    throw error;
  }
  
  return {
    id: inserted.id,
    externalId: inserted.external_id,
    source: inserted.source,
    name: inserted.name,
    venueName: inserted.venue_name,
    city: inserted.city,
    date: inserted.date ? new Date(inserted.date) : undefined,
    lineup: inserted.lineup,
    lineupArtistIds: inserted.lineup_artist_ids,
    embedding: inserted.embedding,
    embeddingMethod: inserted.embedding_method,
    embeddingVersion: inserted.embedding_version,
    lastEmbeddedAt: new Date(inserted.last_embedded_at),
  };
}

/**
 * Get event embedding by external ID
 */
export async function getEventEmbedding(
  externalId: string,
  source: string
): Promise<EventEmbedding | null> {
  const { data, error } = await supabase
    .from('event_embeddings')
    .select('*')
    .eq('external_id', externalId)
    .eq('source', source)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    externalId: data.external_id,
    source: data.source,
    name: data.name,
    venueName: data.venue_name,
    city: data.city,
    date: data.date ? new Date(data.date) : undefined,
    lineup: data.lineup,
    lineupArtistIds: data.lineup_artist_ids,
    embedding: data.embedding,
    embeddingMethod: data.embedding_method,
    embeddingVersion: data.embedding_version,
    lastEmbeddedAt: new Date(data.last_embedded_at),
  };
}

/**
 * Find matching events for a user embedding
 */
export async function findMatchingEvents(
  userEmbedding: EmbeddingVector,
  options: {
    city?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
  } = {}
): Promise<Array<{ event: EventEmbedding; similarity: number }>> {
  const {
    city,
    dateFrom = new Date(),
    dateTo = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    limit = 50,
  } = options;
  
  // Use pgvector similarity search
  const { data, error } = await supabase.rpc('find_matching_events', {
    p_user_embedding: userEmbedding,
    p_city: city || null,
    p_date_from: dateFrom.toISOString().split('T')[0],
    p_date_to: dateTo.toISOString().split('T')[0],
    p_limit: limit,
  });
  
  if (error) {
    console.error('Error finding matching events:', error);
    return [];
  }
  
  return data.map((r: {
    event_id: string;
    name: string;
    venue_name: string;
    city: string;
    date: string;
    lineup: string[];
    similarity: number;
  }) => ({
    event: {
      id: r.event_id,
      externalId: '',
      source: 'ticketmaster' as const,
      name: r.name,
      venueName: r.venue_name,
      city: r.city,
      date: r.date ? new Date(r.date) : undefined,
      lineup: r.lineup,
      lineupArtistIds: [],
      embedding: null,
      embeddingMethod: 'weighted_average' as const,
      embeddingVersion: 1,
      lastEmbeddedAt: new Date(),
    },
    similarity: r.similarity,
  }));
}

/**
 * Batch embed multiple events
 */
export async function embedEventsBatch(
  events: RawEventData[],
  maxConcurrent: number = 3
): Promise<EventEmbedding[]> {
  const results: EventEmbedding[] = [];
  
  for (let i = 0; i < events.length; i += maxConcurrent) {
    const batch = events.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(event => getOrCreateEventEmbedding(event).catch(err => {
        console.error(`Error embedding event ${event.name}:`, err);
        return null;
      }))
    );
    
    results.push(...batchResults.filter((r): r is EventEmbedding => r !== null));
    
    if (i + maxConcurrent < events.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return results;
}

// ============================================
// SMART CACHING
// ============================================

/**
 * Check if an event's embedding needs to be recomputed
 * Returns true if lineup has changed or embedding is missing
 */
export async function needsRecompute(
  externalId: string,
  source: string,
  currentLineup: string[]
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('event_embeddings')
    .select('lineup, lineup_hash, embedding')
    .eq('external_id', externalId)
    .eq('source', source)
    .single();
    
  if (!existing || !existing.embedding) {
    return true; // No embedding exists
  }
  
  // Compare lineup hash if available
  if (existing.lineup_hash) {
    const currentHash = computeLineupHash(currentLineup);
    return existing.lineup_hash !== currentHash;
  }
  
  // Fallback: compare lineup arrays
  const existingLineup = (existing.lineup || []).map(normalizeArtistName).sort();
  const newLineup = currentLineup.map(normalizeArtistName).sort();
  
  if (existingLineup.length !== newLineup.length) {
    return true;
  }
  
  return existingLineup.some((name: string, i: number) => name !== newLineup[i]);
}

/**
 * Generate event embedding by ID (for existing events in DB)
 * Used by the API endpoint
 */
export async function generateEventEmbeddingById(
  eventId: string,
  forceRecompute: boolean = false
): Promise<EventEmbedding | null> {
  // Try to find the event in event_embeddings table first
  const { data: existingEmbed } = await supabase
    .from('event_embeddings')
    .select('*')
    .eq('id', eventId)
    .single();
    
  if (existingEmbed) {
    if (existingEmbed.embedding && !forceRecompute) {
      // Already has embedding, return it
      return {
        id: existingEmbed.id,
        externalId: existingEmbed.external_id,
        source: existingEmbed.source,
        name: existingEmbed.name,
        venueName: existingEmbed.venue_name,
        city: existingEmbed.city,
        date: existingEmbed.date ? new Date(existingEmbed.date) : undefined,
        lineup: existingEmbed.lineup,
        lineupArtistIds: existingEmbed.lineup_artist_ids,
        embedding: existingEmbed.embedding,
        embeddingMethod: existingEmbed.embedding_method,
        embeddingVersion: existingEmbed.embedding_version,
        lastEmbeddedAt: new Date(existingEmbed.last_embedded_at),
      };
    }
    
    // Recompute embedding
    const rawEvent: RawEventData = {
      externalId: existingEmbed.external_id,
      source: existingEmbed.source,
      name: existingEmbed.name,
      venueName: existingEmbed.venue_name,
      city: existingEmbed.city,
      date: existingEmbed.date,
      lineup: existingEmbed.lineup || [],
    };
    
    return getOrCreateEventEmbedding(rawEvent);
  }
  
  return null;
}

/**
 * Generate embeddings for multiple events by ID (batch)
 */
export async function generateEventEmbeddingsByIds(
  eventIds: string[],
  forceRecompute: boolean = false
): Promise<Map<string, EventEmbedding | null>> {
  const results = new Map<string, EventEmbedding | null>();
  
  // Process in parallel with concurrency limit
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < eventIds.length; i += BATCH_SIZE) {
    const batch = eventIds.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(id => 
        generateEventEmbeddingById(id, forceRecompute)
          .then(result => ({ id, result }))
          .catch(err => {
            console.error(`Error generating embedding for event ${id}:`, err);
            return { id, result: null };
          })
      )
    );
    
    for (const { id, result } of batchResults) {
      results.set(id, result);
    }
    
    // Rate limiting
    if (i + BATCH_SIZE < eventIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// ============================================
// CONCERT INGESTION INTEGRATION
// ============================================

/**
 * Convert Concert (from ticketmaster.ts) to RawEventData
 */
export interface ConcertToEmbed {
  id: string; // External ID from source
  name: string;
  artists: string[];
  venue: {
    name: string;
    city: string;
  };
  date: string;
  source: 'ticketmaster' | 'eventbrite' | 'bandsintown' | 'seatgeek';
}

export function concertToRawEventData(concert: ConcertToEmbed): RawEventData {
  return {
    externalId: concert.id,
    source: concert.source,
    name: concert.name,
    venueName: concert.venue.name,
    city: concert.venue.city,
    date: concert.date,
    lineup: concert.artists, // First artist is headliner
  };
}

/**
 * Trigger embedding generation for a concert
 * Call this after storing a concert to generate its embedding
 */
export async function triggerEventEmbedding(
  concert: ConcertToEmbed
): Promise<EventEmbedding | null> {
  try {
    // Check if we need to compute (lineup changed or no embedding)
    const needsUpdate = await needsRecompute(
      concert.id,
      concert.source,
      concert.artists
    );
    
    if (!needsUpdate) {
      // Return existing embedding
      return getEventEmbedding(concert.id, concert.source);
    }
    
    // Generate embedding
    const rawEvent = concertToRawEventData(concert);
    return getOrCreateEventEmbedding(rawEvent);
  } catch (error) {
    console.error(`Error triggering embedding for concert ${concert.id}:`, error);
    return null;
  }
}

/**
 * Batch trigger embedding generation for concerts
 */
export async function triggerEventEmbeddingsBatch(
  concerts: ConcertToEmbed[],
  maxConcurrent: number = 5
): Promise<Map<string, EventEmbedding | null>> {
  const results = new Map<string, EventEmbedding | null>();
  
  for (let i = 0; i < concerts.length; i += maxConcurrent) {
    const batch = concerts.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(async concert => {
        const embedding = await triggerEventEmbedding(concert);
        return { id: concert.id, embedding };
      })
    );
    
    for (const { id, embedding } of batchResults) {
      results.set(id, embedding);
    }
    
    // Rate limiting
    if (i + maxConcurrent < concerts.length) {
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }
  
  return results;
}

/**
 * Get embedding stats for monitoring
 */
export async function getEventEmbeddingStats(): Promise<{
  total: number;
  withEmbedding: number;
  bySource: Record<string, number>;
  byMethod: Record<string, number>;
}> {
  const { data, error } = await supabase
    .from('event_embeddings')
    .select('source, embedding_method, embedding');
    
  if (error || !data) {
    return { total: 0, withEmbedding: 0, bySource: {}, byMethod: {} };
  }
  
  const bySource: Record<string, number> = {};
  const byMethod: Record<string, number> = {};
  let withEmbedding = 0;
  
  for (const row of data) {
    bySource[row.source] = (bySource[row.source] || 0) + 1;
    byMethod[row.embedding_method] = (byMethod[row.embedding_method] || 0) + 1;
    if (row.embedding) withEmbedding++;
  }
  
  return {
    total: data.length,
    withEmbedding,
    bySource,
    byMethod,
  };
}
