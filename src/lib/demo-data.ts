/**
 * Demo Mode Data
 * Uses recognizable indie/alternative artists that the target audience would know
 * Focus: Artists that have dedicated fanbases who would "get" the recommendations
 */

import type { Concert } from "./ticketmaster";

// Indie/Alternative focused - these are artists people KNOW and have opinions about
// If you listen to these artists, you'd immediately understand the matching
export const DEMO_TOP_ARTISTS = [
  { name: "Phoebe Bridgers", genres: ["indie folk", "indie rock", "sad girl music"] },
  { name: "Boygenius", genres: ["indie rock", "folk rock", "supergroup"] },
  { name: "Japanese Breakfast", genres: ["indie pop", "dream pop", "shoegaze"] },
  { name: "Mitski", genres: ["indie rock", "art pop", "emotional"] },
  { name: "The 1975", genres: ["indie pop", "synth-pop", "alternative rock"] },
  { name: "Turnstile", genres: ["hardcore punk", "post-hardcore", "crossover"] },
  { name: "Wet Leg", genres: ["indie rock", "post-punk", "brit rock"] },
  { name: "beabadoobee", genres: ["indie pop", "bedroom pop", "shoegaze"] },
  { name: "Clairo", genres: ["indie pop", "bedroom pop", "lo-fi"] },
  { name: "Mac DeMarco", genres: ["indie rock", "jangle pop", "slacker rock"] },
  { name: "Khruangbin", genres: ["psychedelic", "funk", "world music"] },
  { name: "King Gizzard", genres: ["psychedelic rock", "garage rock", "experimental"] },
];

export const DEMO_TOP_GENRES = [
  "indie rock",
  "indie pop",
  "alternative",
  "dream pop",
  "shoegaze",
  "post-punk",
  "folk rock",
  "psychedelic",
];

// Default demo location - Los Angeles has tons of shows
export const DEMO_DEFAULT_LOCATION = {
  name: "Los Angeles, CA",
  lat: 34.0522,
  lng: -118.2437,
};

// Function to generate realistic demo concerts based on location
export function generateDemoConcerts(
  cityName: string,
  startDate: Date,
  endDate: Date
): Concert[] {
  const concerts: Concert[] = [];
  const venues = getDemoVenues(cityName);

  // Artists that would OBVIOUSLY match this profile - the "duh" recommendations
  const perfectMatches = [
    { name: "Phoebe Bridgers", genres: ["indie folk"], matchScore: 100, matchReasons: ["Your #1 artist!"] },
    { name: "Boygenius", genres: ["indie rock"], matchScore: 98, matchReasons: ["Your #2 artist", "Members include Phoebe Bridgers"] },
    { name: "Japanese Breakfast", genres: ["indie pop", "dream pop"], matchScore: 95, matchReasons: ["In your top artists"] },
    { name: "Mitski", genres: ["indie rock", "art pop"], matchScore: 92, matchReasons: ["In your top artists"] },
  ];

  // Good matches - related artists that make sense
  const greatMatches = [
    { name: "Lucy Dacus", genres: ["indie folk"], matchScore: 88, matchReasons: ["Member of Boygenius", "Similar to Phoebe Bridgers"] },
    { name: "Julien Baker", genres: ["indie folk"], matchScore: 86, matchReasons: ["Member of Boygenius"] },
    { name: "Snail Mail", genres: ["indie rock"], matchScore: 82, matchReasons: ["Similar to Mitski", "Genre match: indie rock"] },
    { name: "Soccer Mommy", genres: ["indie rock"], matchScore: 78, matchReasons: ["Similar to Phoebe Bridgers", "Genre match"] },
    { name: "Alex G", genres: ["indie rock", "lo-fi"], matchScore: 75, matchReasons: ["Genre match: indie rock", "Similar vibe"] },
  ];

  // Discovery - artists they'd probably like based on taste
  const discoveries = [
    { name: "Wednesday", genres: ["shoegaze", "country"], matchScore: 68, matchReasons: ["Fans of Phoebe Bridgers also like", "Shoegaze match"] },
    { name: "Bartees Strange", genres: ["indie rock"], matchScore: 62, matchReasons: ["Genre match: indie rock", "Rising artist"] },
    { name: "Arlo Parks", genres: ["indie pop", "bedroom pop"], matchScore: 58, matchReasons: ["Similar to Clairo", "Genre match"] },
    { name: "Alvvays", genres: ["dream pop", "shoegaze"], matchScore: 55, matchReasons: ["Genre match: dream pop", "Similar to Japanese Breakfast"] },
    { name: "Men I Trust", genres: ["dream pop", "indie"], matchScore: 52, matchReasons: ["Genre match: dream pop"] },
    { name: "Indigo De Souza", genres: ["indie rock"], matchScore: 48, matchReasons: ["Rising in indie scene"] },
  ];

  // Lower matches for comparison
  const lowerMatches = [
    { name: "The Smile", genres: ["alternative rock"], matchScore: 42, matchReasons: ["Alternative rock match"] },
    { name: "Father John Misty", genres: ["folk rock", "baroque pop"], matchScore: 38, matchReasons: ["Folk rock elements"] },
    { name: "Sharon Van Etten", genres: ["indie rock", "folk"], matchScore: 35, matchReasons: ["Indie folk crossover"] },
    { name: "Big Thief", genres: ["indie folk"], matchScore: 32, matchReasons: ["Folk rock influence"] },
  ];

  const allArtists = [...perfectMatches, ...greatMatches, ...discoveries, ...lowerMatches];

  // Generate concerts spread across the date range
  const dateSpread = endDate.getTime() - startDate.getTime();

  allArtists.forEach((artist, index) => {
    // Stagger dates
    const concertDate = new Date(
      startDate.getTime() + (dateSpread * (index * 0.05 + Math.random() * 0.08))
    );

    // Don't go past end date
    if (concertDate > endDate) return;

    const venue = venues[index % venues.length];

    concerts.push({
      id: `demo-${index}-${artist.name.toLowerCase().replace(/\s/g, "-")}`,
      name: `${artist.name}`,
      artists: [artist.name],
      genres: artist.genres,
      date: concertDate.toISOString().split("T")[0],
      time: "20:00:00",
      venue: {
        name: venue.name,
        city: cityName.split(",")[0],
        state: venue.state || undefined,
        country: "US",
      },
      imageUrl: getArtistImage(artist.name),
      ticketUrl: "#demo",
      priceRange: getPriceRange(artist.matchScore),
      matchScore: artist.matchScore,
      matchReasons: artist.matchReasons,
      isSaved: false,
    });
  });

  // Sort by match score
  return concerts.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
}

function getDemoVenues(city: string): { name: string; state: string }[] {
  const venuesByCity: Record<string, { name: string; state: string }[]> = {
    "Los Angeles": [
      { name: "The Greek Theatre", state: "CA" },
      { name: "Hollywood Bowl", state: "CA" },
      { name: "The Wiltern", state: "CA" },
      { name: "The Fonda Theatre", state: "CA" },
      { name: "The Troubadour", state: "CA" },
      { name: "The Roxy Theatre", state: "CA" },
      { name: "The Echo", state: "CA" },
      { name: "Shrine Auditorium", state: "CA" },
    ],
    "San Francisco": [
      { name: "The Fillmore", state: "CA" },
      { name: "The Warfield", state: "CA" },
      { name: "The Independent", state: "CA" },
      { name: "Great American Music Hall", state: "CA" },
      { name: "The Chapel", state: "CA" },
    ],
    "New York": [
      { name: "Brooklyn Steel", state: "NY" },
      { name: "Webster Hall", state: "NY" },
      { name: "Bowery Ballroom", state: "NY" },
      { name: "Music Hall of Williamsburg", state: "NY" },
      { name: "Terminal 5", state: "NY" },
    ],
    default: [
      { name: "The Music Hall", state: "" },
      { name: "Downtown Theatre", state: "" },
      { name: "The Venue", state: "" },
      { name: "Civic Auditorium", state: "" },
    ],
  };

  // Find matching city or use default
  for (const [key, venues] of Object.entries(venuesByCity)) {
    if (city.toLowerCase().includes(key.toLowerCase())) {
      return venues;
    }
  }
  return venuesByCity.default;
}

function getArtistImage(artistName: string): string {
  // Use placeholder images with artist-specific colors
  const colors: Record<string, string> = {
    "Phoebe Bridgers": "A78BFA",
    "Boygenius": "8B5CF6",
    "Japanese Breakfast": "F472B6",
    "Mitski": "EF4444",
    "Lucy Dacus": "F59E0B",
    "Julien Baker": "6366F1",
    "Snail Mail": "22D3EE",
    "Soccer Mommy": "10B981",
    "Alex G": "84CC16",
    "Wednesday": "F43F5E",
    "Bartees Strange": "EC4899",
    "Arlo Parks": "A855F7",
    "Alvvays": "06B6D4",
    "Men I Trust": "14B8A6",
    "Indigo De Souza": "F97316",
    "The Smile": "6B7280",
    "Father John Misty": "B45309",
    "Sharon Van Etten": "DB2777",
    "Big Thief": "65A30D",
  };

  const color = colors[artistName] || "6366F1";
  const encodedName = encodeURIComponent(artistName.split(" ").slice(0, 2).join(" "));
  return `https://placehold.co/400x400/${color}/FFFFFF?text=${encodedName}`;
}

function getPriceRange(matchScore: number): { min: number; max: number; currency: string } | undefined {
  // Indie shows tend to be more affordable
  if (matchScore > 90) return { min: 45, max: 85, currency: "USD" };
  if (matchScore > 70) return { min: 35, max: 65, currency: "USD" };
  if (matchScore > 50) return { min: 28, max: 55, currency: "USD" };
  return { min: 22, max: 45, currency: "USD" };
}

// Demo stats for display
export const DEMO_STATS = {
  highMatches: 4,
  totalElements: 19,
  userTopArtists: DEMO_TOP_ARTISTS.map((a) => a.name),
  userTopGenres: DEMO_TOP_GENRES,
  connectedServices: ["demo"] as const,
};
