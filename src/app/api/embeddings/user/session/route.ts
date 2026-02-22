/**
 * Session Embedding API
 * 
 * POST /api/embeddings/user/session
 * Log user interactions for session embedding updates.
 * 
 * Request body:
 * {
 *   interactions: [{
 *     entityType: 'artist' | 'event' | 'festival',
 *     entityId: string,
 *     entityName?: string,
 *     interactionType: 'click' | 'view' | 'save' | 'purchase' | 'share' | 'browse' | 'search' | 'dismiss',
 *     metadata?: object
 *   }]
 * }
 * 
 * GET /api/embeddings/user/session
 * Get current effective embedding (core + session)
 * 
 * PATCH /api/embeddings/user/session
 * Force recalculate session embedding
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  logInteractionsBatch, 
  updateUserSessionEmbedding,
  getRecentInteractions,
  InteractionType,
  INTERACTION_WEIGHTS 
} from '@/lib/embeddings/session-embeddings';
import { getUserEffectiveEmbedding } from '@/lib/embeddings/user-embedding-builder';

interface InteractionInput {
  entityType: 'artist' | 'event' | 'festival';
  entityId: string;
  entityName?: string;
  interactionType: InteractionType;
  metadata?: Record<string, unknown>;
}

interface SessionRequestBody {
  interactions: InteractionInput[];
}

/**
 * POST: Log interactions
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: SessionRequestBody = await request.json();
    
    if (!body.interactions || !Array.isArray(body.interactions)) {
      return NextResponse.json(
        { error: 'interactions array required' },
        { status: 400 }
      );
    }
    
    // Validate interactions
    const validTypes = ['artist', 'event', 'festival'];
    const validInteractions = Object.keys(INTERACTION_WEIGHTS);
    
    for (const interaction of body.interactions) {
      if (!validTypes.includes(interaction.entityType)) {
        return NextResponse.json(
          { error: `Invalid entityType: ${interaction.entityType}` },
          { status: 400 }
        );
      }
      
      if (!interaction.entityId) {
        return NextResponse.json(
          { error: 'entityId required for each interaction' },
          { status: 400 }
        );
      }
      
      if (!validInteractions.includes(interaction.interactionType)) {
        return NextResponse.json(
          { error: `Invalid interactionType: ${interaction.interactionType}. Valid: ${validInteractions.join(', ')}` },
          { status: 400 }
        );
      }
    }
    
    // Log all interactions
    await logInteractionsBatch(
      body.interactions.map(i => ({
        userId: session.user.id,
        entityType: i.entityType,
        entityId: i.entityId,
        entityName: i.entityName,
        interactionType: i.interactionType,
        metadata: i.metadata,
        timestamp: new Date(),
      }))
    );
    
    // Optionally update session embedding immediately
    // (or do this in a background job for better performance)
    const shouldUpdateNow = request.headers.get('X-Update-Session') === 'true';
    
    if (shouldUpdateNow) {
      await updateUserSessionEmbedding(session.user.id);
    }
    
    return NextResponse.json({
      success: true,
      logged: body.interactions.length,
    });
  } catch (error) {
    console.error('Error logging interactions:', error);
    return NextResponse.json(
      { error: 'Failed to log interactions' },
      { status: 500 }
    );
  }
}

/**
 * GET: Get effective embedding
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const sessionWeight = parseFloat(searchParams.get('sessionWeight') || '0.3');
    const includeRecent = searchParams.get('includeRecent') === 'true';
    
    // Get effective embedding
    const embedding = await getUserEffectiveEmbedding(
      session.user.id,
      sessionWeight
    );
    
    if (!embedding) {
      return NextResponse.json(
        { error: 'No embedding found. Complete onboarding first.' },
        { status: 404 }
      );
    }
    
    const response: Record<string, unknown> = {
      success: true,
      hasEmbedding: true,
      embeddingDimensions: embedding.length,
      sessionWeight,
    };
    
    // Optionally include recent interactions
    if (includeRecent) {
      const interactions = await getRecentInteractions(session.user.id, 48);
      response.recentInteractions = interactions.slice(0, 20).map(i => ({
        entityType: i.entityType,
        entityName: i.entityName,
        interactionType: i.interactionType,
        timestamp: i.timestamp,
      }));
    }
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error getting session info:', error);
    return NextResponse.json(
      { error: 'Failed to get session info' },
      { status: 500 }
    );
  }
}

/**
 * PATCH: Force recalculate session embedding
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const decayHours = parseInt(searchParams.get('decayHours') || '48', 10);
    
    await updateUserSessionEmbedding(session.user.id, decayHours);
    
    return NextResponse.json({
      success: true,
      message: 'Session embedding updated',
      decayHours,
    });
  } catch (error) {
    console.error('Error updating session embedding:', error);
    return NextResponse.json(
      { error: 'Failed to update session embedding' },
      { status: 500 }
    );
  }
}
