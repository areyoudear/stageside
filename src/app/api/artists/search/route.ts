import { NextRequest, NextResponse } from "next/server";

export interface ArtistSearchResult {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  followers?: number;
  popularity?: number;
}

// Spotify API for best results
const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

// Ticketmaster as fallback
const TICKETMASTER_API_BASE = "https://app.ticketmaster.com/discovery/v2";

// MusicBrainz as second fallback (free, no API key needed)
const MUSICBRAINZ_API_BASE = "https://musicbrainz.org/ws/2";

interface SpotifyArtist {
  id: string;
  name: string;
  images: { url: string; width: number; height: number }[];
  genres: string[];
  followers: { total: number };
  popularity: number;
}

interface TicketmasterAttraction {
  id: string;
  name: string;
  images?: { url: string; width: number; height: number }[];
  classifications?: {
    genre?: { name: string };
    subGenre?: { name: string };
  }[];
}

interface MusicBrainzArtist {
  id: string;
  name: string;
  "sort-name": string;
  score: number;
  tags?: { name: string; count: number }[];
}

/**
 * Get Spotify access token using client credentials flow
 */
async function getSpotifyToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      next: { revalidate: 3500 }, // Cache for ~1 hour (tokens last 1 hour)
    });

    if (!response.ok) {
      console.error("Spotify token error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    return null;
  }
}

/**
 * Search artists using Spotify API (best results)
 */
async function searchSpotify(query: string): Promise<ArtistSearchResult[]> {
  const token = await getSpotifyToken();
  if (!token) return [];

  try {
    const url = new URL(`${SPOTIFY_API_BASE}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("type", "artist"); // Only artists, not albums or tracks
    url.searchParams.set("limit", "15");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error("Spotify search error:", await response.text());
      return [];
    }

    const data = await response.json();
    const artists: SpotifyArtist[] = data.artists?.items || [];

    // Sort by popularity (main artists first, not cover bands)
    artists.sort((a, b) => b.popularity - a.popularity);

    return artists.map((artist) => ({
      id: `spotify:${artist.id}`,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      genres: artist.genres.slice(0, 3),
      followers: artist.followers.total,
      popularity: artist.popularity,
    }));
  } catch (error) {
    console.error("Spotify search error:", error);
    return [];
  }
}

/**
 * Search artists using MusicBrainz API (free fallback, good for international artists)
 */
async function searchMusicBrainz(query: string): Promise<ArtistSearchResult[]> {
  try {
    const url = new URL(`${MUSICBRAINZ_API_BASE}/artist`);
    url.searchParams.set("query", query);
    url.searchParams.set("limit", "15");
    url.searchParams.set("fmt", "json");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Stageside/1.0 (https://getstageside.com)",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error("MusicBrainz search error:", await response.text());
      return [];
    }

    const data = await response.json();
    const artists: MusicBrainzArtist[] = data.artists || [];

    // Sort by score (relevance)
    artists.sort((a, b) => b.score - a.score);

    return artists.map((artist) => ({
      id: `mb:${artist.id}`,
      name: artist.name,
      imageUrl: null, // MusicBrainz doesn't provide images directly
      genres: artist.tags?.slice(0, 3).map((t) => t.name) || [],
      popularity: artist.score,
    }));
  } catch (error) {
    console.error("MusicBrainz search error:", error);
    return [];
  }
}

/**
 * Search artists using Ticketmaster Attractions API (original fallback)
 */
async function searchTicketmaster(query: string): Promise<ArtistSearchResult[]> {
  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) return [];

  try {
    const url = new URL(`${TICKETMASTER_API_BASE}/attractions.json`);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("keyword", query);
    url.searchParams.set("classificationName", "Music");
    url.searchParams.set("size", "15");
    url.searchParams.set("sort", "relevance,desc");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error("Ticketmaster API error:", await response.text());
      return [];
    }

    const data = await response.json();

    if (!data._embedded?.attractions) {
      return [];
    }

    return data._embedded.attractions.map((attraction: TicketmasterAttraction) => {
      const image = attraction.images?.find((img) => img.width > 200);
      const genres: string[] = [];
      attraction.classifications?.forEach((c) => {
        if (c.genre?.name && c.genre.name !== "Undefined") genres.push(c.genre.name);
        if (c.subGenre?.name && c.subGenre.name !== "Undefined") genres.push(c.subGenre.name);
      });

      return {
        id: `tm:${attraction.id}`,
        name: attraction.name,
        imageUrl: image?.url || null,
        genres: Array.from(new Set(genres)),
      };
    });
  } catch (error) {
    console.error("Ticketmaster search error:", error);
    return [];
  }
}

/**
 * GET /api/artists/search?q=taylor
 * Search for artists using best available source
 * Priority: Spotify > MusicBrainz > Ticketmaster
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ artists: [] });
  }

  // Try Spotify first (best quality, popularity sorted)
  let artists = await searchSpotify(query);

  // If Spotify failed or returned nothing, try MusicBrainz
  if (artists.length === 0) {
    artists = await searchMusicBrainz(query);
  }

  // If still nothing, fallback to Ticketmaster
  if (artists.length === 0) {
    artists = await searchTicketmaster(query);
  }

  // Deduplicate by normalized name
  const seen = new Set<string>();
  const uniqueArtists = artists.filter((artist) => {
    const normalized = artist.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  return NextResponse.json({ 
    artists: uniqueArtists.slice(0, 10),
    source: artists.length > 0 
      ? (artists[0].id.startsWith("spotify:") ? "spotify" : 
         artists[0].id.startsWith("mb:") ? "musicbrainz" : "ticketmaster")
      : null
  });
}
