/**
 * Concert → Event Embedding Integration
 * 
 * Provides utilities for integrating embedding generation with
 * the concert aggregation/ingestion pipeline.
 * 
 * Usage:
 * 1. After fetching concerts from Ticketmaster/SeatGeek/etc
 * 2. Call embedConcertsFromAggregator() to generate embeddings
 * 3. Embeddings are stored in event_embeddings table
 */

import type { Concert } from '@/lib/ticketmaster';
import type { DeduplicatedConcert, ConcertSource } from '@/lib/concert-aggregator';
import { 
  triggerEventEmbeddingsBatch, 
  type ConcertToEmbed,
} from './event-embeddings';
import type { EventEmbedding } from './types';

/**
 * Convert Concert (from ticketmaster.ts) to ConcertToEmbed format
 */
export function concertToConcertToEmbed(
  concert: Concert,
  source: ConcertSource = 'ticketmaster'
): ConcertToEmbed {
  return {
    id: concert.id,
    name: concert.name,
    artists: concert.artists,
    venue: {
      name: concert.venue.name,
      city: concert.venue.city,
    },
    date: concert.date,
    source: source,
  };
}

/**
 * Convert DeduplicatedConcert to ConcertToEmbed format
 * Uses the primary source from the deduplicated concert
 */
export function deduplicatedConcertToConcertToEmbed(
  concert: DeduplicatedConcert
): ConcertToEmbed {
  const primarySource = concert.sources[0];
  return {
    id: concert.id, // Use the concert's ID (from primary source)
    name: concert.name,
    artists: concert.artists,
    venue: {
      name: concert.venue.name,
      city: concert.venue.city,
    },
    date: concert.date,
    source: primarySource.source,
  };
}

/**
 * Generate embeddings for Concert array (from ticketmaster.ts)
 */
export async function embedConcerts(
  concerts: Concert[],
  source: ConcertSource = 'ticketmaster'
): Promise<{
  embedded: Map<string, EventEmbedding | null>;
  stats: { total: number; success: number; failed: number };
}> {
  const concertsToEmbed = concerts.map(c => concertToConcertToEmbed(c, source));
  const results = await triggerEventEmbeddingsBatch(concertsToEmbed);
  
  let success = 0;
  let failed = 0;
  
  for (const result of Array.from(results.values())) {
    if (result) success++;
    else failed++;
  }
  
  return {
    embedded: results,
    stats: {
      total: concerts.length,
      success,
      failed,
    },
  };
}

/**
 * Generate embeddings for DeduplicatedConcert array (from concert-aggregator.ts)
 */
export async function embedDeduplicatedConcerts(
  concerts: DeduplicatedConcert[]
): Promise<{
  embedded: Map<string, EventEmbedding | null>;
  stats: { total: number; success: number; failed: number };
}> {
  const concertsToEmbed = concerts.map(deduplicatedConcertToConcertToEmbed);
  const results = await triggerEventEmbeddingsBatch(concertsToEmbed);
  
  let success = 0;
  let failed = 0;
  
  for (const result of Array.from(results.values())) {
    if (result) success++;
    else failed++;
  }
  
  return {
    embedded: results,
    stats: {
      total: concerts.length,
      success,
      failed,
    },
  };
}

/**
 * Enrich concerts with their embedding IDs
 * Returns concerts with an added `embeddingId` field
 */
export async function enrichConcertsWithEmbeddings<T extends Concert | DeduplicatedConcert>(
  concerts: T[],
  source?: ConcertSource
): Promise<(T & { embeddingId?: string })[]> {
  // Generate embeddings
  const concertsToEmbed = concerts.map(c => {
    if ('sources' in c) {
      // DeduplicatedConcert
      return deduplicatedConcertToConcertToEmbed(c as DeduplicatedConcert);
    }
    // Regular Concert
    return concertToConcertToEmbed(c as Concert, source || 'ticketmaster');
  });
  
  const results = await triggerEventEmbeddingsBatch(concertsToEmbed);
  
  // Enrich concerts with embedding IDs
  return concerts.map((concert, index) => {
    const concertToEmbed = concertsToEmbed[index];
    const embedding = results.get(concertToEmbed.id);
    
    return {
      ...concert,
      embeddingId: embedding?.id,
    };
  });
}

/**
 * Background embedding job
 * Processes concerts that don't have embeddings yet
 * Call this periodically or after batch imports
 */
export async function processBacklogEmbeddings(
  maxCount: number = 100
): Promise<{
  processed: number;
  success: number;
  failed: number;
}> {
  // Import supabase here to avoid circular deps
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // Find events needing embeddings
  const { data: events, error } = await supabase.rpc('get_events_needing_embedding', {
    p_limit: maxCount,
  });
  
  if (error || !events?.length) {
    return { processed: 0, success: 0, failed: 0 };
  }
  
  // Convert to ConcertToEmbed format
  const concertsToEmbed: ConcertToEmbed[] = events.map((e: {
    event_id: string;
    external_id: string;
    source: 'ticketmaster' | 'eventbrite' | 'bandsintown' | 'seatgeek';
    name: string;
    lineup: string[];
  }) => ({
    id: e.external_id,
    name: e.name,
    artists: e.lineup || [],
    venue: { name: '', city: '' }, // Not needed for embedding
    date: '',
    source: e.source,
  }));
  
  const results = await triggerEventEmbeddingsBatch(concertsToEmbed);
  
  let success = 0;
  let failed = 0;
  
  for (const result of Array.from(results.values())) {
    if (result) success++;
    else failed++;
  }
  
  return {
    processed: events.length,
    success,
    failed,
  };
}
