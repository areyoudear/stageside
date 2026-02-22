import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchAllConcertSources, type ConcertSource } from "@/lib/concert-aggregator";
import { getUnifiedMusicProfile, getRelatedArtists, getMusicConnection } from "@/lib/supabase";
import { 
  calculatePreciseMatchScore, 
  generateVibeTags,
  type UserProfile,
  type UserAudioProfile,
  type ArtistAudioProfile,
} from "@/lib/matching";
import { enrichConcertsWithPreviews } from "@/lib/concert-enrichment";

/**
 * GET /api/concerts/aggregated
 * Search concerts across multiple ticket sources with precision matching
 * 
 * Query params:
 * - lat: Latitude
 * - lng: Longitude  
 * - city: City name (fallback if no lat/lng)
 * - radius: Search radius in miles (default: 50)
 * - startDate: Start date YYYY-MM-DD
 * - endDate: End date YYYY-MM-DD
 * - sources: Comma-separated list of sources to query (ticketmaster,seatgeek,bandsintown)
 * - includeArtistSearch: Whether to search Bandsintown by user's artists (default: true)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Parse parameters
    const lat = searchParams.get("lat") ? parseFloat(searchParams.get("lat")!) : undefined;
    const lng = searchParams.get("lng") ? parseFloat(searchParams.get("lng")!) : undefined;
    const city = searchParams.get("city") || undefined;
    const radius = parseInt(searchParams.get("radius") || "50");
    const includeArtistSearch = searchParams.get("includeArtistSearch") !== "false";
    
    // Parse dates
    const today = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
    
    const dateFrom = searchParams.get("startDate") || today.toISOString().split("T")[0];
    const dateTo = searchParams.get("endDate") || defaultEndDate.toISOString().split("T")[0];
    
    // Parse sources
    const sourcesParam = searchParams.get("sources");
    const sources = sourcesParam 
      ? sourcesParam.split(",") as ConcertSource[]
      : undefined; // Will use all enabled sources
    
    // Get user's artists for Bandsintown search (if authenticated)
    let artistNames: string[] | undefined;
    const session = await getServerSession(authOptions);
    
    if (includeArtistSearch && session?.user?.id) {
      const profile = await getUnifiedMusicProfile(session.user.id);
      if (profile?.topArtists) {
        artistNames = profile.topArtists.slice(0, 30).map(a => 
          typeof a === "string" ? a : a.name
        );
      }
    }
    
    // Validate location
    if (!lat && !lng && !city) {
      return NextResponse.json(
        { error: "Location required (lat/lng or city)" },
        { status: 400 }
      );
    }
    
    // Search all sources
    const result = await searchAllConcertSources({
      lat,
      lng,
      city,
      radiusMiles: radius,
      dateFrom,
      dateTo,
      artistNames,
      sources,
    });
    
    // Calculate match scores if user is authenticated
    let concertsWithScores = result.concerts;
    
    let spotifyToken: string | undefined;
    
    if (session?.user?.id) {
      const [profile, relatedArtistsData, spotifyConnection] = await Promise.all([
        getUnifiedMusicProfile(session.user.id),
        getRelatedArtists(session.user.id).catch(() => []),
        getMusicConnection(session.user.id, "spotify").catch(() => null),
      ]);
      
      spotifyToken = spotifyConnection?.access_token;
      
      if (profile) {
        // Build user profile for precision matching
        const userProfile: UserProfile = {
          topArtists: profile.topArtists.map((a, index) => ({
            name: typeof a === "string" ? a : a.name,
            rank: index + 1,
            genres: typeof a === "string" ? [] : (a.genres || []),
          })),
          relatedArtists: relatedArtistsData.map((r) => ({
            name: r.artist_name,
            relatedTo: r.related_to,
            similarity: (r.popularity || 50) / 100,
          })),
          topGenres: profile.topGenres || [],
          recentlyPlayed: [],
        };
        
        // TODO: Fetch audio profiles when available
        const userAudioProfile: UserAudioProfile | null = null;
        const artistAudioProfiles = new Map<string, ArtistAudioProfile>();
        
        concertsWithScores = result.concerts.map(concert => {
          const matchResult = calculatePreciseMatchScore(
            concert.artists,
            concert.genres,
            userProfile,
            userAudioProfile,
            artistAudioProfiles,
            { friendsInterested: 0, friendsGoing: 0 }
          );
          
          const vibeTags = generateVibeTags(matchResult.matchType, concert.genres);
          
          return {
            ...concert,
            matchScore: matchResult.score,
            matchReasons: matchResult.reasons,
            matchType: matchResult.matchType,
            matchConfidence: matchResult.confidence,
            scoreBreakdown: matchResult.breakdown,
            vibeTags,
          };
        });
        
        // Sort by match score (highest first), then by date
        concertsWithScores.sort((a, b) => {
          if ((b.matchScore || 0) !== (a.matchScore || 0)) {
            return (b.matchScore || 0) - (a.matchScore || 0);
          }
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });
      }
    }
    
    // Enrich concerts with audio previews (top 30)
    // Uses iTunes Search API (free, no auth required)
    const enrichedConcerts = await enrichConcertsWithPreviews(concertsWithScores, 30);
    
    // Categorize by match type (use type assertion for enhanced concerts)
    type EnhancedConcert = typeof enrichedConcerts[number] & { matchType?: string };
    const categories = {
      mustSee: enrichedConcerts.filter(c => (c as EnhancedConcert).matchType === "must-see").length,
      forYou: enrichedConcerts.filter(c => (c as EnhancedConcert).matchType === "for-you").length,
      vibeMatch: enrichedConcerts.filter(c => (c as EnhancedConcert).matchType === "vibe-match").length,
      discovery: enrichedConcerts.filter(c => (c as EnhancedConcert).matchType === "discovery").length,
    };
    
    return NextResponse.json({
      concerts: enrichedConcerts,
      categories,
      meta: {
        totalConcerts: result.concerts.length,
        bySource: result.totalBySource,
        searchedSources: result.searchedSources,
        location: city || (lat && lng ? `${lat},${lng}` : "Unknown"),
        dateRange: { from: dateFrom, to: dateTo },
      },
    });
  } catch (error) {
    console.error("Error in aggregated concerts search:", error);
    return NextResponse.json(
      { error: "Failed to search concerts" },
      { status: 500 }
    );
  }
}
