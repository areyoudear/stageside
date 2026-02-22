/**
 * Concert Enrichment - Add audio previews and additional metadata to concerts
 */

import { Concert } from "./ticketmaster";
import { getArtistAudioProfiles, saveArtistAudioProfiles, ArtistAudioProfile } from "./supabase";
import { searchArtist, getArtistTopTrackPreview } from "./spotify";

// Extended concert with preview data - preserves all original properties
export type EnrichedConcert<T extends Concert = Concert> = T & {
  previewUrl?: string | null;
  topTrackName?: string;
  highlightStartMs?: number;
};

/**
 * Enrich concerts with audio preview data
 * First checks cache, then fetches from Spotify if needed
 * Preserves all original concert properties including matchType, etc.
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
  
  // Fetch missing profiles from Spotify (limited to avoid rate limits)
  const newProfiles: Array<Omit<ArtistAudioProfile, "id" | "computed_at">> = [];
  
  if (missingArtists.length > 0) {
    // Limit concurrent fetches
    const toFetch = missingArtists.slice(0, 20);
    
    const fetchPromises = toFetch.map(async (artistName) => {
      try {
        // Search for artist
        const artist = await searchArtist(artistName);
        if (!artist) return null;
        
        // Get preview info
        const previewInfo = await getArtistTopTrackPreview(artist.id);
        
        return {
          spotify_id: artist.id,
          artist_name: artistName,
          avg_energy: null,
          avg_valence: null,
          avg_tempo: null,
          top_track_preview_url: previewInfo?.previewUrl || null,
          top_track_name: previewInfo?.trackName || null,
          highlight_start_ms: 30000, // Default: start at 30s
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
        highlightStartMs: profile.highlight_start_ms || 30000,
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
