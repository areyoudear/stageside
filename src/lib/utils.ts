import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 * Combines clsx for conditional classes with tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format date for API calls (YYYY-MM-DD)
 */
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Calculate days until event
 */
export function daysUntil(date: Date | string): number {
  const eventDate = new Date(date);
  const today = new Date();
  const diffTime = eventDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Truncate text with ellipsis
 */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Generate Ticketmaster affiliate link
 * Format: Add affiliate tracking parameter
 */
export function generateAffiliateLink(ticketUrl: string, affiliateId?: string): string {
  if (!affiliateId) return ticketUrl;
  const url = new URL(ticketUrl);
  url.searchParams.set("afflid", affiliateId);
  return url.toString();
}

/**
 * Normalize artist name for matching
 * Removes special characters, converts to lowercase
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Genre affinity map - genres that are often liked together
const GENRE_AFFINITIES: Record<string, string[]> = {
  "rock": ["alternative", "indie", "punk", "metal", "grunge"],
  "pop": ["dance", "electronic", "r&b", "indie pop"],
  "hip-hop": ["rap", "r&b", "urban", "trap"],
  "rap": ["hip-hop", "r&b", "urban", "trap"],
  "electronic": ["edm", "dance", "house", "techno", "dubstep", "trance"],
  "edm": ["electronic", "dance", "house", "techno"],
  "indie": ["alternative", "indie rock", "indie pop", "folk"],
  "r&b": ["soul", "hip-hop", "pop", "urban"],
  "jazz": ["blues", "soul", "funk"],
  "country": ["folk", "americana", "bluegrass"],
  "metal": ["rock", "hard rock", "punk"],
  "folk": ["indie", "acoustic", "singer-songwriter", "country"],
};

/**
 * Calculate match score between user profile and concert
 */
export function calculateMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  userTopArtists: string[],
  userTopGenres: string[],
  userRecentArtists: string[] = []
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const normalizedConcertArtists = concertArtists.map(normalizeArtistName);
  const normalizedUserArtists = userTopArtists.map(normalizeArtistName);
  const normalizedRecentArtists = userRecentArtists.map(normalizeArtistName);

  // Check for exact artist matches (highest priority)
  for (const artist of normalizedConcertArtists) {
    const artistIndex = normalizedUserArtists.indexOf(artist);
    if (artistIndex !== -1) {
      // Higher score for higher-ranked artists
      const rankBonus = Math.max(0, 50 - artistIndex * 2);
      score += 100 + rankBonus;
      reasons.push(`You love ${concertArtists[normalizedConcertArtists.indexOf(artist)]}`);
      break; // Only count primary match
    }
  }

  // Check for partial artist name matches (e.g., "Taylor Swift" matches "The Taylor Swift Experience")
  if (score === 0) {
    for (const concertArtist of normalizedConcertArtists) {
      for (let i = 0; i < normalizedUserArtists.length; i++) {
        const userArtist = normalizedUserArtists[i];
        // Check if one contains the other (but require at least 5 chars to avoid false positives)
        if (userArtist.length >= 5 && concertArtist.includes(userArtist)) {
          score += 80;
          reasons.push(`Similar to ${userTopArtists[i]}`);
          break;
        }
        if (concertArtist.length >= 5 && userArtist.includes(concertArtist)) {
          score += 80;
          reasons.push(`Similar to ${userTopArtists[i]}`);
          break;
        }
      }
      if (score > 0) break;
    }
  }

  // Check recently played artists
  if (score === 0) {
    for (const artist of normalizedConcertArtists) {
      if (normalizedRecentArtists.includes(artist)) {
        score += 70;
        reasons.push(`Recently played ${concertArtists[normalizedConcertArtists.indexOf(artist)]}`);
        break;
      }
    }
  }

  // Genre matching with affinity scoring
  const normalizedConcertGenres = concertGenres.map((g) => g.toLowerCase());
  const normalizedUserGenres = userTopGenres.map((g) => g.toLowerCase());

  // Direct genre matches
  const directMatches = normalizedConcertGenres.filter((g) =>
    normalizedUserGenres.some((ug) => g.includes(ug) || ug.includes(g))
  );

  if (directMatches.length > 0) {
    // Primary genre match gets more points
    score += 20 + (directMatches.length - 1) * 10;
    if (reasons.length === 0) {
      reasons.push(`Matches your ${directMatches[0]} taste`);
    }
  }

  // Check for affinity matches (related genres)
  if (reasons.length === 0) {
    for (const userGenre of normalizedUserGenres) {
      const affinities = GENRE_AFFINITIES[userGenre] || [];
      const affinityMatch = normalizedConcertGenres.find((cg) =>
        affinities.some((a) => cg.includes(a))
      );
      if (affinityMatch) {
        score += 15;
        reasons.push(`You might like this ${affinityMatch} show`);
        break;
      }
    }
  }

  // Bonus for multiple genre matches (shows versatility)
  if (directMatches.length >= 2) {
    score += 5;
  }

  return { score, reasons };
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get day of week from date string
 */
export function getDayOfWeek(dateStr: string): "weekday" | "weekend" {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6 ? "weekend" : "weekday"; // Fri, Sat, Sun = weekend
}
