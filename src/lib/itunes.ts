/**
 * iTunes Search API Integration
 * Free, no authentication required
 * Returns 30-second preview URLs for tracks
 */

const ITUNES_API_BASE = "https://itunes.apple.com";

export interface iTunesArtist {
  artistId: number;
  artistName: string;
  artistLinkUrl: string;
  primaryGenreName?: string;
}

export interface iTunesTrack {
  trackId: number;
  trackName: string;
  artistId: number;
  artistName: string;
  collectionName: string; // Album name
  previewUrl: string; // 30-second preview
  artworkUrl100: string;
  trackTimeMillis: number;
  primaryGenreName: string;
}

export interface ArtistPreviewInfo {
  artistId: string;
  artistName: string;
  previewUrl: string | null;
  trackName: string | null;
  trackId: string | null;
  artworkUrl?: string;
}

/**
 * Search for an artist by name
 * Returns the top match if found
 */
export async function searchArtist(artistName: string): Promise<iTunesArtist | null> {
  try {
    const response = await fetch(
      `${ITUNES_API_BASE}/search?term=${encodeURIComponent(artistName)}&entity=musicArtist&limit=5`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) return null;

    const data = await response.json();
    const artists = data.results || [];

    if (artists.length === 0) return null;

    // Find best match
    const normalizedQuery = artistName.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const artist of artists) {
      const normalizedResult = artist.artistName.toLowerCase().replace(/[^a-z0-9]/g, "");

      if (
        normalizedQuery === normalizedResult ||
        normalizedQuery.includes(normalizedResult) ||
        normalizedResult.includes(normalizedQuery)
      ) {
        return artist;
      }
    }

    // Return first result if no exact match
    return artists[0];
  } catch (error) {
    console.error(`iTunes: Error searching for artist "${artistName}":`, error);
    return null;
  }
}

/**
 * Get top tracks for an artist with preview URLs
 */
export async function getArtistTopTracks(
  artistId: number,
  limit: number = 10
): Promise<iTunesTrack[]> {
  try {
    const response = await fetch(
      `${ITUNES_API_BASE}/lookup?id=${artistId}&entity=song&limit=${limit}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    // First result is the artist, rest are tracks
    const results = data.results || [];
    return results.filter((r: { wrapperType: string }) => r.wrapperType === "track");
  } catch (error) {
    console.error(`iTunes: Error fetching tracks for artist ${artistId}:`, error);
    return [];
  }
}

/**
 * Search for tracks by artist name (alternative approach)
 * This can find tracks even if artist lookup fails
 */
export async function searchArtistTracks(
  artistName: string,
  limit: number = 10
): Promise<iTunesTrack[]> {
  try {
    const response = await fetch(
      `${ITUNES_API_BASE}/search?term=${encodeURIComponent(artistName)}&entity=song&limit=${limit}`,
      { next: { revalidate: 86400 } }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error(`iTunes: Error searching tracks for "${artistName}":`, error);
    return [];
  }
}

/**
 * Get artist's top track with preview URL
 * Main function for concert enrichment
 */
export async function getArtistTopTrackPreview(
  artistName: string
): Promise<ArtistPreviewInfo | null> {
  try {
    // First try: search for artist and get their tracks
    const artist = await searchArtist(artistName);

    let tracks: iTunesTrack[] = [];

    if (artist) {
      tracks = await getArtistTopTracks(artist.artistId);
    }

    // Fallback: search directly for tracks by artist name
    if (tracks.length === 0) {
      tracks = await searchArtistTracks(artistName, 10);
      
      // Filter to tracks that match the artist name closely
      const normalizedArtist = artistName.toLowerCase().replace(/[^a-z0-9]/g, "");
      tracks = tracks.filter((t) => {
        const normalizedTrackArtist = t.artistName.toLowerCase().replace(/[^a-z0-9]/g, "");
        return (
          normalizedTrackArtist.includes(normalizedArtist) ||
          normalizedArtist.includes(normalizedTrackArtist)
        );
      });
    }

    // Find first track with a preview URL
    for (const track of tracks) {
      if (track.previewUrl) {
        return {
          artistId: String(track.artistId),
          artistName: track.artistName,
          previewUrl: track.previewUrl,
          trackName: track.trackName,
          trackId: String(track.trackId),
          artworkUrl: track.artworkUrl100,
        };
      }
    }

    // No preview available
    if (tracks.length > 0) {
      return {
        artistId: String(tracks[0].artistId),
        artistName: tracks[0].artistName,
        previewUrl: null,
        trackName: tracks[0].trackName,
        trackId: String(tracks[0].trackId),
      };
    }

    return null;
  } catch (error) {
    console.error(`iTunes: Error getting preview for "${artistName}":`, error);
    return null;
  }
}

/**
 * Get previews for multiple artists
 * Batched with rate limiting
 */
export async function getArtistsTopTrackPreviews(
  artistNames: string[],
  maxConcurrent: number = 5
): Promise<Map<string, ArtistPreviewInfo>> {
  const results = new Map<string, ArtistPreviewInfo>();

  // Process in batches
  for (let i = 0; i < artistNames.length; i += maxConcurrent) {
    const batch = artistNames.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((name) => getArtistTopTrackPreview(name))
    );

    for (let j = 0; j < batch.length; j++) {
      const result = batchResults[j];
      if (result) {
        results.set(batch[j].toLowerCase(), result);
      }
    }

    // Small delay between batches to be nice to iTunes API
    if (i + maxConcurrent < artistNames.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}
