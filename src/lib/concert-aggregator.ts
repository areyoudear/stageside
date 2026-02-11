/**
 * Concert Aggregator
 * Combines results from multiple ticket sources:
 * - Ticketmaster (primary, global coverage)
 * - SeatGeek (secondary market, good prices)
 * - Bandsintown (indie coverage, artist-centric)
 * 
 * Handles deduplication and merging of results.
 */

import { searchConcerts as searchTicketmaster, type Concert } from "./ticketmaster";
import { searchSeatGeekAsUnified, type SeatGeekSearchParams } from "./seatgeek";
import { searchBandsintownForArtists } from "./bandsintown";

export type ConcertSource = "ticketmaster" | "seatgeek" | "bandsintown";

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
  
  // Merge and deduplicate results
  const mergedConcerts: AggregatedConcert[] = [];
  
  // Process Ticketmaster first (highest quality data)
  const tmResults = results.find(r => r.source === "ticketmaster");
  if (tmResults) {
    tmResults.concerts.forEach(concert => {
      const aggregated: AggregatedConcert = {
        ...concert,
        sources: ["ticketmaster"],
        bestPrice: concert.priceRange ? {
          min: concert.priceRange.min,
          max: concert.priceRange.max,
          source: "ticketmaster",
        } : undefined,
      };
      mergedConcerts.push(aggregated);
    });
  }
  
  // Process other sources and merge duplicates
  for (const { source, concerts } of results) {
    if (source === "ticketmaster") continue;
    
    for (const concert of concerts) {
      const existingIndex = mergedConcerts.findIndex(existing => 
        isSameConcert(existing, concert)
      );
      
      if (existingIndex >= 0) {
        // Merge with existing
        mergedConcerts[existingIndex] = mergeConcerts(
          mergedConcerts[existingIndex],
          concert,
          source
        );
      } else {
        // Add as new
        const aggregated: AggregatedConcert = {
          ...concert,
          sources: [source],
          bestPrice: concert.priceRange ? {
            min: concert.priceRange.min,
            max: concert.priceRange.max,
            source,
          } : undefined,
        };
        mergedConcerts.push(aggregated);
      }
    }
  }
  
  return {
    concerts: mergedConcerts,
    totalBySource,
    searchedSources: enabledSources,
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
