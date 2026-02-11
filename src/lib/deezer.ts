/**
 * Deezer API Integration
 * Handles OAuth and fetching user's music data
 *
 * Requirements:
 * - Deezer Developer account (developers.deezer.com)
 * - OAuth 2.0 application
 *
 * Docs: https://developers.deezer.com/api
 *
 * Note: Deezer has a simple REST API with straightforward OAuth
 */

const DEEZER_API_BASE = "https://api.deezer.com";
const DEEZER_AUTH_URL = "https://connect.deezer.com/oauth";

export interface DeezerArtist {
  id: number;
  name: string;
  picture: string;
  picture_medium: string;
  picture_big: string;
  link: string;
  nb_album?: number;
  nb_fan?: number;
}

export interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  artist: DeezerArtist;
  album: {
    id: number;
    title: string;
    cover: string;
    cover_medium: string;
  };
  link: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  artist: DeezerArtist;
  cover: string;
  cover_medium: string;
  release_date: string;
  nb_tracks: number;
}

export interface DeezerGenre {
  id: number;
  name: string;
  picture: string;
}

/**
 * Deezer OAuth permissions required
 */
export const DEEZER_PERMISSIONS = [
  "basic_access",
  "email",
  "listening_history",
].join(",");

/**
 * Generate Deezer authorization URL
 */
export function getAuthorizationUrl(
  appId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    app_id: appId,
    redirect_uri: redirectUri,
    perms: DEEZER_PERMISSIONS,
    state,
  });

  return `${DEEZER_AUTH_URL}/auth.php?${params}`;
}

/**
 * Exchange authorization code for access token
 * Note: Deezer uses a simpler flow than OAuth 2.0
 */
export async function exchangeCodeForToken(
  code: string,
  appId: string,
  appSecret: string
): Promise<{
  access_token: string;
  expires: number;
}> {
  const params = new URLSearchParams({
    app_id: appId,
    secret: appSecret,
    code,
    output: "json",
  });

  const response = await fetch(`${DEEZER_AUTH_URL}/access_token.php?${params}`);

  if (!response.ok) {
    throw new Error(`Failed to exchange code: ${response.status}`);
  }

  const text = await response.text();

  // Deezer returns URL-encoded params, not JSON
  if (text.includes("access_token=")) {
    const tokenParams = new URLSearchParams(text);
    return {
      access_token: tokenParams.get("access_token") || "",
      expires: parseInt(tokenParams.get("expires") || "0", 10),
    };
  }

  // Try parsing as JSON (newer API might use JSON)
  try {
    const data = JSON.parse(text);
    if (data.error) {
      throw new Error(data.error.message || "Token exchange failed");
    }
    return data;
  } catch {
    throw new Error("Invalid token response from Deezer");
  }
}

/**
 * Make authenticated API request to Deezer
 */
async function deezerFetch(
  endpoint: string,
  accessToken: string
): Promise<unknown> {
  const url = new URL(`${DEEZER_API_BASE}${endpoint}`);
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Deezer API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "Deezer API error");
  }

  return data;
}

/**
 * Get user profile
 */
export async function getUserProfile(accessToken: string): Promise<{
  id: number;
  name: string;
  email: string;
  country: string;
  picture: string;
}> {
  const data = await deezerFetch("/user/me", accessToken);
  return data as {
    id: number;
    name: string;
    email: string;
    country: string;
    picture: string;
  };
}

/**
 * Fetch user's favorite artists
 */
export async function getFavoriteArtists(
  accessToken: string,
  limit: number = 100
): Promise<DeezerArtist[]> {
  const artists: DeezerArtist[] = [];
  let index = 0;

  while (artists.length < limit) {
    const data = (await deezerFetch(
      `/user/me/artists?limit=${Math.min(50, limit - artists.length)}&index=${index}`,
      accessToken
    )) as { data: DeezerArtist[]; total: number; next?: string };

    if (!data.data || data.data.length === 0) break;

    artists.push(...data.data);

    if (!data.next || artists.length >= data.total) break;
    index += data.data.length;
  }

  return artists.slice(0, limit);
}

/**
 * Fetch user's favorite tracks
 */
export async function getFavoriteTracks(
  accessToken: string,
  limit: number = 100
): Promise<DeezerTrack[]> {
  const tracks: DeezerTrack[] = [];
  let index = 0;

  while (tracks.length < limit) {
    const data = (await deezerFetch(
      `/user/me/tracks?limit=${Math.min(50, limit - tracks.length)}&index=${index}`,
      accessToken
    )) as { data: DeezerTrack[]; total: number; next?: string };

    if (!data.data || data.data.length === 0) break;

    tracks.push(...data.data);

    if (!data.next || tracks.length >= data.total) break;
    index += data.data.length;
  }

  return tracks.slice(0, limit);
}

/**
 * Fetch user's favorite albums
 */
export async function getFavoriteAlbums(
  accessToken: string,
  limit: number = 50
): Promise<DeezerAlbum[]> {
  const albums: DeezerAlbum[] = [];
  let index = 0;

  while (albums.length < limit) {
    const data = (await deezerFetch(
      `/user/me/albums?limit=${Math.min(50, limit - albums.length)}&index=${index}`,
      accessToken
    )) as { data: DeezerAlbum[]; total: number; next?: string };

    if (!data.data || data.data.length === 0) break;

    albums.push(...data.data);

    if (!data.next || albums.length >= data.total) break;
    index += data.data.length;
  }

  return albums.slice(0, limit);
}

/**
 * Fetch user's listening history (charts/recommendations based on listening)
 * Note: Deezer doesn't expose raw listening history, but has recommendations
 */
export async function getPersonalCharts(
  accessToken: string,
  limit: number = 50
): Promise<DeezerTrack[]> {
  try {
    const data = (await deezerFetch(
      `/user/me/charts/tracks?limit=${Math.min(50, limit)}`,
      accessToken
    )) as { data: DeezerTrack[] };

    return data.data || [];
  } catch {
    // Personal charts might not be available for all users
    return [];
  }
}

/**
 * Fetch user's flow (personalized recommendations)
 */
export async function getFlow(
  accessToken: string,
  limit: number = 50
): Promise<DeezerTrack[]> {
  try {
    const data = (await deezerFetch(
      `/user/me/flow?limit=${Math.min(50, limit)}`,
      accessToken
    )) as { data: DeezerTrack[] };

    return data.data || [];
  } catch {
    return [];
  }
}

/**
 * Get artist details including genres
 */
export async function getArtistDetails(
  accessToken: string,
  artistId: number
): Promise<DeezerArtist & { genres?: DeezerGenre[] }> {
  const data = await deezerFetch(`/artist/${artistId}`, accessToken);
  return data as DeezerArtist & { genres?: DeezerGenre[] };
}

/**
 * Get genre details
 */
export async function getAllGenres(accessToken: string): Promise<DeezerGenre[]> {
  const data = (await deezerFetch("/genre", accessToken)) as { data: DeezerGenre[] };
  return data.data || [];
}

/**
 * Get comprehensive user music profile from Deezer
 */
export async function getUserMusicProfile(accessToken: string) {
  try {
    const [favoriteArtists, favoriteTracks, favoriteAlbums, personalCharts, flow] =
      await Promise.all([
        getFavoriteArtists(accessToken, 100),
        getFavoriteTracks(accessToken, 100),
        getFavoriteAlbums(accessToken, 50),
        getPersonalCharts(accessToken, 50).catch(() => []),
        getFlow(accessToken, 50).catch(() => []),
      ]);

    // Build artist map with scores
    const artistMap = new Map<
      number,
      DeezerArtist & { score: number }
    >();

    // Favorite artists get highest base score
    favoriteArtists.forEach((artist, index) => {
      const score = 100 - index;
      artistMap.set(artist.id, { ...artist, score });
    });

    // Artists from favorite tracks
    favoriteTracks.forEach((track, index) => {
      const weight = 50 - Math.floor(index / 2);
      const artist = track.artist;
      if (artistMap.has(artist.id)) {
        artistMap.get(artist.id)!.score += weight;
      } else {
        artistMap.set(artist.id, { ...artist, score: weight });
      }
    });

    // Artists from favorite albums
    favoriteAlbums.forEach((album, index) => {
      const weight = 30 - Math.floor(index / 2);
      const artist = album.artist;
      if (artistMap.has(artist.id)) {
        artistMap.get(artist.id)!.score += weight;
      } else {
        artistMap.set(artist.id, { ...artist, score: weight });
      }
    });

    // Personal charts (these are algorithmically determined favorites)
    personalCharts.forEach((track, index) => {
      const weight = 60 - index;
      const artist = track.artist;
      if (artistMap.has(artist.id)) {
        artistMap.get(artist.id)!.score += weight;
      } else {
        artistMap.set(artist.id, { ...artist, score: weight });
      }
    });

    // Flow recommendations (less weight, more discovery-oriented)
    flow.forEach((track, index) => {
      const weight = 20 - Math.floor(index / 3);
      const artist = track.artist;
      if (artistMap.has(artist.id)) {
        artistMap.get(artist.id)!.score += weight;
      } else {
        artistMap.set(artist.id, { ...artist, score: weight });
      }
    });

    // Sort by score
    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ score, ...artist }) => ({
        id: artist.id.toString(),
        name: artist.name,
        genres: [] as string[], // Would need separate lookups
        popularity: artist.nb_fan || 0,
        image_url: artist.picture_medium,
      }));

    // Extract artist names from flow/charts for recency
    const recentArtistNames = Array.from(
      new Set([
        ...personalCharts.map((t) => t.artist.name),
        ...flow.slice(0, 20).map((t) => t.artist.name),
      ])
    );

    return {
      topArtists,
      topGenres: [] as string[], // Would need genre lookup by artist
      recentArtistNames,
      artistNames: topArtists.map((a) => a.name),
      stats: {
        favoriteArtists: favoriteArtists.length,
        favoriteTracks: favoriteTracks.length,
        favoriteAlbums: favoriteAlbums.length,
      },
    };
  } catch (error) {
    console.error("Error fetching Deezer music profile:", error);
    throw error;
  }
}
