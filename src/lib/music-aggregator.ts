/**
 * Music Aggregator
 * Combines and deduplicates artists from multiple music services
 * Creates a unified music profile for concert matching
 */

import { MusicConnection, AggregatedArtist, UserMusicProfile } from "./music-types";

/**
 * Supported music services
 */
export type MusicService = "spotify" | "apple_music" | "youtube_music" | "tidal" | "deezer";

export const MUSIC_SERVICE_INFO: Record<
  MusicService,
  {
    name: string;
    color: string;
    icon: string;
    hasGenres: boolean;
    hasPlayCount: boolean;
  }
> = {
  spotify: {
    name: "Spotify",
    color: "#1DB954",
    icon: "spotify",
    hasGenres: true,
    hasPlayCount: true,
  },
  apple_music: {
    name: "Apple Music",
    color: "#FA243C",
    icon: "apple",
    hasGenres: true,
    hasPlayCount: false,
  },
  youtube_music: {
    name: "YouTube Music",
    color: "#FF0000",
    icon: "youtube",
    hasGenres: false,
    hasPlayCount: false,
  },
  tidal: {
    name: "Tidal",
    color: "#000000",
    icon: "tidal",
    hasGenres: false,
    hasPlayCount: true,
  },
  deezer: {
    name: "Deezer",
    color: "#FF0092",
    icon: "deezer",
    hasGenres: false,
    hasPlayCount: true,
  },
};

/**
 * Normalize artist name for deduplication
 * Handles variations like "The Beatles" vs "Beatles"
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, "") // Remove leading "The"
    .replace(/[^a-z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Check if two artist names likely refer to the same artist
 */
export function isSameArtist(name1: string, name2: string): boolean {
  const norm1 = normalizeArtistName(name1);
  const norm2 = normalizeArtistName(name2);

  // Exact match
  if (norm1 === norm2) return true;

  // One contains the other (handles "Drake" vs "Drake feat. X")
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    // But only if the shorter one is substantial
    const shorter = norm1.length < norm2.length ? norm1 : norm2;
    if (shorter.length >= 4) return true;
  }

  // Levenshtein distance for typos (only for longer names)
  if (norm1.length > 5 && norm2.length > 5) {
    const distance = levenshteinDistance(norm1, norm2);
    const maxLen = Math.max(norm1.length, norm2.length);
    if (distance / maxLen < 0.2) return true; // 20% tolerance
  }

  return false;
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Weight multipliers for different services
 * Based on data quality and reliability
 */
const SERVICE_WEIGHTS: Record<MusicService, number> = {
  spotify: 1.0, // Best data quality
  apple_music: 0.95,
  tidal: 0.9,
  deezer: 0.85,
  youtube_music: 0.7, // Lower due to data extraction uncertainty
};

/**
 * Aggregate artists from multiple music services
 */
export function aggregateArtists(
  profiles: Array<{
    service: MusicService;
    artists: Array<{
      name: string;
      id?: string;
      genres?: string[];
      popularity?: number;
      image_url?: string;
    }>;
    genres?: string[];
  }>
): AggregatedArtist[] {
  // Map: normalized name -> aggregated artist
  const artistMap = new Map<string, AggregatedArtist>();

  for (const profile of profiles) {
    const serviceWeight = SERVICE_WEIGHTS[profile.service];

    profile.artists.forEach((artist, index) => {
      const normalizedName = normalizeArtistName(artist.name);

      // Calculate position-based score (earlier = higher)
      const positionScore = Math.max(100 - index, 10);
      const weightedScore = positionScore * serviceWeight;

      // Find existing entry (might have slight name variation)
      let existingKey: string | null = null;
      const entries = Array.from(artistMap.entries());
      for (const [key, existing] of entries) {
        if (isSameArtist(artist.name, existing.name)) {
          existingKey = key;
          break;
        }
      }

      if (existingKey) {
        // Update existing artist
        const existing = artistMap.get(existingKey)!;
        existing.score += weightedScore;
        existing.sources.push(profile.service);

        // Merge genres (prefer services that have genre data)
        if (artist.genres?.length) {
          existing.genres = mergeGenres(existing.genres, artist.genres);
        }

        // Use best available image
        if (!existing.image_url && artist.image_url) {
          existing.image_url = artist.image_url;
        }

        // Prefer the more "proper" capitalization
        if (artist.name.length > existing.name.length) {
          existing.name = artist.name;
        }
      } else {
        // New artist
        artistMap.set(normalizedName, {
          name: artist.name,
          normalizedName,
          score: weightedScore,
          genres: artist.genres || [],
          sources: [profile.service],
          image_url: artist.image_url,
          sourceIds: artist.id
            ? { [profile.service]: artist.id }
            : {},
        });
      }
    });
  }

  // Sort by score and return
  return Array.from(artistMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 200); // Cap at 200 artists
}

/**
 * Merge and deduplicate genres from multiple sources
 */
function mergeGenres(existing: string[], incoming: string[]): string[] {
  const genreSet = new Set<string>();
  const normalizedMap = new Map<string, string>();

  // Add existing genres
  for (const genre of existing) {
    const normalized = genre.toLowerCase();
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, genre);
      genreSet.add(genre);
    }
  }

  // Add incoming genres (prefer existing capitalization)
  for (const genre of incoming) {
    const normalized = genre.toLowerCase();
    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, genre);
      genreSet.add(genre);
    }
  }

  return Array.from(genreSet);
}

/**
 * Aggregate genres from all services
 */
export function aggregateGenres(
  profiles: Array<{
    service: MusicService;
    genres: string[];
  }>
): string[] {
  const genreCount = new Map<string, number>();

  for (const profile of profiles) {
    const serviceWeight = SERVICE_WEIGHTS[profile.service];

    profile.genres.forEach((genre, index) => {
      const normalized = genre.toLowerCase();
      const positionScore = Math.max(20 - index, 1);
      const weightedScore = positionScore * serviceWeight;

      genreCount.set(
        normalized,
        (genreCount.get(normalized) || 0) + weightedScore
      );
    });
  }

  // Sort by count and return top genres
  return Array.from(genreCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([genre]) => genre);
}

/**
 * Create unified music profile from all connected services
 */
export function createUnifiedProfile(
  connections: MusicConnection[],
  artistData: Map<
    MusicService,
    {
      artists: Array<{
        name: string;
        id?: string;
        genres?: string[];
        popularity?: number;
        image_url?: string;
      }>;
      genres: string[];
      recentArtists?: string[];
    }
  >
): UserMusicProfile {
  // Filter to only active connections
  const activeServices = connections
    .filter((c) => c.is_active && !c.error)
    .map((c) => c.service as MusicService);

  // Prepare profiles for aggregation
  const artistProfiles = activeServices
    .map((service) => {
      const data = artistData.get(service);
      if (!data) return null;
      return {
        service,
        artists: data.artists,
        genres: data.genres,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  // Aggregate artists
  const aggregatedArtists = aggregateArtists(artistProfiles);

  // Aggregate genres
  const genreProfiles = artistProfiles.map((p) => ({
    service: p.service,
    genres: p.genres,
  }));
  const aggregatedGenres = aggregateGenres(genreProfiles);

  // Collect recent artists
  const recentArtists = new Set<string>();
  for (const service of activeServices) {
    const data = artistData.get(service);
    if (data?.recentArtists) {
      data.recentArtists.slice(0, 20).forEach((name) => recentArtists.add(name));
    }
  }

  return {
    topArtists: aggregatedArtists,
    topGenres: aggregatedGenres,
    recentArtistNames: Array.from(recentArtists),
    connectedServices: activeServices,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Calculate match strength between unified profile and concert artists
 */
export function calculateUnifiedMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  profile: UserMusicProfile
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Check for artist matches
  for (const concertArtist of concertArtists) {
    const normalizedConcert = normalizeArtistName(concertArtist);

    // Check top artists
    const artistMatch = profile.topArtists.find(
      (a) =>
        isSameArtist(a.name, concertArtist) ||
        normalizeArtistName(a.name) === normalizedConcert
    );

    if (artistMatch) {
      // Score based on artist rank and how many services have them
      const rankBonus = Math.max(0, 50 - profile.topArtists.indexOf(artistMatch) * 0.5);
      const sourceBonus = (artistMatch.sources.length - 1) * 10;
      score += 100 + rankBonus + sourceBonus;

      const sourceText =
        artistMatch.sources.length > 1
          ? ` (${artistMatch.sources.length} services)`
          : "";
      reasons.push(`You love ${artistMatch.name}${sourceText}`);
      break; // Only count primary match
    }
  }

  // Check recent artists (if no top artist match)
  if (score === 0) {
    for (const concertArtist of concertArtists) {
      const isRecent = profile.recentArtistNames.some((name) =>
        isSameArtist(name, concertArtist)
      );
      if (isRecent) {
        score += 70;
        reasons.push(`Recently played ${concertArtist}`);
        break;
      }
    }
  }

  // Genre matching
  const normalizedConcertGenres = concertGenres.map((g) => g.toLowerCase());
  const matchingGenres = normalizedConcertGenres.filter((g) =>
    profile.topGenres.some((ug) => g.includes(ug) || ug.includes(g))
  );

  if (matchingGenres.length > 0) {
    score += matchingGenres.length * 15;
    if (reasons.length === 0) {
      reasons.push(`Matches your ${matchingGenres[0]} taste`);
    }
  }

  return { score, reasons };
}

/**
 * Get summary stats for connected services
 */
export function getConnectionStats(connections: MusicConnection[]): {
  total: number;
  active: number;
  services: MusicService[];
  errors: Array<{ service: MusicService; error: string }>;
} {
  const active = connections.filter((c) => c.is_active && !c.error);
  const errors = connections
    .filter((c) => c.error)
    .map((c) => ({
      service: c.service as MusicService,
      error: c.error!,
    }));

  return {
    total: connections.length,
    active: active.length,
    services: active.map((c) => c.service as MusicService),
    errors,
  };
}
