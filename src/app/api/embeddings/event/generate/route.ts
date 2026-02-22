/**
 * POST /api/embeddings/event/generate
 * 
 * Generate embeddings for events.
 * 
 * Request body:
 * - eventId: string - Single event ID to generate embedding for
 * - eventIds: string[] - Batch of event IDs to generate embeddings for
 * - forceRecompute: boolean - Force recompute even if embedding exists
 * 
 * For concert ingestion, use:
 * - concerts: ConcertToEmbed[] - Array of concert data with lineup info
 * 
 * Response:
 * - Single: { success: true, embedding: EventEmbedding }
 * - Batch: { success: true, results: { eventId: EventEmbedding | null }[], stats: { ... } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  generateEventEmbeddingById,
  generateEventEmbeddingsByIds,
  triggerEventEmbedding,
  triggerEventEmbeddingsBatch,
  getEventEmbeddingStats,
  type ConcertToEmbed,
} from '@/lib/embeddings/event-embeddings';

interface SingleEventRequest {
  eventId: string;
  forceRecompute?: boolean;
}

interface BatchEventRequest {
  eventIds: string[];
  forceRecompute?: boolean;
}

interface ConcertEmbedRequest {
  concerts: ConcertToEmbed[];
}

type RequestBody = SingleEventRequest | BatchEventRequest | ConcertEmbedRequest;

function isSingleRequest(body: RequestBody): body is SingleEventRequest {
  return 'eventId' in body && typeof body.eventId === 'string';
}

function isBatchRequest(body: RequestBody): body is BatchEventRequest {
  return 'eventIds' in body && Array.isArray(body.eventIds);
}

function isConcertRequest(body: RequestBody): body is ConcertEmbedRequest {
  return 'concerts' in body && Array.isArray(body.concerts);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as RequestBody;
    
    // Handle single event ID request
    if (isSingleRequest(body)) {
      const { eventId, forceRecompute = false } = body;
      
      const embedding = await generateEventEmbeddingById(eventId, forceRecompute);
      
      if (!embedding) {
        return NextResponse.json(
          { success: false, error: 'Event not found or embedding generation failed' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        embedding: {
          id: embedding.id,
          externalId: embedding.externalId,
          source: embedding.source,
          name: embedding.name,
          lineup: embedding.lineup,
          embeddingMethod: embedding.embeddingMethod,
          hasEmbedding: embedding.embedding !== null,
          lastEmbeddedAt: embedding.lastEmbeddedAt.toISOString(),
        },
      });
    }
    
    // Handle batch event IDs request
    if (isBatchRequest(body)) {
      const { eventIds, forceRecompute = false } = body;
      
      if (eventIds.length === 0) {
        return NextResponse.json(
          { success: false, error: 'eventIds array cannot be empty' },
          { status: 400 }
        );
      }
      
      if (eventIds.length > 100) {
        return NextResponse.json(
          { success: false, error: 'Maximum 100 events per batch' },
          { status: 400 }
        );
      }
      
      const results = await generateEventEmbeddingsByIds(eventIds, forceRecompute);
      
      // Format results
      const formattedResults: Record<string, unknown> = {};
      let successCount = 0;
      let failCount = 0;
      
      for (const [id, embedding] of Array.from(results.entries())) {
        if (embedding) {
          formattedResults[id] = {
            id: embedding.id,
            name: embedding.name,
            lineup: embedding.lineup,
            embeddingMethod: embedding.embeddingMethod,
            hasEmbedding: true,
          };
          successCount++;
        } else {
          formattedResults[id] = null;
          failCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        results: formattedResults,
        stats: {
          requested: eventIds.length,
          success: successCount,
          failed: failCount,
        },
      });
    }
    
    // Handle concert ingestion request
    if (isConcertRequest(body)) {
      const { concerts } = body;
      
      if (concerts.length === 0) {
        return NextResponse.json(
          { success: false, error: 'concerts array cannot be empty' },
          { status: 400 }
        );
      }
      
      if (concerts.length > 50) {
        return NextResponse.json(
          { success: false, error: 'Maximum 50 concerts per batch' },
          { status: 400 }
        );
      }
      
      // Validate concert data
      for (const concert of concerts) {
        if (!concert.id || !concert.artists || !concert.source) {
          return NextResponse.json(
            { success: false, error: 'Each concert must have id, artists, and source' },
            { status: 400 }
          );
        }
      }
      
      const results = await triggerEventEmbeddingsBatch(concerts);
      
      // Format results
      const formattedResults: Record<string, unknown> = {};
      let successCount = 0;
      let failCount = 0;
      
      for (const [id, embedding] of Array.from(results.entries())) {
        if (embedding) {
          formattedResults[id] = {
            embeddingId: embedding.id,
            name: embedding.name,
            lineup: embedding.lineup,
            embeddingMethod: embedding.embeddingMethod,
            lineupArtistIds: embedding.lineupArtistIds,
          };
          successCount++;
        } else {
          formattedResults[id] = null;
          failCount++;
        }
      }
      
      return NextResponse.json({
        success: true,
        results: formattedResults,
        stats: {
          requested: concerts.length,
          generated: successCount,
          failed: failCount,
        },
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid request body. Provide eventId, eventIds[], or concerts[]' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Error generating event embeddings:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/embeddings/event/generate
 * 
 * Get embedding generation stats
 */
export async function GET() {
  try {
    const stats = await getEventEmbeddingStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting embedding stats:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
