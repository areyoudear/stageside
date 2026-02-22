/**
 * Event Matching API - Vector-based concert recommendations
 * 
 * GET /api/matches/events
 * 
 * Params:
 * - lat: number (required with lng)
 * - lng: number (required with lat) 
 * - radius: number (miles, default 50)
 * - startDate: YYYY-MM-DD (default today)
 * - endDate: YYYY-MM-DD (default +3 months)
 * - limit: number (default 50)
 * - explain: boolean (optional, generates LLM explanations)
 * 
 * Returns events ranked by vector similarity with ranking modifiers.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getEffectiveEmbedding, getOrCreateUserEmbedding } from "@/lib/embeddings/user-embeddings";
import { cosineSimilarity } from "@/lib/embeddings/embedding-service";
import { EmbeddingVector } from "@/lib/embeddings/types";
import { generateMatchExplanation, getCachedExplanation } from "../_lib/explanations";

// Ranking modifier weights
const DISTANCE_WEIGHT = 0.05;      // Slight preference for closer events
const POPULARITY_WEIGHT = 0.03;   // Small boost for popular events  
const AVAILABILITY_WEIGHT = 0.02; // Small boost for available tickets

interface EventWithEmbedding {
  id: string;
  external_id: string;
  source: string;
  name: string;
  venue_name: string | null;
  city: string | null;
  date: string | null;
  lineup: string[];
  embedding: number[] | null;
  // Extended fields from concert_cache
  ticket_url?: string;
  price_min?: number;
  price_max?: number;
  image_url?: string;
  lat?: number;
  lng?: number;
}

interface RankedEvent {
  id: string;
  externalId: string;
  source: string;
  name: string;
  venueName: string | null;
  city: string | null;
  date: string | null;
  lineup: string[];
  ticketUrl?: string;
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  // Match data
  similarityScore: number;
  finalScore: number;
  matchTier: 'perfect' | 'great' | 'good' | 'discovery';
  distanceModifier: number;
  popularityModifier: number;
  explanation?: string;
}

/**
 * Calculate distance between two points in miles
 */
function haversineDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Get match tier based on similarity score
 */
function getMatchTier(similarity: number): 'perfect' | 'great' | 'good' | 'discovery' {
  if (similarity >= 0.85) return 'perfect';
  if (similarity >= 0.70) return 'great';
  if (similarity >= 0.50) return 'good';
  return 'discovery';
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Parse parameters
    const lat = parseFloat(searchParams.get("lat") || "");
    const lng = parseFloat(searchParams.get("lng") || "");
    const radius = parseInt(searchParams.get("radius") || "50");
    const limit = parseInt(searchParams.get("limit") || "50");
    const shouldExplain = searchParams.get("explain") === "true";
    
    // Parse dates
    const today = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
    
    const startDate = searchParams.get("startDate") || today.toISOString().split("T")[0];
    const endDate = searchParams.get("endDate") || defaultEndDate.toISOString().split("T")[0];

    // Validate location
    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "lat and lng parameters are required" },
        { status: 400 }
      );
    }

    // Get user's effective embedding
    const userTaste = await getOrCreateUserEmbedding(session.user.id);
    
    if (!userTaste?.coreEmbedding) {
      return NextResponse.json({
        events: [],
        hasEmbedding: false,
        message: "Complete onboarding to get personalized matches",
      });
    }

    const effectiveEmbedding = getEffectiveEmbedding(userTaste);
    
    if (!effectiveEmbedding) {
      return NextResponse.json({
        events: [],
        hasEmbedding: false,
        message: "Unable to compute taste embedding",
      });
    }

    const supabase = createAdminClient();

    // Query events with embeddings, filtered by date
    // We fetch more than limit to allow for post-filtering
    const { data: events, error } = await supabase
      .from("event_embeddings")
      .select(`
        id,
        external_id,
        source,
        name,
        venue_name,
        city,
        date,
        lineup,
        embedding
      `)
      .gte("date", startDate)
      .lte("date", endDate)
      .not("embedding", "is", null)
      .limit(limit * 3);

    if (error) {
      console.error("Error fetching events:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    // Also get concert cache data for enrichment
    const externalIds = events?.map(e => e.external_id) || [];
    const { data: cacheData } = await supabase
      .from("concert_cache")
      .select("external_id, ticket_url, price_min, price_max, image_url")
      .in("external_id", externalIds);

    const cacheMap = new Map<string, { external_id: string; ticket_url?: string; price_min?: number; price_max?: number; image_url?: string }>(
      cacheData?.map(c => [c.external_id, c]) || []
    );

    // Score and rank events
    const rankedEvents: RankedEvent[] = [];

    for (const event of events || []) {
      if (!event.embedding) continue;

      // Calculate cosine similarity
      const similarity = cosineSimilarity(
        effectiveEmbedding,
        event.embedding as EmbeddingVector
      );

      // Calculate distance modifier (if we have venue coordinates)
      // For now, use city-based approximate filtering
      let distanceModifier = 0;
      
      // Popularity modifier (placeholder - would use ticket sales data)
      const popularityModifier = 0;
      
      // Availability modifier (placeholder - would check ticket availability)
      const availabilityModifier = 0;

      // Final score: similarity + modifiers
      const finalScore = Math.min(1, Math.max(0,
        similarity +
        (distanceModifier * DISTANCE_WEIGHT) +
        (popularityModifier * POPULARITY_WEIGHT) +
        (availabilityModifier * AVAILABILITY_WEIGHT)
      ));

      const cache = cacheMap.get(event.external_id);

      rankedEvents.push({
        id: event.id,
        externalId: event.external_id,
        source: event.source,
        name: event.name,
        venueName: event.venue_name,
        city: event.city,
        date: event.date,
        lineup: event.lineup,
        ticketUrl: cache?.ticket_url,
        priceMin: cache?.price_min,
        priceMax: cache?.price_max,
        imageUrl: cache?.image_url,
        similarityScore: similarity,
        finalScore,
        matchTier: getMatchTier(similarity),
        distanceModifier,
        popularityModifier,
      });
    }

    // Sort by final score descending
    rankedEvents.sort((a, b) => b.finalScore - a.finalScore);

    // Limit results
    const topEvents = rankedEvents.slice(0, limit);

    // Generate explanations if requested (for top results only)
    if (shouldExplain) {
      const topToExplain = topEvents.slice(0, 10);
      
      await Promise.all(
        topToExplain.map(async (event) => {
          // Check cache first
          const cached = await getCachedExplanation(
            session.user.id,
            event.id,
            "event"
          );
          
          if (cached) {
            event.explanation = cached;
          } else {
            // Generate new explanation
            const explanation = await generateMatchExplanation(
              session.user.id,
              event.id,
              "event",
              {
                similarity: event.similarityScore,
                tier: event.matchTier,
                lineup: event.lineup,
              }
            );
            event.explanation = explanation;
          }
        })
      );
    }

    // Group by match tier for UI
    const byTier = {
      perfect: topEvents.filter(e => e.matchTier === 'perfect').length,
      great: topEvents.filter(e => e.matchTier === 'great').length,
      good: topEvents.filter(e => e.matchTier === 'good').length,
      discovery: topEvents.filter(e => e.matchTier === 'discovery').length,
    };

    return NextResponse.json({
      events: topEvents,
      total: rankedEvents.length,
      returned: topEvents.length,
      byTier,
      hasEmbedding: true,
      embeddingUpdatedAt: userTaste.coreUpdatedAt,
    });

  } catch (error) {
    console.error("Error in /api/matches/events:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
