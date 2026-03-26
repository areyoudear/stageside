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
 * Uses local timezone to avoid date shifting
 */
export function formatDateForAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string as local midnight (not UTC)
 * Handles "YYYY-MM-DD" format from concert APIs
 */
export function parseLocalDate(dateStr: string): Date {
  // Split and parse as local date components
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Calculate days until event
 * Compares dates in user's local timezone
 */
export function daysUntil(date: Date | string): number {
  // Parse event date as local midnight
  const eventDate = typeof date === "string" ? parseLocalDate(date) : date;
  
  // Get today at local midnight for fair comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
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

import { 
  calculatePreciseMatchScore as preciseMatchScore,
  type UserProfile,
} from "@/lib/matching";

/**
 * Calculate match score between user profile and concert
 * Returns score (0-100) and detailed reasons for the match
 * 
 * This is a simplified wrapper around the precision matching algorithm
 * for cases where we only have artist and genre lists.
 */
export function calculateMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  userTopArtists: string[],
  userTopGenres: string[],
  userRecentArtists: string[] = []
): { score: number; reasons: string[] } {
  // Build a UserProfile from the simple lists
  const userProfile: UserProfile = {
    topArtists: userTopArtists.map((name, index) => ({
      name,
      rank: index + 1,
    })),
    relatedArtists: [],
    recentlyPlayed: userRecentArtists,
    topGenres: userTopGenres,
  };

  // Use the precision matching algorithm
  const result = preciseMatchScore(
    concertArtists,
    concertGenres,
    userProfile,
    null, // No audio profile
    new Map(), // No artist audio profiles
    { friendsInterested: 0, friendsGoing: 0 }
  );

  return { 
    score: result.score, 
    reasons: result.reasons 
  };
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
 * Uses parseLocalDate to avoid timezone shifting
 */
export function getDayOfWeek(dateStr: string): "weekday" | "weekend" {
  const date = parseLocalDate(dateStr);
  const day = date.getDay();
  return day === 0 || day === 5 || day === 6 ? "weekend" : "weekday"; // Fri, Sat, Sun = weekend
}
