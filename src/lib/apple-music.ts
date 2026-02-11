/**
 * Apple Music API Integration via MusicKit JS
 * Handles fetching user's library artists, recently played, and genres
 *
 * Requirements:
 * - Apple Developer account
 * - MusicKit enabled App ID
 * - Developer token (JWT) generated server-side
 *
 * Docs: https://developer.apple.com/documentation/musickitjs
 */

export interface AppleMusicArtist {
  id: string;
  name: string;
  genres: string[];
  url: string;
  artwork?: {
    url: string;
    width: number;
    height: number;
  };
}

export interface AppleMusicTrack {
  id: string;
  name: string;
  artistName: string;
  albumName: string;
  genreNames: string[];
  artwork?: {
    url: string;
    width: number;
    height: number;
  };
}

/**
 * Generate Apple Music Developer Token (JWT)
 * This should be called server-side and cached
 *
 * Requires:
 * - APPLE_TEAM_ID: Your Apple Developer Team ID
 * - APPLE_KEY_ID: MusicKit Key ID
 * - APPLE_PRIVATE_KEY: MusicKit Private Key (PEM format)
 */
export async function generateDeveloperToken(): Promise<string> {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !privateKey) {
    throw new Error("Apple Music credentials not configured. Set APPLE_TEAM_ID, APPLE_KEY_ID, and APPLE_PRIVATE_KEY");
  }

  // Dynamic import to avoid bundling issues
  try {
    const jwt = await import("jsonwebtoken");
    const token = jwt.default.sign({}, privateKey, {
      algorithm: "ES256",
      expiresIn: "180d",
      issuer: teamId,
      header: {
        alg: "ES256",
        kid: keyId,
      },
    });
    return token;
  } catch (error) {
    throw new Error("jsonwebtoken package required for Apple Music integration. Run: npm install jsonwebtoken");
  }
}

/**
 * Exchange MusicKit user token for access
 * The user token comes from MusicKit JS authorize() on the client
 */
export async function validateUserToken(
  developerToken: string,
  musicUserToken: string
): Promise<boolean> {
  const response = await fetch("https://api.music.apple.com/v1/me/storefront", {
    headers: {
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": musicUserToken,
    },
  });

  return response.ok;
}

/**
 * Fetch user's library artists from Apple Music
 */
export async function getLibraryArtists(
  developerToken: string,
  musicUserToken: string,
  limit: number = 100
): Promise<AppleMusicArtist[]> {
  const artists: AppleMusicArtist[] = [];
  let nextUrl: string | null = `https://api.music.apple.com/v1/me/library/artists?limit=${Math.min(limit, 100)}`;

  while (nextUrl && artists.length < limit) {
    const response: Response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        "Music-User-Token": musicUserToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Apple Music API error:", error);
      throw new Error(`Failed to fetch library artists: ${response.status}`);
    }

    const data: { data?: Array<{ id: string; attributes: { name: string; url?: string; artwork?: { url: string; width: number; height: number } } }>; next?: string } = await response.json();

    for (const item of data.data || []) {
      artists.push({
        id: item.id,
        name: item.attributes.name,
        genres: [], // Library artists don't have genres directly
        url: item.attributes.url || "",
        artwork: item.attributes.artwork
          ? {
              url: item.attributes.artwork.url,
              width: item.attributes.artwork.width,
              height: item.attributes.artwork.height,
            }
          : undefined,
      });
    }

    nextUrl = data.next || null;
  }

  return artists.slice(0, limit);
}

/**
 * Fetch user's recently played tracks from Apple Music
 */
export async function getRecentlyPlayed(
  developerToken: string,
  musicUserToken: string,
  limit: number = 50
): Promise<AppleMusicTrack[]> {
  const response = await fetch(
    `https://api.music.apple.com/v1/me/recent/played/tracks?limit=${Math.min(limit, 30)}`,
    {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        "Music-User-Token": musicUserToken,
      },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Apple Music API error:", error);
    throw new Error(`Failed to fetch recently played: ${response.status}`);
  }

  const data = await response.json();

  return (data.data || []).map(
    (item: {
      id: string;
      attributes: {
        name: string;
        artistName: string;
        albumName: string;
        genreNames: string[];
        artwork?: { url: string; width: number; height: number };
      };
    }) => ({
      id: item.id,
      name: item.attributes.name,
      artistName: item.attributes.artistName,
      albumName: item.attributes.albumName,
      genreNames: item.attributes.genreNames || [],
      artwork: item.attributes.artwork,
    })
  );
}

/**
 * Fetch user's heavy rotation (most played)
 */
export async function getHeavyRotation(
  developerToken: string,
  musicUserToken: string,
  limit: number = 25
): Promise<AppleMusicTrack[]> {
  const response = await fetch(
    `https://api.music.apple.com/v1/me/history/heavy-rotation?limit=${Math.min(limit, 25)}`,
    {
      headers: {
        Authorization: `Bearer ${developerToken}`,
        "Music-User-Token": musicUserToken,
      },
    }
  );

  if (!response.ok) {
    // Heavy rotation might not be available for all users
    console.warn("Heavy rotation not available");
    return [];
  }

  const data = await response.json();
  const tracks: AppleMusicTrack[] = [];

  for (const item of data.data || []) {
    if (item.type === "songs" || item.type === "library-songs") {
      tracks.push({
        id: item.id,
        name: item.attributes.name,
        artistName: item.attributes.artistName,
        albumName: item.attributes.albumName,
        genreNames: item.attributes.genreNames || [],
        artwork: item.attributes.artwork,
      });
    }
  }

  return tracks;
}

/**
 * Look up full artist details to get genres
 */
export async function getArtistDetails(
  developerToken: string,
  artistId: string
): Promise<AppleMusicArtist | null> {
  const response = await fetch(
    `https://api.music.apple.com/v1/catalog/us/artists/${artistId}`,
    {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const artist = data.data?.[0];

  if (!artist) return null;

  return {
    id: artist.id,
    name: artist.attributes.name,
    genres: artist.attributes.genreNames || [],
    url: artist.attributes.url || "",
    artwork: artist.attributes.artwork,
  };
}

/**
 * Search for an artist to get their catalog ID from a name
 */
export async function searchArtist(
  developerToken: string,
  artistName: string
): Promise<AppleMusicArtist | null> {
  const response = await fetch(
    `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(
      artistName
    )}&types=artists&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${developerToken}`,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const artist = data.results?.artists?.data?.[0];

  if (!artist) return null;

  return {
    id: artist.id,
    name: artist.attributes.name,
    genres: artist.attributes.genreNames || [],
    url: artist.attributes.url || "",
    artwork: artist.attributes.artwork,
  };
}

/**
 * Extract unique genres from tracks
 */
export function extractGenresFromTracks(tracks: AppleMusicTrack[]): string[] {
  const genreCount: Record<string, number> = {};

  tracks.forEach((track, index) => {
    const weight = Math.max(1, 10 - Math.floor(index / 5));
    track.genreNames.forEach((genre) => {
      // Filter out generic genres
      if (!["Music", "Pop", "Rock"].includes(genre)) {
        genreCount[genre] = (genreCount[genre] || 0) + weight;
      }
    });
  });

  return Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([genre]) => genre);
}

/**
 * Get comprehensive user music profile from Apple Music
 */
export async function getUserMusicProfile(
  developerToken: string,
  musicUserToken: string
) {
  try {
    const [libraryArtists, recentlyPlayed, heavyRotation] = await Promise.all([
      getLibraryArtists(developerToken, musicUserToken, 100),
      getRecentlyPlayed(developerToken, musicUserToken, 50),
      getHeavyRotation(developerToken, musicUserToken, 25).catch(() => []),
    ]);

    // Combine tracks for genre extraction
    const allTracks = [...recentlyPlayed, ...heavyRotation];

    // Extract unique artist names from tracks
    const trackArtistNames = new Set(allTracks.map((t) => t.artistName));
    const recentArtistNames = Array.from(trackArtistNames);

    // Combine library artists with artists from listening history
    const artistMap = new Map<string, AppleMusicArtist & { score: number }>();

    // Library artists get base score
    libraryArtists.forEach((artist, index) => {
      const score = 50 - index * 0.5;
      artistMap.set(artist.name.toLowerCase(), { ...artist, score });
    });

    // Recent artists get higher score
    recentlyPlayed.forEach((track, index) => {
      const key = track.artistName.toLowerCase();
      const score = 80 - index;
      if (artistMap.has(key)) {
        artistMap.get(key)!.score += score;
      } else {
        artistMap.set(key, {
          id: "",
          name: track.artistName,
          genres: track.genreNames,
          url: "",
          score,
        });
      }
    });

    // Heavy rotation gets highest score
    heavyRotation.forEach((track, index) => {
      const key = track.artistName.toLowerCase();
      const score = 100 - index * 2;
      if (artistMap.has(key)) {
        artistMap.get(key)!.score += score;
      } else {
        artistMap.set(key, {
          id: "",
          name: track.artistName,
          genres: track.genreNames,
          url: "",
          score,
        });
      }
    });

    // Sort by score and get top artists
    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ score, ...artist }) => artist);

    // Extract genres from all tracks
    const topGenres = extractGenresFromTracks(allTracks);

    return {
      topArtists,
      topGenres,
      recentArtistNames,
      artistNames: topArtists.map((a) => a.name),
    };
  } catch (error) {
    console.error("Error fetching Apple Music profile:", error);
    throw error;
  }
}
