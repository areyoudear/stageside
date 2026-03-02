/**
 * Event Matching API - Vector-based concert recommendations
 * 
 * GET /api/matches/events
 * 
 * Params:
 * - city: string (city name)
 * - lat: number (optional, with lng for geo search)
 * - lng: number (optional, with lat for geo search)
 * - radius: number (miles, default 50)
 * - startDate: YYYY-MM-DD (default today)
 * - endDate: YYYY-MM-DD (default +3 months)
 * - limit: number (default 50)
 * 
 * Returns events ranked by vector similarity to user's taste.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Concert } from "@/lib/ticketmaster";
import { searchAllConcertSources } from "@/lib/concert-aggregator";
import { getOrCreateUserEmbedding, getEffectiveEmbedding } from "@/lib/embeddings/user-embeddings";
import { getOrCreateEventEmbedding } from "@/lib/embeddings/event-embeddings";
import { cosineSimilarity } from "@/lib/embeddings/embedding-service";
import { EmbeddingVector } from "@/lib/embeddings/types";
import { enrichConcertsWithPreviews, enrichConcertsWithPrices } from "@/lib/concert-enrichment";
import { getSavedConcerts, getUnifiedMusicProfile } from "@/lib/supabase";

// Match tier thresholds
function getMatchTier(similarity: number): 'perfect' | 'great' | 'good' | 'discovery' {
  if (similarity >= 0.80) return 'perfect';
  if (similarity >= 0.65) return 'great';
  if (similarity >= 0.45) return 'good';
  return 'discovery';
}

// Convert similarity (0-1) to display percentage (0-100)
function toDisplayScore(similarity: number): number {
  return Math.round(similarity * 100);
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
    const city = searchParams.get("city") || undefined;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = parseInt(searchParams.get("radius") || "50");
    const limit = parseInt(searchParams.get("limit") || "100");
    
    // Build latLong if provided
    let latLong: string | undefined;
    if (lat && lng) {
      latLong = `${lat},${lng}`;
    }
    
    if (!city && !latLong) {
      return NextResponse.json(
        { error: "Please provide either city or lat/lng coordinates" },
        { status: 400 }
      );
    }
    
    // Parse dates
    const today = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
    
    const startDateStr = searchParams.get("startDate") || today.toISOString().split("T")[0];
    const endDateStr = searchParams.get("endDate") || defaultEndDate.toISOString().split("T")[0];
    const startDate = `${startDateStr}T00:00:00Z`;
    const endDate = `${endDateStr}T23:59:59Z`;

    // Get user's taste embedding and music profile for Bandsintown
    const [userTaste, musicProfile] = await Promise.all([
      getOrCreateUserEmbedding(session.user.id),
      getUnifiedMusicProfile(session.user.id),
    ]);
    
    // Get artist names for Bandsintown search
    const artistNames = musicProfile?.topArtists?.slice(0, 20).map(a => a.name) || [];
    
    // Search all sources: Ticketmaster + SeatGeek + Bandsintown
    const concertsResult = await searchAllConcertSources({
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      city: city || undefined,
      radiusMiles: radius,
      dateFrom: startDateStr,
      dateTo: endDateStr,
      artistNames, // For Bandsintown
      sources: ["ticketmaster", "seatgeek", "bandsintown"],
    });
    
    if (!userTaste?.coreEmbedding) {
      // Fallback to non-personalized results
      return NextResponse.json({
        concerts: concertsResult.concerts.map(c => ({
          ...c,
          matchScore: 0,
          matchTier: 'discovery' as const,
          matchReasons: ["Connect Spotify or complete onboarding for personalized matches"],
        })),
        totalElements: concertsResult.concerts.length,
        sourceBreakdown: concertsResult.totalBySource,
        hasEmbedding: false,
        message: "Sync Spotify or complete onboarding for personalized matches",
      });
    }

    const userEmbedding = getEffectiveEmbedding(userTaste);
    
    if (!userEmbedding) {
      return NextResponse.json({
        concerts: [],
        hasEmbedding: false,
        message: "Unable to compute taste embedding",
      });
    }

    // Get saved concerts
    const savedConcertIds = await getSavedConcerts(session.user.id);

    // Generate embeddings and compute similarity for each concert
    const matchedConcerts = await Promise.all(
      concertsResult.concerts.map(async (concert) => {
        try {
          // Get or create event embedding
          // Use the primary source from the aggregated concert
          const primarySource = (concert as any).sources?.[0] || 'ticketmaster';
          const eventEmbedding = await getOrCreateEventEmbedding({
            externalId: concert.id,
            source: primarySource,
            name: concert.name,
            venueName: concert.venue.name,
            city: concert.venue.city,
            date: concert.date,
            lineup: concert.artists,
          });

          if (!eventEmbedding?.embedding) {
            // No embedding - skip this concert (will be filtered out)
            return null;
          }

          // Compute cosine similarity
          const similarity = cosineSimilarity(
            userEmbedding as EmbeddingVector,
            eventEmbedding.embedding as EmbeddingVector
          );

          const matchTier = getMatchTier(similarity);
          const matchScore = toDisplayScore(similarity);

          // Generate match reasons based on tier
          let matchReasons: string[] = [];
          if (matchTier === 'perfect') {
            matchReasons = [`Perfect match for your taste!`];
          } else if (matchTier === 'great') {
            matchReasons = [`Strong match based on your music profile`];
          } else if (matchTier === 'good') {
            matchReasons = [`Matches your general vibe`];
          } else {
            matchReasons = [`Discover something new`];
          }

          return {
            ...concert,
            matchScore,
            rawSimilarity: similarity,
            matchTier,
            matchReasons,
            isSaved: savedConcertIds.includes(concert.id),
          };
        } catch (error) {
          console.error(`Error processing concert ${concert.id}:`, error);
          // Skip concerts that failed embedding - will be filtered out
          return null;
        }
      })
    );

    // Filter out concerts that couldn't be analyzed (null values)
    const analyzedConcerts = matchedConcerts.filter((c): c is NonNullable<typeof c> => c !== null);

    // Sort by similarity (highest first)
    analyzedConcerts.sort((a, b) => {
      if (b.rawSimilarity !== a.rawSimilarity) {
        return b.rawSimilarity - a.rawSimilarity;
      }
      // Secondary sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    // Enrich concerts with audio previews (all of them for better UX)
    let enrichedConcerts = await enrichConcertsWithPreviews(analyzedConcerts, 100);
    
    // Enrich concerts missing prices from SeatGeek
    const parsedLat = lat ? parseFloat(lat) : undefined;
    const parsedLng = lng ? parseFloat(lng) : undefined;
    enrichedConcerts = await enrichConcertsWithPrices(enrichedConcerts, parsedLat, parsedLng, radius);

    // Count by tier
    const tierCounts = {
      perfect: enrichedConcerts.filter(c => c.matchTier === 'perfect').length,
      great: enrichedConcerts.filter(c => c.matchTier === 'great').length,
      good: enrichedConcerts.filter(c => c.matchTier === 'good').length,
      discovery: enrichedConcerts.filter(c => c.matchTier === 'discovery').length,
    };

    return NextResponse.json({
      concerts: enrichedConcerts,
      categories: tierCounts,
      highMatches: tierCounts.perfect + tierCounts.great, // For dashboard compatibility
      totalElements: enrichedConcerts.length,
      sourceBreakdown: concertsResult.totalBySource, // Shows count from each provider
      searchedSources: concertsResult.searchedSources,
      hasEmbedding: true,
      hasProfile: true,
    });
  } catch (error) {
    console.error("Error in /api/matches/events:", error);
    return NextResponse.json(
      { error: "Failed to fetch personalized concerts" },
      { status: 500 }
    );
  }
}
