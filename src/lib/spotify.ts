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

/**
 * Search Spotify for an artist by name
 * Returns the top match if found, null otherwise
 */
export async function searchArtist(
  artistName: string,
  clientId?: string,
  clientSecret?: string
): Promise<SpotifyArtist | null> {
  try {
    // Get client credentials token for searching
    const token = await getClientCredentialsToken(clientId, clientSecret);
    if (!token) return null;

    const response = await fetch(
      `${SPOTIFY_API_BASE}/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const artists = data.artists?.items || [];
    
    if (artists.length === 0) return null;

    const match = artists[0];
    // Fuzzy match: check if names are similar enough
    const normalizedQuery = artistName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedResult = match.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Accept if either contains the other or they're very similar
    if (
      normalizedQuery.includes(normalizedResult) ||
      normalizedResult.includes(normalizedQuery) ||
      normalizedQuery === normalizedResult
    ) {
      return match;
    }

    return null;
  } catch (error) {
    console.error(`Error searching for artist "${artistName}":`, error);
    return null;
  }
}

/**
 * Get a client credentials access token for Spotify API
 * (for searching without user auth)
 */
let cachedClientToken: { token: string; expiresAt: number } | null = null;

async function getClientCredentialsToken(
  clientId?: string,
  clientSecret?: string
): Promise<string | null> {
  const id = clientId || process.env.SPOTIFY_CLIENT_ID;
  const secret = clientSecret || process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!id || !secret) return null;

  // Return cached token if still valid
  if (cachedClientToken && cachedClientToken.expiresAt > Date.now()) {
    return cachedClientToken.token;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) return null;

    const data = await response.json();
    cachedClientToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Expire 1 min early
    };

    return cachedClientToken.token;
  } catch (error) {
    console.error("Error getting Spotify client credentials:", error);
    return null;
  }
}

/**
 * Validate a list of artist names against Spotify
 * Returns only the ones that are real music artists with enriched data
 */
export async function validateArtistsAgainstSpotify(
  artistNames: string[],
  maxConcurrent: number = 5
): Promise<SpotifyArtist[]> {
  const validatedArtists: SpotifyArtist[] = [];
  const seenIds = new Set<string>();

  // Process in batches to avoid rate limiting
  for (let i = 0; i < artistNames.length; i += maxConcurrent) {
    const batch = artistNames.slice(i, i + maxConcurrent);
    const results = await Promise.all(
      batch.map(name => searchArtist(name))
    );

    for (const artist of results) {
      if (artist && !seenIds.has(artist.id)) {
        seenIds.add(artist.id);
        validatedArtists.push(artist);
      }
    }

    // Small delay between batches to be nice to Spotify API
    if (i + maxConcurrent < artistNames.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return validatedArtists;
}
