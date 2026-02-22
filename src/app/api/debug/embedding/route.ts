/**
 * Debug endpoint for testing embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateEmbedding, getEmbeddingConfig } from '@/lib/embeddings/embedding-service';
import { getOrCreateArtistEmbedding } from '@/lib/embeddings/artist-embeddings';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, text, artistName } = body;

    const config = getEmbeddingConfig();
    console.log('Embedding config:', { provider: config.provider, model: config.model, dimensions: config.dimensions });

    if (action === 'test-embedding') {
      // Test raw embedding generation
      const testText = text || 'Test embedding for The Weeknd, a pop/R&B artist';
      console.log('Generating embedding for:', testText);
      
      const embedding = await generateEmbedding(testText);
      
      return NextResponse.json({
        success: true,
        config: { provider: config.provider, model: config.model, dimensions: config.dimensions },
        embeddingLength: embedding.length,
        sample: embedding.slice(0, 5),
      });
    }

    if (action === 'test-artist') {
      // Test artist embedding
      const name = artistName || 'The Weeknd';
      console.log('Getting/creating artist embedding for:', name);
      
      const artistEmb = await getOrCreateArtistEmbedding({ name });
      
      return NextResponse.json({
        success: true,
        artist: artistEmb.name,
        hasEmbedding: !!artistEmb.embedding,
        embeddingLength: artistEmb.embedding?.length || 0,
        metadata: artistEmb.metadata,
        embeddingInput: artistEmb.embeddingInput?.slice(0, 200),
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Debug embedding error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}
