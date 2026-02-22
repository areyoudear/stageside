/**
 * Anchor Vectors Admin API
 * 
 * POST /api/embeddings/anchors - Initialize anchor vectors (admin only)
 * GET /api/embeddings/anchors - List all anchor vectors
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  initializeAnchorVectors, 
  getAnchorVectors,
  ANCHOR_DEFINITIONS 
} from '@/lib/embeddings/anchor-vectors';

/**
 * POST: Initialize anchor vectors
 * Requires admin role
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
    
    // Check for admin role (adjust based on your auth setup)
    const isAdmin = (session.user as { role?: string }).role === 'admin' ||
                    process.env.NODE_ENV === 'development';
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }
    
    // Force re-initialization if requested
    const force = request.nextUrl.searchParams.get('force') === 'true';
    
    if (force) {
      // Delete existing anchors first
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      await supabase.from('embedding_anchors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
    
    await initializeAnchorVectors();
    
    return NextResponse.json({
      success: true,
      message: 'Anchor vectors initialized',
      anchorCount: Object.keys(ANCHOR_DEFINITIONS).length,
    });
  } catch (error) {
    console.error('Error initializing anchors:', error);
    return NextResponse.json(
      { error: 'Failed to initialize anchor vectors' },
      { status: 500 }
    );
  }
}

/**
 * GET: List anchor vectors
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const anchors = await getAnchorVectors();
    
    // Return summary without full embeddings
    const summary = Array.from(anchors.values()).map(anchor => ({
      id: anchor.id,
      type: anchor.anchorType,
      name: anchor.anchorName,
      description: anchor.description,
      defaultWeight: anchor.defaultWeight,
      haEmbedding: !!anchor.embedding,
    }));
    
    return NextResponse.json({
      success: true,
      count: summary.length,
      anchors: summary,
      definitions: Object.keys(ANCHOR_DEFINITIONS),
    });
  } catch (error) {
    console.error('Error fetching anchors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch anchor vectors' },
      { status: 500 }
    );
  }
}
