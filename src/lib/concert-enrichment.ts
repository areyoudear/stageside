/**
 * Concert Enrichment - Add audio previews, pricing, and additional metadata to concerts
 * 
 * Uses iTunes Search API for previews (free, no auth required)
 * Uses SeatGeek API for pricing fallback
 */

import { Concert } from "./ticketmaster";
import { getArtistAudioProfiles, saveArtistAudioProfiles, ArtistAudioProfile } from "./supabase";
import { getArtistTopTrackPreview } from "./itunes";
import { searchSeatGeekConcerts, SeatGeekEvent } from "./seatgeek";

// Extended concert with preview data - preserves all original properties
export type EnrichedConcert<T extends Concert = Concert> = T & {
  previewUrl?: string | null;
  topTrackName?: string;
  highlightStartMs?: number;
};

/**
 * Enrich concerts with audio preview data
 * Uses iTunes Search API (free, no auth required)
 * First checks cache, then fetches from iTunes if needed
 * 
 * @param concerts - Array of concerts to enrich
 * @param maxToEnrich - Max number of artists to fetch previews for
 */
export async function enrichConcertsWithPreviews<T extends Concert>(
  concerts: T[],
  maxToEnrich: number = 50
): Promise<EnrichedConcert<T>[]> {
  if (concerts.length === 0) return [];
  
  // Get unique artist names (first artist per concert)
  const uniqueArtists = new Set<string>();
  const artistConcertMap = new Map<string, Concert[]>();
  
  for (const concert of concerts) {
    const primaryArtist = concert.artists[0];
    if (primaryArtist) {
      uniqueArtists.add(primaryArtist);
      const existing = artistConcertMap.get(primaryArtist.toLowerCase()) || [];
      existing.push(concert);
      artistConcertMap.set(primaryArtist.toLowerCase(), existing);
    }
  }
  
  // Try to get cached profiles (may return empty if table doesn't exist yet)
  const artistNames = Array.from(uniqueArtists).slice(0, maxToEnrich);
  let cachedProfiles: Map<string, ArtistAudioProfile>;
  try {
    cachedProfiles = await getArtistAudioProfiles(artistNames);
  } catch (error) {
    console.warn("Could not fetch artist profiles (table may not exist):", error);
    cachedProfiles = new Map();
  }
  
  // Find artists that need to be fetched
  const missingArtists = artistNames.filter(
    name => !cachedProfiles.has(name.toLowerCase())
  );
  
  // Fetch missing profiles from iTunes (free, no auth required)
  const newProfiles: Array<Omit<ArtistAudioProfile, "id" | "computed_at">> = [];
  
  if (missingArtists.length > 0) {
    // Limit concurrent fetches
    const toFetch = missingArtists.slice(0, 20);
    
    const fetchPromises = toFetch.map(async (artistName) => {
      try {
        // Get preview info from iTunes
        const previewInfo = await getArtistTopTrackPreview(artistName);
        if (!previewInfo) return null;
        
        return {
          spotify_id: previewInfo.artistId, // Using iTunes artist ID
          artist_name: artistName,
          avg_energy: null,
          avg_valence: null,
          avg_tempo: null,
          top_track_preview_url: previewInfo.previewUrl || null,
          top_track_name: previewInfo.trackName || null,
          highlight_start_ms: 0, // iTunes previews are already 30s highlights
          live_style: null,
        };
      } catch (error) {
        console.error(`Error fetching preview for ${artistName}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(fetchPromises);
    
    for (const result of results) {
      if (result) {
        newProfiles.push(result);
        // Add to cache map for immediate use
        cachedProfiles.set(result.artist_name.toLowerCase(), result as ArtistAudioProfile);
      }
    }
    
    // Save new profiles to cache (fire and forget)
    if (newProfiles.length > 0) {
      saveArtistAudioProfiles(newProfiles).catch((err) => {
        console.error("Error saving artist profiles:", err);
      });
    }
  }
  
  // Enrich concerts with preview data
  return concerts.map(concert => {
    const primaryArtist = concert.artists[0];
    if (!primaryArtist) return concert;
    
    const profile = cachedProfiles.get(primaryArtist.toLowerCase());
    
    if (profile && profile.top_track_preview_url) {
      return {
        ...concert,
        previewUrl: profile.top_track_preview_url,
        topTrackName: profile.top_track_name || undefined,
        highlightStartMs: profile.highlight_start_ms || 0,
      };
    }
    
    return concert;
  });
}

/**
 * Enrich a single concert with preview data
 */
export async function enrichConcertWithPreview(
  concert: Concert
): Promise<EnrichedConcert> {
  const enriched = await enrichConcertsWithPreviews([concert], 1);
  return enriched[0];
}

/**
 * Enrich concerts with price data from SeatGeek when Ticketmaster doesn't have it
 * 
 * @param concerts - Array of concerts to check for missing prices
 * @param lat - Latitude for SeatGeek search
 * @param lng - Longitude for SeatGeek search
 * @param radiusMiles - Search radius in miles
 */
export async function enrichConcertsWithPrices<T extends Concert>(
  concerts: T[],
  lat?: number,
  lng?: number,
  radiusMiles: number = 50
): Promise<T[]> {
  // Check if SeatGeek is configured
  if (!process.env.SEATGEEK_CLIENT_ID) {
    return concerts;
  }
  
  // Find concerts without prices
  const concertsNeedingPrices = concerts.filter(c => !c.priceRange);
  
  if (concertsNeedingPrices.length === 0) {
    return concerts;
  }
  
  // Get date range from concerts
  const dates = concerts.map(c => c.date).sort();
  const dateFrom = dates[0];
  const dateTo = dates[dates.length - 1];
  
  try {
    // Fetch concerts from SeatGeek for the same area and date range
    const seatGeekResult = await searchSeatGeekConcerts({
      lat,
      lon: lng,
      range: `${radiusMiles}mi`,
      dateFrom,
      dateTo,
      perPage: 100,
    });
    
    if (seatGeekResult.events.length === 0) {
      return concerts;
    }
    
    // Build a map of SeatGeek events by normalized artist + date for matching
    const seatGeekMap = new Map<string, SeatGeekEvent>();
    for (const event of seatGeekResult.events) {
      const performers = event.performers.map(p => 
        p.name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim()
      );
      const key = `${performers[0] || ""}_${event.datetime_local.split("T")[0]}`;
      seatGeekMap.set(key, event);
    }
    
    // Enrich concerts with missing prices
    return concerts.map(concert => {
      // Skip if already has price
      if (concert.priceRange) {
        return concert;
      }
      
      // Try to match with SeatGeek event
      const primaryArtist = concert.artists[0]?.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
      const matchKey = `${primaryArtist}_${concert.date}`;
      const seatGeekEvent = seatGeekMap.get(matchKey);
      
      if (seatGeekEvent && seatGeekEvent.stats.lowest_price > 0) {
        return {
          ...concert,
          priceRange: {
            min: seatGeekEvent.stats.lowest_price,
            max: seatGeekEvent.stats.highest_price || seatGeekEvent.stats.lowest_price,
            currency: "USD",
          },
        };
      }
      
      return concert;
    });
  } catch (error) {
    console.error("Error enriching prices from SeatGeek:", error);
    return concerts;
  }
}
