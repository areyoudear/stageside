/**
 * Concert Aggregator
 * Combines results from multiple ticket sources:
 * - Ticketmaster (primary, global coverage)
 * - SeatGeek (secondary market, good prices)
 * - Bandsintown (indie coverage, artist-centric)
 * 
 * Handles deduplication and merging of results using the
 * enhanced deduplication system.
 */

import { searchConcerts as searchTicketmaster, type Concert } from "./ticketmaster";
import { searchSeatGeekAsUnified, type SeatGeekSearchParams } from "./seatgeek";
import { searchBandsintownForArtists } from "./bandsintown";
import { 
  deduplicateConcerts, 
  type DeduplicatedConcert, 
  type TicketSource 
} from "./concert-dedup";

export type ConcertSource = "ticketmaster" | "seatgeek" | "bandsintown";

// Re-export types from concert-dedup for convenience
export type { DeduplicatedConcert, TicketSource };

// Legacy interface for backward compatibility
export interface AggregatedConcert extends Concert {
  sources: ConcertSource[];
  alternateUrls?: { source: ConcertSource; url: string }[];
  bestPrice?: {
    min: number;
    max: number;
    source: ConcertSource;
  };
}

export interface AggregatorSearchParams {
  lat?: number;
  lng?: number;
  city?: string;
  radiusMiles?: number;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  artistNames?: string[]; // For Bandsintown lookups
  sources?: ConcertSource[]; // Which sources to query (default: all configured)
}

interface AggregatorResult {
  concerts: AggregatedConcert[];
  totalBySource: Record<ConcertSource, number>;
  searchedSources: ConcertSource[];
}

// Enhanced result with deduplicated concerts
export interface EnhancedAggregatorResult {
  concerts: DeduplicatedConcert[];
  totalBySource: Record<ConcertSource, number>;
  searchedSources: ConcertSource[];
  totalBeforeDedup: number;
  totalAfterDedup: number;
}

/**
 * Normalize artist/event names for comparison
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check if two concerts are likely the same event
 */
function isSameConcert(a: Concert, b: Concert): boolean {
  // Must be same date
  if (a.date !== b.date) return false;
  
  // Check if any artist matches
  const aArtists = a.artists.map(normalizeName);
  const bArtists = b.artists.map(normalizeName);
  
  const hasArtistMatch = aArtists.some(aArtist => 
    bArtists.some(bArtist => 
      aArtist.includes(bArtist) || bArtist.includes(aArtist)
    )
  );
  
  if (!hasArtistMatch) return false;
  
  // Check venue similarity (same city is usually enough with artist match)
  const aVenue = normalizeName(a.venue.name);
  const bVenue = normalizeName(b.venue.name);
  const aCity = normalizeName(a.venue.city);
  const bCity = normalizeName(b.venue.city);
  
  const sameVenue = aVenue.includes(bVenue) || bVenue.includes(aVenue);
  const sameCity = aCity === bCity || aCity.includes(bCity) || bCity.includes(aCity);
  
  return sameVenue || sameCity;
}

/**
 * Merge two concerts that represent the same event
 */
function mergeConcerts(primary: AggregatedConcert, secondary: Concert, source: ConcertSource): AggregatedConcert {
  const merged = { ...primary };
  
  // Add source
  if (!merged.sources.includes(source)) {
    merged.sources.push(source);
  }
  
  // Add alternate ticket URL
  if (!merged.alternateUrls) {
    merged.alternateUrls = [];
  }
  if (secondary.ticketUrl && secondary.ticketUrl !== primary.ticketUrl) {
    merged.alternateUrls.push({ source, url: secondary.ticketUrl });
  }
  
  // Update best price if secondary has better pricing
  if (secondary.priceRange) {
    if (!merged.bestPrice || secondary.priceRange.min < merged.bestPrice.min) {
      merged.bestPrice = {
        min: secondary.priceRange.min,
        max: secondary.priceRange.max,
        source,
      };
    }
  }
  
  // Merge genres
  if (secondary.genres?.length) {
    const existingGenres = new Set(merged.genres);
    secondary.genres.forEach(g => existingGenres.add(g));
    merged.genres = Array.from(existingGenres);
  }
  
  // Prefer Ticketmaster image (usually higher quality)
  if (!merged.imageUrl || merged.imageUrl === "/placeholder-concert.jpg") {
    merged.imageUrl = secondary.imageUrl;
  }
  
  return merged;
}

/**
 * Main aggregator function - search all configured sources
 */
export async function searchAllConcertSources(
  params: AggregatorSearchParams
): Promise<AggregatorResult> {
  const enabledSources = params.sources || getEnabledSources();
  const results: { source: ConcertSource; concerts: Concert[] }[] = [];
  const totalBySource: Record<ConcertSource, number> = {
    ticketmaster: 0,
    seatgeek: 0,
    bandsintown: 0,
  };
  
  // Build search params for each source
  const ticketmasterParams = {
    city: params.city,
    latLong: params.lat && params.lng ? `${params.lat},${params.lng}` : undefined,
    radius: params.radiusMiles || 50,
    startDate: params.dateFrom ? `${params.dateFrom}T00:00:00Z` : undefined,
    endDate: params.dateTo ? `${params.dateTo}T23:59:59Z` : undefined,
    size: 100,
  };
  
  const seatgeekParams: SeatGeekSearchParams = {
    lat: params.lat,
    lon: params.lng,
    city: params.city,
    range: `${params.radiusMiles || 50}mi`,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    perPage: 100,
  };
  
  // Execute searches in parallel
  const searchPromises: Promise<void>[] = [];
  
  if (enabledSources.includes("ticketmaster")) {
    searchPromises.push(
      searchTicketmaster(ticketmasterParams)
        .then(result => {
          results.push({ source: "ticketmaster", concerts: result.concerts });
          totalBySource.ticketmaster = result.totalElements;
        })
        .catch(error => {
          console.error("Ticketmaster search failed:", error);
        })
    );
  }
  
  if (enabledSources.includes("seatgeek")) {
    searchPromises.push(
      searchSeatGeekAsUnified(seatgeekParams)
        .then(result => {
          results.push({ source: "seatgeek", concerts: result.concerts });
          totalBySource.seatgeek = result.total;
        })
        .catch(error => {
          console.error("SeatGeek search failed:", error);
        })
    );
  }
  
  if (enabledSources.includes("bandsintown") && params.artistNames?.length) {
    searchPromises.push(
      searchBandsintownForArtists(params.artistNames, {
        lat: params.lat,
        lng: params.lng,
        radiusMiles: params.radiusMiles,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        maxArtists: 30, // Limit to avoid rate limits
      })
        .then(result => {
          results.push({ source: "bandsintown", concerts: result.concerts });
          totalBySource.bandsintown = result.concerts.length;
        })
        .catch(error => {
          console.error("Bandsintown search failed:", error);
        })
    );
  }
  
  await Promise.all(searchPromises);
  
  // Build source map for deduplication
  const sourceMap = new Map<string, ConcertSource>();
  const allConcerts: Concert[] = [];
  
  for (const { source, concerts } of results) {
    for (const concert of concerts) {
      sourceMap.set(concert.id, source);
      allConcerts.push(concert);
    }
  }
  
  // Use enhanced deduplication
  const deduplicated = deduplicateConcerts(allConcerts, sourceMap);
  
  // Convert to legacy AggregatedConcert format for backward compatibility
  const mergedConcerts: AggregatedConcert[] = deduplicated.map(dedup => ({
    ...dedup,
    // Convert TicketSource[] to ConcertSource[] for legacy interface
    sources: dedup.sources.map(s => s.source),
    alternateUrls: dedup.sources.slice(1).map(s => ({
      source: s.source,
      url: s.ticketUrl,
    })),
    bestPrice: dedup.bestPrice ? {
      min: dedup.bestPrice.min,
      max: dedup.bestPrice.max,
      source: dedup.bestPrice.source,
    } : undefined,
  }));
  
  return {
    concerts: mergedConcerts,
    totalBySource,
    searchedSources: enabledSources,
  };
}

/**
 * Enhanced search that returns fully deduplicated concerts with all source info
 */
export async function searchAllConcertSourcesEnhanced(
  params: AggregatorSearchParams
): Promise<EnhancedAggregatorResult> {
  const enabledSources = params.sources || getEnabledSources();
  const results: { source: ConcertSource; concerts: Concert[] }[] = [];
  const totalBySource: Record<ConcertSource, number> = {
    ticketmaster: 0,
    seatgeek: 0,
    bandsintown: 0,
  };
  
  // Build search params for each source
  const ticketmasterParams = {
    city: params.city,
    latLong: params.lat && params.lng ? `${params.lat},${params.lng}` : undefined,
    radius: params.radiusMiles || 50,
    startDate: params.dateFrom ? `${params.dateFrom}T00:00:00Z` : undefined,
    endDate: params.dateTo ? `${params.dateTo}T23:59:59Z` : undefined,
    size: 100,
  };
  
  const seatgeekParams: SeatGeekSearchParams = {
    lat: params.lat,
    lon: params.lng,
    city: params.city,
    range: `${params.radiusMiles || 50}mi`,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    perPage: 100,
  };
  
  // Execute searches in parallel
  const searchPromises: Promise<void>[] = [];
  
  if (enabledSources.includes("ticketmaster")) {
    searchPromises.push(
      searchTicketmaster(ticketmasterParams)
        .then(result => {
          results.push({ source: "ticketmaster", concerts: result.concerts });
          totalBySource.ticketmaster = result.totalElements;
        })
        .catch(error => {
          console.error("Ticketmaster search failed:", error);
        })
    );
  }
  
  if (enabledSources.includes("seatgeek")) {
    searchPromises.push(
      searchSeatGeekAsUnified(seatgeekParams)
        .then(result => {
          results.push({ source: "seatgeek", concerts: result.concerts });
          totalBySource.seatgeek = result.total;
        })
        .catch(error => {
          console.error("SeatGeek search failed:", error);
        })
    );
  }
  
  if (enabledSources.includes("bandsintown") && params.artistNames?.length) {
    searchPromises.push(
      searchBandsintownForArtists(params.artistNames, {
        lat: params.lat,
        lng: params.lng,
        radiusMiles: params.radiusMiles,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        maxArtists: 30,
      })
        .then(result => {
          results.push({ source: "bandsintown", concerts: result.concerts });
          totalBySource.bandsintown = result.concerts.length;
        })
        .catch(error => {
          console.error("Bandsintown search failed:", error);
        })
    );
  }
  
  await Promise.all(searchPromises);
  
  // Build source map for deduplication
  const sourceMap = new Map<string, ConcertSource>();
  const allConcerts: Concert[] = [];
  
  for (const { source, concerts } of results) {
    for (const concert of concerts) {
      sourceMap.set(concert.id, source);
      allConcerts.push(concert);
    }
  }
  
  // Use enhanced deduplication
  const deduplicated = deduplicateConcerts(allConcerts, sourceMap);
  
  return {
    concerts: deduplicated,
    totalBySource,
    searchedSources: enabledSources,
    totalBeforeDedup: allConcerts.length,
    totalAfterDedup: deduplicated.length,
  };
}

/**
 * Check which sources are enabled (have API keys configured)
 */
function getEnabledSources(): ConcertSource[] {
  const sources: ConcertSource[] = [];
  
  if (process.env.TICKETMASTER_API_KEY) {
    sources.push("ticketmaster");
  }
  
  if (process.env.SEATGEEK_CLIENT_ID) {
    sources.push("seatgeek");
  }
  
  // Bandsintown works with just an app name, so always include it
  // but it requires artist names to search
  sources.push("bandsintown");
  
  return sources;
}

/**
 * Get price comparison across sources for a specific concert
 */
export function getBestPrice(concert: AggregatedConcert): {
  source: ConcertSource;
  url: string;
  price: { min: number; max: number };
} | null {
  if (!concert.bestPrice) return null;
  
  const source = concert.bestPrice.source;
  let url = concert.ticketUrl;
  
  // Find the URL for the best price source
  if (source !== concert.sources[0] && concert.alternateUrls) {
    const altUrl = concert.alternateUrls.find(u => u.source === source);
    if (altUrl) url = altUrl.url;
  }
  
  return {
    source,
    url,
    price: {
      min: concert.bestPrice.min,
      max: concert.bestPrice.max,
    },
  };
}

/**
 * Helper to format source for display
 */
export function formatSourceName(source: ConcertSource): string {
  const names: Record<ConcertSource, string> = {
    ticketmaster: "Ticketmaster",
    seatgeek: "SeatGeek",
    bandsintown: "Bandsintown",
  };
  return names[source];
}

// ============================================
// EMBEDDING INTEGRATION
// ============================================

/**
 * Search concerts and generate embeddings for results.
 * Combines aggregator + embedding pipeline in one call.
 * 
 * @param params - Search parameters
 * @param generateEmbeddings - Whether to generate embeddings (default: true)
 * @returns Enhanced results with embedding IDs attached
 */
export async function searchConcertsWithEmbeddings(
  params: AggregatorSearchParams,
  generateEmbeddings: boolean = true
): Promise<EnhancedAggregatorResult & {
  embeddingStats?: { total: number; success: number; failed: number };
}> {
  // First, search all sources
  const result = await searchAllConcertSourcesEnhanced(params);
  
  if (!generateEmbeddings || result.concerts.length === 0) {
    return result;
  }
  
  try {
    // Dynamically import to avoid circular dependencies
    const { embedDeduplicatedConcerts } = await import("./embeddings/concert-integration");
    
    // Generate embeddings for all concerts
    const { embedded, stats } = await embedDeduplicatedConcerts(result.concerts);
    
    // Attach embedding IDs to concerts
    const concertsWithEmbeddings = result.concerts.map(concert => {
      const embedding = embedded.get(concert.id);
      return {
        ...concert,
        embeddingId: embedding?.id,
      };
    });
    
    return {
      ...result,
      concerts: concertsWithEmbeddings,
      embeddingStats: stats,
    };
  } catch (error) {
    console.error("Error generating embeddings:", error);
    // Return results without embeddings on error
    return result;
  }
}
