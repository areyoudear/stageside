/**
 * Concert Deduplication
 * 
 * Handles merging duplicate concerts from multiple ticket sources:
 * - Normalizes artist names for comparison
 * - Groups by artist + date + city
 * - Merges metadata (images, prices, ticket URLs)
 * - Tracks all original sources for price comparison
 */

import type { Concert } from "./ticketmaster";
import type { ConcertSource } from "./concert-aggregator";

export interface TicketSource {
  source: ConcertSource;
  ticketUrl: string;
  price?: {
    min: number;
    max: number;
    currency?: string;
  };
}

export interface DeduplicatedConcert extends Concert {
  sources: TicketSource[];
  primarySource: ConcertSource;
  bestPrice?: {
    min: number;
    max: number;
    currency: string;
    source: ConcertSource;
  };
  // Original data merged from all sources
  allGenres: string[];
  allImages: string[];
}

/**
 * Normalize artist name for comparison
 * - Lowercase
 * - Remove special characters
 * - Handle common variations (The, &, ft., etc.)
 */
function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    // Remove "The " prefix
    .replace(/^the\s+/i, "")
    // Normalize ampersands
    .replace(/\s*&\s*/g, " and ")
    // Remove featuring variations
    .replace(/\s*(feat\.?|ft\.?|featuring|with)\s*/gi, " ")
    // Remove special characters
    .replace(/[^\w\s]/g, "")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize city name for comparison
 */
function normalizeCity(city: string): string {
  return city
    .toLowerCase()
    // Common city variations
    .replace(/^new york city$/i, "new york")
    .replace(/^nyc$/i, "new york")
    .replace(/^la$/i, "los angeles")
    .replace(/^sf$/i, "san francisco")
    .replace(/^dc$/i, "washington")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalize venue name for comparison
 */
function normalizeVenueName(name: string): string {
  return name
    .toLowerCase()
    // Remove common suffixes
    .replace(/\s*(arena|center|centre|theater|theatre|stadium|hall|pavilion|amphitheater|amphitheatre)\s*$/i, "")
    // Remove "the" prefix
    .replace(/^the\s+/i, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a deduplication key for a concert
 * Uses: normalized primary artist + date + normalized city
 */
function getDeduplicationKey(concert: Concert): string {
  const primaryArtist = normalizeArtistName(concert.artists[0] || concert.name);
  const city = normalizeCity(concert.venue.city);
  const date = concert.date; // Already in YYYY-MM-DD format
  
  return `${primaryArtist}|${date}|${city}`;
}

/**
 * Calculate similarity between two artist name lists
 * Returns a score from 0 to 1
 */
function artistListSimilarity(artists1: string[], artists2: string[]): number {
  if (artists1.length === 0 || artists2.length === 0) return 0;
  
  const norm1 = artists1.map(normalizeArtistName);
  const norm2 = artists2.map(normalizeArtistName);
  
  // Check for exact matches
  const matches = norm1.filter(a1 => 
    norm2.some(a2 => a1 === a2 || a1.includes(a2) || a2.includes(a1))
  );
  
  // Score based on proportion of matching artists
  return matches.length / Math.max(norm1.length, norm2.length);
}

/**
 * Check if two venues are likely the same
 */
function venuesSimilar(venue1: Concert["venue"], venue2: Concert["venue"]): boolean {
  // Same city check
  const sameCity = normalizeCity(venue1.city) === normalizeCity(venue2.city);
  if (!sameCity) return false;
  
  // Same venue name check
  const name1 = normalizeVenueName(venue1.name);
  const name2 = normalizeVenueName(venue2.name);
  
  // Exact match or one contains the other
  return name1 === name2 || 
         name1.includes(name2) || 
         name2.includes(name1);
}

/**
 * Score image quality (prefer larger, properly formatted images)
 */
function scoreImage(url: string): number {
  if (!url || url === "/placeholder-concert.jpg") return 0;
  
  let score = 1;
  
  // Prefer HTTPS
  if (url.startsWith("https://")) score += 1;
  
  // Prefer certain domains known for high quality
  if (url.includes("ticketmaster") || url.includes("seatgeek") || url.includes("images.sk-static")) {
    score += 2;
  }
  
  // Prefer larger dimensions mentioned in URL
  const sizeMatch = url.match(/(\d+)x(\d+)/);
  if (sizeMatch) {
    const width = parseInt(sizeMatch[1], 10);
    if (width >= 500) score += 2;
    if (width >= 1000) score += 1;
  }
  
  return score;
}

/**
 * Pick the best image from multiple sources
 */
function pickBestImage(images: string[]): string {
  if (images.length === 0) return "/placeholder-concert.jpg";
  
  const scored = images
    .filter(img => img && img !== "/placeholder-concert.jpg")
    .map(img => ({ url: img, score: scoreImage(img) }))
    .sort((a, b) => b.score - a.score);
  
  return scored[0]?.url || images[0] || "/placeholder-concert.jpg";
}

/**
 * Merge two concerts that represent the same event
 */
function mergeConcertData(
  existing: DeduplicatedConcert,
  incoming: Concert,
  incomingSource: ConcertSource
): DeduplicatedConcert {
  const merged = { ...existing };
  
  // Add the new source
  const newTicketSource: TicketSource = {
    source: incomingSource,
    ticketUrl: incoming.ticketUrl,
    price: incoming.priceRange ? {
      min: incoming.priceRange.min,
      max: incoming.priceRange.max,
      currency: incoming.priceRange.currency,
    } : undefined,
  };
  
  // Only add if not already present
  const alreadyHasSource = merged.sources.some(s => s.source === incomingSource);
  if (!alreadyHasSource) {
    merged.sources.push(newTicketSource);
  }
  
  // Update best price if incoming has a better price
  if (incoming.priceRange) {
    if (!merged.bestPrice || incoming.priceRange.min < merged.bestPrice.min) {
      merged.bestPrice = {
        min: incoming.priceRange.min,
        max: incoming.priceRange.max,
        currency: incoming.priceRange.currency || "USD",
        source: incomingSource,
      };
    }
  }
  
  // Merge genres (deduplicate)
  if (incoming.genres?.length) {
    const allGenres = new Set([...merged.allGenres, ...incoming.genres]);
    merged.allGenres = Array.from(allGenres);
    merged.genres = Array.from(allGenres);
  }
  
  // Collect all images
  if (incoming.imageUrl && incoming.imageUrl !== "/placeholder-concert.jpg") {
    merged.allImages.push(incoming.imageUrl);
    // Update main image if incoming is better
    merged.imageUrl = pickBestImage(merged.allImages);
  }
  
  // Merge artists (in case one source has more info)
  const allArtists = new Set([...merged.artists, ...incoming.artists]);
  merged.artists = Array.from(allArtists);
  
  // Use more specific venue info if available
  if (!merged.venue.address && incoming.venue.address) {
    merged.venue.address = incoming.venue.address;
  }
  if (!merged.venue.location && incoming.venue.location) {
    merged.venue.location = incoming.venue.location;
  }
  
  // Use more specific time if available
  if (!merged.time && incoming.time) {
    merged.time = incoming.time;
  }
  
  return merged;
}

/**
 * Deduplicate concerts from multiple sources
 * 
 * Strategy:
 * 1. Group by deduplication key (artist + date + city)
 * 2. Within each group, verify similarity (artists, venue)
 * 3. Merge metadata from all sources
 * 4. Track all ticket sources for price comparison
 */
export function deduplicateConcerts(
  concerts: Concert[],
  sourceMap?: Map<string, ConcertSource> // Concert ID -> source
): DeduplicatedConcert[] {
  // Group concerts by deduplication key
  const groups = new Map<string, Array<{ concert: Concert; source: ConcertSource }>>();
  
  for (const concert of concerts) {
    const key = getDeduplicationKey(concert);
    const source = sourceMap?.get(concert.id) || inferSource(concert);
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push({ concert, source });
  }
  
  const deduplicated: DeduplicatedConcert[] = [];
  
  // Use Array.from for ES5 compatibility
  const groupEntries = Array.from(groups.entries());
  for (const [, group] of groupEntries) {
    if (group.length === 1) {
      // Single concert, no deduplication needed
      const { concert, source } = group[0];
      deduplicated.push(convertToDeduplicated(concert, source));
    } else {
      // Multiple concerts for same event - need to verify and merge
      const merged = mergeGroup(group);
      deduplicated.push(merged);
    }
  }
  
  return deduplicated;
}

/**
 * Convert a single concert to DeduplicatedConcert format
 */
function convertToDeduplicated(concert: Concert, source: ConcertSource): DeduplicatedConcert {
  const ticketSource: TicketSource = {
    source,
    ticketUrl: concert.ticketUrl,
    price: concert.priceRange ? {
      min: concert.priceRange.min,
      max: concert.priceRange.max,
      currency: concert.priceRange.currency,
    } : undefined,
  };
  
  return {
    ...concert,
    sources: [ticketSource],
    primarySource: source,
    bestPrice: concert.priceRange ? {
      min: concert.priceRange.min,
      max: concert.priceRange.max,
      currency: concert.priceRange.currency || "USD",
      source,
    } : undefined,
    allGenres: concert.genres,
    allImages: concert.imageUrl ? [concert.imageUrl] : [],
  };
}

/**
 * Merge a group of concerts that share the same deduplication key
 */
function mergeGroup(group: Array<{ concert: Concert; source: ConcertSource }>): DeduplicatedConcert {
  // Sort by source priority (ticketmaster > seatgeek > bandsintown)
  const sourcePriority: Record<ConcertSource, number> = {
    ticketmaster: 3,
    seatgeek: 2,
    bandsintown: 1,
  };
  
  group.sort((a, b) => sourcePriority[b.source] - sourcePriority[a.source]);
  
  // Start with the highest priority concert
  const { concert: primary, source: primarySource } = group[0];
  let merged = convertToDeduplicated(primary, primarySource);
  
  // Merge in the rest
  for (let i = 1; i < group.length; i++) {
    const { concert, source } = group[i];
    
    // Verify this is actually the same event (not just similar key)
    const artistSimilarity = artistListSimilarity(merged.artists, concert.artists);
    const sameVenue = venuesSimilar(merged.venue, concert.venue);
    
    // Only merge if we're confident it's the same event
    if (artistSimilarity > 0.5 || sameVenue) {
      merged = mergeConcertData(merged, concert, source);
    }
  }
  
  return merged;
}

/**
 * Infer source from concert data when not explicitly provided
 */
function inferSource(concert: Concert): ConcertSource {
  // Check ticket URL
  if (concert.ticketUrl) {
    if (concert.ticketUrl.includes("ticketmaster")) return "ticketmaster";
    if (concert.ticketUrl.includes("seatgeek")) return "seatgeek";
    if (concert.ticketUrl.includes("bandsintown")) return "bandsintown";
  }
  
  // Check ID patterns
  if (concert.id.startsWith("G") || concert.id.includes("TM")) return "ticketmaster";
  if (concert.id.includes("sg") || concert.id.match(/^\d+$/)) return "seatgeek";
  
  // Default
  return "ticketmaster";
}

/**
 * Get all ticket sources for a concert, sorted by price
 */
export function getTicketSourcesByPrice(concert: DeduplicatedConcert): TicketSource[] {
  return [...concert.sources].sort((a, b) => {
    // No price goes to the end
    if (!a.price && !b.price) return 0;
    if (!a.price) return 1;
    if (!b.price) return -1;
    return a.price.min - b.price.min;
  });
}

/**
 * Format source name for display
 */
export function formatSourceName(source: ConcertSource): string {
  const names: Record<ConcertSource, string> = {
    ticketmaster: "Ticketmaster",
    seatgeek: "SeatGeek",
    bandsintown: "Bandsintown",
  };
  return names[source];
}

/**
 * Get source icon/color for UI
 */
export function getSourceStyle(source: ConcertSource): { color: string; bgColor: string } {
  const styles: Record<ConcertSource, { color: string; bgColor: string }> = {
    ticketmaster: { color: "text-blue-400", bgColor: "bg-blue-500/20" },
    seatgeek: { color: "text-green-400", bgColor: "bg-green-500/20" },
    bandsintown: { color: "text-pink-400", bgColor: "bg-pink-500/20" },
  };
  return styles[source];
}
