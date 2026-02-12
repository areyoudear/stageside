/**
 * Spotify API Integration
 * Handles fetching user's top artists, genres, and recently played tracks
 */

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
  images: { url: string; height: number; width: number }[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: {
    name: string;
    images: { url: string; height: number; width: number }[];
  };
}

interface SpotifyPaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

/**
 * Fetch user's top artists from Spotify
 * @param accessToken - Spotify access token
 * @param timeRange - short_term (4 weeks), medium_term (6 months), long_term (years)
 * @param limit - Number of artists to fetch (max 50)
 */
export async function getTopArtists(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit: number = 50
): Promise<SpotifyArtist[]> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Spotify API error:", error);
    throw new Error(`Failed to fetch top artists: ${response.status}`);
  }

  const data: SpotifyPaginatedResponse<SpotifyArtist> = await response.json();
  return data.items;
}

/**
 * Fetch user's top tracks from Spotify
 */
export async function getTopTracks(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit: number = 50
): Promise<SpotifyTrack[]> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch top tracks: ${response.status}`);
  }

  const data: SpotifyPaginatedResponse<SpotifyTrack> = await response.json();
  return data.items;
}

/**
 * Fetch user's recently played tracks
 */
export async function getRecentlyPlayed(
  accessToken: string,
  limit: number = 50
): Promise<{ track: SpotifyTrack; played_at: string }[]> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/player/recently-played?limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch recently played: ${response.status}`);
  }

  const data = await response.json();
  return data.items;
}

/**
 * Fetch user's followed artists
 */
export async function getFollowedArtists(
  accessToken: string,
  limit: number = 50
): Promise<SpotifyArtist[]> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/me/following?type=artist&limit=${limit}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch followed artists: ${response.status}`);
  }

  const data = await response.json();
  return data.artists.items;
}

/**
 * Extract unique genres from artists, ranked by frequency
 */
export function extractTopGenres(artists: SpotifyArtist[], topN: number = 20): string[] {
  const genreCount: Record<string, number> = {};

  if (!artists || !Array.isArray(artists)) {
    return [];
  }

  artists.forEach((artist, index) => {
    // Weight by artist rank (earlier = more important)
    const weight = Math.max(1, 10 - Math.floor(index / 5));

    // Defensive check for artist.genres
    const genres = artist?.genres || [];
    genres.forEach((genre) => {
      genreCount[genre] = (genreCount[genre] || 0) + weight;
    });
  });

  // Sort by count and return top N
  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([genre]) => genre);
}

/**
 * Fetch related artists for a given artist ID
 */
export async function getRelatedArtists(
  accessToken: string,
  artistId: string
): Promise<SpotifyArtist[]> {
  const response = await fetch(
    `${SPOTIFY_API_BASE}/artists/${artistId}/related-artists`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch related artists for ${artistId}`);
    return [];
  }

  const data = await response.json();
  return data.artists || [];
}

/**
 * Fetch related artists for multiple artists in parallel
 * Returns a map of related artist names to their source artist
 */
export async function getRelatedArtistsForProfile(
  accessToken: string,
  topArtists: SpotifyArtist[],
  maxArtistsToCheck: number = 15
): Promise<Array<{ name: string; relatedTo: string; popularity: number }>> {
  // Only check top N artists to avoid rate limiting
  const artistsToCheck = topArtists.slice(0, maxArtistsToCheck);
  
  const relatedMap = new Map<string, { relatedTo: string; popularity: number }>();
  const topArtistIds = new Set(topArtists.map(a => a.id));
  
  // Fetch in batches of 5 to avoid rate limits
  const batchSize = 5;
  for (let i = 0; i < artistsToCheck.length; i += batchSize) {
    const batch = artistsToCheck.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (artist) => {
        const related = await getRelatedArtists(accessToken, artist.id);
        return { sourceArtist: artist.name, relatedArtists: related };
      })
    );
    
    for (const { sourceArtist, relatedArtists } of results) {
      for (const related of relatedArtists.slice(0, 10)) { // Top 10 related per artist
        // Skip if already in user's top artists
        if (topArtistIds.has(related.id)) continue;
        
        // Skip if already added with higher popularity
        const existing = relatedMap.get(related.name);
        if (existing && existing.popularity >= related.popularity) continue;
        
        relatedMap.set(related.name, {
          relatedTo: sourceArtist,
          popularity: related.popularity,
        });
      }
    }
  }
  
  // Return sorted by popularity (most popular first)
  return Array.from(relatedMap.entries())
    .map(([name, { relatedTo, popularity }]) => ({ name, relatedTo, popularity }))
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 200); // Cap at 200 related artists
}

/**
 * Get comprehensive user music profile
 * Combines data from multiple time ranges for better matching
 */
export async function getUserMusicProfile(accessToken: string) {
  try {
    // Fetch from multiple time ranges for comprehensive profile
    const [shortTermArtists, mediumTermArtists, longTermArtists, recentlyPlayed] =
      await Promise.all([
        getTopArtists(accessToken, "short_term", 30).catch(() => []),
        getTopArtists(accessToken, "medium_term", 50).catch(() => []),
        getTopArtists(accessToken, "long_term", 30).catch(() => []),
        getRecentlyPlayed(accessToken, 50).catch(() => []),
      ]);

    // Ensure we have at least some artists
    const allArtists = [...(shortTermArtists || []), ...(mediumTermArtists || []), ...(longTermArtists || [])];
    if (allArtists.length === 0) {
      console.warn("No artists returned from Spotify API");
    }

    // Combine and deduplicate artists, prioritizing recent listening
    const artistMap = new Map<string, SpotifyArtist & { score: number }>();

    // Short term gets highest weight
    shortTermArtists.forEach((artist, index) => {
      const score = 100 - index * 2;
      artistMap.set(artist.id, { ...artist, score });
    });

    // Medium term
    mediumTermArtists.forEach((artist, index) => {
      const score = 80 - index;
      if (artistMap.has(artist.id)) {
        artistMap.get(artist.id)!.score += score;
      } else {
        artistMap.set(artist.id, { ...artist, score });
      }
    });

    // Long term (lowest weight)
    longTermArtists.forEach((artist, index) => {
      const score = 50 - index;
      if (artistMap.has(artist.id)) {
        artistMap.get(artist.id)!.score += score;
      } else {
        artistMap.set(artist.id, { ...artist, score });
      }
    });

    // Sort by combined score
    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ score, ...artist }) => artist);

    // Fetch related artists for better matching
    const relatedArtists = await getRelatedArtistsForProfile(
      accessToken,
      topArtists,
      15 // Check top 15 artists
    ).catch(() => []); // Don't fail if related artists fetch fails

    // Extract unique artist names from recently played
    const recentArtistNames = Array.from(
      new Set(recentlyPlayed.flatMap((item) => item.track.artists.map((a) => a.name)))
    );

    // Extract top genres from combined artists
    const topGenres = extractTopGenres(topArtists, 25);

    return {
      topArtists,
      topGenres,
      recentArtistNames,
      artistNames: topArtists.map((a) => a.name),
      relatedArtists, // NEW: Include related artists
    };
  } catch (error) {
    console.error("Error fetching user music profile:", error);
    throw error;
  }
}
