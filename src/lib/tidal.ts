/**
 * Tidal API Integration
 * Handles OAuth and fetching user's music data
 *
 * Requirements:
 * - Tidal Developer account (developer.tidal.com)
 * - OAuth 2.0 client credentials
 *
 * Docs: https://developer.tidal.com/documentation/
 */

const TIDAL_API_BASE = "https://openapi.tidal.com/v2";
const TIDAL_AUTH_URL = "https://auth.tidal.com/v1/oauth2";

export interface TidalArtist {
  id: string;
  name: string;
  picture: string | null;
  url: string;
}

export interface TidalTrack {
  id: string;
  title: string;
  artists: TidalArtist[];
  album: {
    id: string;
    title: string;
    cover: string | null;
  };
  duration: number;
}

export interface TidalAlbum {
  id: string;
  title: string;
  artists: TidalArtist[];
  cover: string | null;
  releaseDate: string;
}

/**
 * Tidal OAuth scopes required
 */
export const TIDAL_SCOPES = [
  "user.read",
  "collection.read",
  "playback",
].join(" ");

/**
 * Generate Tidal authorization URL
 */
export function getAuthorizationUrl(
  clientId: string,
  redirectUri: string,
  state: string
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: TIDAL_SCOPES,
    state,
  });

  return `${TIDAL_AUTH_URL}/authorize?${params}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}> {
  const response = await fetch(`${TIDAL_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Tidal token error:", error);
    throw new Error(`Failed to exchange code: ${response.status}`);
  }

  return response.json();
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const response = await fetch(`${TIDAL_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status}`);
  }

  return response.json();
}

/**
 * Make authenticated API request to Tidal
 */
async function tidalFetch(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {}
): Promise<Response> {
  const clientId = process.env.TIDAL_CLIENT_ID;

  return fetch(`${TIDAL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/vnd.tidal.v1+json",
      "X-Tidal-Token": clientId || "",
      ...options.headers,
    },
  });
}

/**
 * Get user profile
 */
export async function getUserProfile(accessToken: string): Promise<{
  id: string;
  username: string;
  email: string;
  countryCode: string;
}> {
  const response = await tidalFetch("/users/me", accessToken);

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch user's favorite artists
 */
export async function getFavoriteArtists(
  accessToken: string,
  limit: number = 100
): Promise<TidalArtist[]> {
  const artists: TidalArtist[] = [];
  let offset = 0;

  while (artists.length < limit) {
    const response = await tidalFetch(
      `/users/me/favorites/artists?limit=${Math.min(100, limit - artists.length)}&offset=${offset}`,
      accessToken
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Tidal API error:", error);
      throw new Error(`Failed to fetch favorite artists: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) break;

    for (const item of data.data) {
      const resource = item.resource || item;
      artists.push({
        id: resource.id,
        name: resource.name,
        picture: resource.picture
          ? `https://resources.tidal.com/images/${resource.picture.replace(/-/g, "/")}/320x320.jpg`
          : null,
        url: resource.tidalUrl || "",
      });
    }

    if (!data.metadata?.total || artists.length >= data.metadata.total) break;
    offset += data.data.length;
  }

  return artists.slice(0, limit);
}

/**
 * Fetch user's favorite tracks
 */
export async function getFavoriteTracks(
  accessToken: string,
  limit: number = 100
): Promise<TidalTrack[]> {
  const tracks: TidalTrack[] = [];
  let offset = 0;

  while (tracks.length < limit) {
    const response = await tidalFetch(
      `/users/me/favorites/tracks?limit=${Math.min(100, limit - tracks.length)}&offset=${offset}`,
      accessToken
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch favorite tracks: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) break;

    for (const item of data.data) {
      const resource = item.resource || item;
      tracks.push({
        id: resource.id,
        title: resource.title,
        artists: (resource.artists || []).map(
          (a: { id: string; name: string; picture?: string }) => ({
            id: a.id,
            name: a.name,
            picture: a.picture
              ? `https://resources.tidal.com/images/${a.picture.replace(/-/g, "/")}/320x320.jpg`
              : null,
            url: "",
          })
        ),
        album: {
          id: resource.album?.id || "",
          title: resource.album?.title || "",
          cover: resource.album?.cover
            ? `https://resources.tidal.com/images/${resource.album.cover.replace(/-/g, "/")}/320x320.jpg`
            : null,
        },
        duration: resource.duration || 0,
      });
    }

    if (!data.metadata?.total || tracks.length >= data.metadata.total) break;
    offset += data.data.length;
  }

  return tracks.slice(0, limit);
}

/**
 * Fetch user's favorite albums
 */
export async function getFavoriteAlbums(
  accessToken: string,
  limit: number = 50
): Promise<TidalAlbum[]> {
  const albums: TidalAlbum[] = [];
  let offset = 0;

  while (albums.length < limit) {
    const response = await tidalFetch(
      `/users/me/favorites/albums?limit=${Math.min(50, limit - albums.length)}&offset=${offset}`,
      accessToken
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch favorite albums: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) break;

    for (const item of data.data) {
      const resource = item.resource || item;
      albums.push({
        id: resource.id,
        title: resource.title,
        artists: (resource.artists || []).map(
          (a: { id: string; name: string }) => ({
            id: a.id,
            name: a.name,
            picture: null,
            url: "",
          })
        ),
        cover: resource.cover
          ? `https://resources.tidal.com/images/${resource.cover.replace(/-/g, "/")}/320x320.jpg`
          : null,
        releaseDate: resource.releaseDate || "",
      });
    }

    if (!data.metadata?.total || albums.length >= data.metadata.total) break;
    offset += data.data.length;
  }

  return albums.slice(0, limit);
}

/**
 * Fetch user's listening history (recently played)
 */
export async function getListeningHistory(
  accessToken: string,
  limit: number = 100
): Promise<TidalTrack[]> {
  // Note: Tidal's API for listening history may vary
  // This is based on their documented endpoints
  const response = await tidalFetch(
    `/users/me/playback/history?limit=${Math.min(100, limit)}`,
    accessToken
  );

  if (!response.ok) {
    // Listening history might not be available for all users
    console.warn("Listening history not available");
    return [];
  }

  const data = await response.json();

  return (data.data || []).map(
    (item: {
      resource?: {
        id: string;
        title: string;
        artists?: { id: string; name: string; picture?: string }[];
        album?: { id: string; title: string; cover?: string };
        duration?: number;
      };
      id?: string;
      title?: string;
      artists?: { id: string; name: string; picture?: string }[];
      album?: { id: string; title: string; cover?: string };
      duration?: number;
    }) => {
      const resource = item.resource || item;
      return {
        id: resource.id,
        title: resource.title,
        artists: (resource.artists || []).map((a) => ({
          id: a.id,
          name: a.name,
          picture: a.picture
            ? `https://resources.tidal.com/images/${a.picture.replace(/-/g, "/")}/320x320.jpg`
            : null,
          url: "",
        })),
        album: {
          id: resource.album?.id || "",
          title: resource.album?.title || "",
          cover: resource.album?.cover
            ? `https://resources.tidal.com/images/${resource.album.cover.replace(/-/g, "/")}/320x320.jpg`
            : null,
        },
        duration: resource.duration || 0,
      };
    }
  );
}

/**
 * Get comprehensive user music profile from Tidal
 */
export async function getUserMusicProfile(accessToken: string) {
  try {
    const [favoriteArtists, favoriteTracks, favoriteAlbums, listeningHistory] =
      await Promise.all([
        getFavoriteArtists(accessToken, 100),
        getFavoriteTracks(accessToken, 100),
        getFavoriteAlbums(accessToken, 50),
        getListeningHistory(accessToken, 50).catch(() => []),
      ]);

    // Build artist map with scores
    const artistMap = new Map<
      string,
      TidalArtist & { score: number }
    >();

    // Favorite artists get highest base score
    favoriteArtists.forEach((artist, index) => {
      const score = 100 - index;
      artistMap.set(artist.id, { ...artist, score });
    });

    // Artists from favorite tracks
    favoriteTracks.forEach((track, index) => {
      const weight = 50 - Math.floor(index / 2);
      track.artists.forEach((artist) => {
        if (artistMap.has(artist.id)) {
          artistMap.get(artist.id)!.score += weight;
        } else {
          artistMap.set(artist.id, { ...artist, score: weight });
        }
      });
    });

    // Artists from favorite albums
    favoriteAlbums.forEach((album, index) => {
      const weight = 30 - Math.floor(index / 2);
      album.artists.forEach((artist) => {
        if (artistMap.has(artist.id)) {
          artistMap.get(artist.id)!.score += weight;
        } else {
          artistMap.set(artist.id, { ...artist, score: weight });
        }
      });
    });

    // Recent listening gets recency bonus
    listeningHistory.forEach((track, index) => {
      const weight = 70 - index;
      track.artists.forEach((artist) => {
        if (artistMap.has(artist.id)) {
          artistMap.get(artist.id)!.score += weight;
        } else {
          artistMap.set(artist.id, { ...artist, score: weight });
        }
      });
    });

    // Sort by score
    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ score, ...artist }) => ({
        ...artist,
        genres: [] as string[], // Tidal doesn't easily expose genres in user data
      }));

    // Recent artists from listening history
    const recentArtistNames = Array.from(
      new Set(
        listeningHistory.flatMap((track) => track.artists.map((a) => a.name))
      )
    );

    return {
      topArtists,
      topGenres: [] as string[], // Would need separate genre lookup
      recentArtistNames,
      artistNames: topArtists.map((a) => a.name),
      stats: {
        favoriteArtists: favoriteArtists.length,
        favoriteTracks: favoriteTracks.length,
        favoriteAlbums: favoriteAlbums.length,
        recentTracks: listeningHistory.length,
      },
    };
  } catch (error) {
    console.error("Error fetching Tidal music profile:", error);
    throw error;
  }
}
