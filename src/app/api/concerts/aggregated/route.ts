import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchAllConcertSources, type ConcertSource } from "@/lib/concert-aggregator";
import { getUnifiedMusicProfile } from "@/lib/supabase";
import { calculateMatchScore } from "@/lib/utils";

/**
 * GET /api/concerts/aggregated
 * Search concerts across multiple ticket sources (Ticketmaster, SeatGeek, Bandsintown)
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
    if (includeArtistSearch) {
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        const profile = await getUnifiedMusicProfile(session.user.id);
        if (profile?.topArtists) {
          artistNames = profile.topArtists.slice(0, 30).map(a => 
            typeof a === "string" ? a : a.name
          );
        }
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
    const session = await getServerSession(authOptions);
    
    if (session?.user?.id) {
      const profile = await getUnifiedMusicProfile(session.user.id);
      
      if (profile) {
        const userArtistNames = profile.topArtists.map(a => 
          typeof a === "string" ? a : a.name
        );
        const userGenres = profile.topGenres || [];
        
        concertsWithScores = result.concerts.map(concert => {
          const matchResult = calculateMatchScore(
            concert.artists,
            concert.genres,
            userArtistNames,
            userGenres
          );
          return {
            ...concert,
            matchScore: matchResult.score,
            matchReasons: matchResult.reasons,
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
    
    return NextResponse.json({
      concerts: concertsWithScores,
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
