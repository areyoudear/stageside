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

  // Genre matching
  const normalizedConcertGenres = concertGenres.map((g) => g.toLowerCase());
  const normalizedUserGenres = userTopGenres.map((g) => g.toLowerCase());

  const matchingGenres = normalizedConcertGenres.filter((g) =>
    normalizedUserGenres.some((ug) => g.includes(ug) || ug.includes(g))
  );

  if (matchingGenres.length > 0) {
    score += matchingGenres.length * 15;
    if (reasons.length === 0) {
      reasons.push(`Matches your ${matchingGenres[0]} taste`);
    }
  }

  return { score, reasons };
}
