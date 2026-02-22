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
    const rawProvider = process.env.EMBEDDING_PROVIDER;
    console.log('Embedding config:', { provider: config.provider, model: config.model, dimensions: config.dimensions, rawProvider });

    if (action === 'config') {
      return NextResponse.json({
        provider: config.provider,
        model: config.model,
        dimensions: config.dimensions,
        rawEnvProvider: rawProvider || 'undefined',
        hasVoyageKey: !!process.env.VOYAGE_API_KEY,
        hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      });
    }

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

    if (action === 'batch-anchors') {
      // Batch initialize all anchors
      const { createClient } = await import('@supabase/supabase-js');
      const { ANCHOR_DEFINITIONS } = await import('@/lib/embeddings/anchor-vectors');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      // Delete all existing
      await supabase.from('embedding_anchors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      // Generate all embeddings in batch
      const defs = Object.entries(ANCHOR_DEFINITIONS);
      const descriptions = defs.map(([, def]) => def.description);
      
      const { generateEmbeddings } = await import('@/lib/embeddings/embedding-service');
      const embeddings = await generateEmbeddings(descriptions);
      
      // Insert all at once
      const rows = defs.map(([key, def], i) => ({
        anchor_type: def.type,
        anchor_name: def.name,
        embedding: embeddings[i],
        description: def.description,
        default_weight: 0.2,
      }));
      
      const { error } = await supabase.from('embedding_anchors').insert(rows);
      
      if (error) {
        return NextResponse.json({ success: false, error: error.message });
      }
      
      return NextResponse.json({ success: true, count: rows.length });
    }

    if (action === 'test-anchor') {
      // Test anchor insert
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const testDesc = 'Test anchor for debugging';
      const embedding = await generateEmbedding(testDesc);
      
      const { data, error } = await supabase
        .from('embedding_anchors')
        .insert({
          anchor_type: 'test',
          anchor_name: 'debug',
          embedding: embedding,
          description: testDesc,
          default_weight: 0.1,
        })
        .select()
        .single();
        
      if (error) {
        return NextResponse.json({
          success: false,
          error: error.message,
          details: error,
          embeddingLength: embedding.length,
        });
      }
      
      return NextResponse.json({
        success: true,
        data: { id: data.id, hasEmbedding: !!data.embedding },
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
