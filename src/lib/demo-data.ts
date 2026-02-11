/**
 * Demo Mode Data
 * Realistic mock data for users to experience the app without connecting Spotify
 */

import type { Concert } from "./ticketmaster";

// Popular artists that most people would recognize
export const DEMO_TOP_ARTISTS = [
  { name: "Taylor Swift", genres: ["pop", "country pop", "synth-pop"] },
  { name: "The Weeknd", genres: ["r&b", "pop", "synth-pop"] },
  { name: "Kendrick Lamar", genres: ["hip hop", "rap", "conscious hip hop"] },
  { name: "Billie Eilish", genres: ["pop", "electropop", "indie pop"] },
  { name: "Harry Styles", genres: ["pop", "rock", "brit pop"] },
  { name: "Doja Cat", genres: ["pop", "r&b", "hip hop"] },
  { name: "Bad Bunny", genres: ["reggaeton", "latin trap", "urbano latino"] },
  { name: "Dua Lipa", genres: ["pop", "dance pop", "disco"] },
  { name: "SZA", genres: ["r&b", "neo soul", "alternative r&b"] },
  { name: "Post Malone", genres: ["hip hop", "pop", "rock"] },
  { name: "Olivia Rodrigo", genres: ["pop", "pop rock", "indie pop"] },
  { name: "Drake", genres: ["hip hop", "r&b", "pop rap"] },
];

export const DEMO_TOP_GENRES = [
  "pop",
  "hip hop",
  "r&b",
  "rock",
  "indie",
  "electronic",
  "alternative",
  "latin",
];

// Function to generate realistic demo concerts based on location
export function generateDemoConcerts(
  cityName: string,
  startDate: Date,
  endDate: Date
): Concert[] {
  const concerts: Concert[] = [];
  const venues = getDemoVenues(cityName);

  // Mix of matched artists and discovery artists
  const matchedArtists = [
    { name: "Taylor Swift", genres: ["pop"], matchScore: 100, matchReasons: ["Your #1 artist!"] },
    { name: "The Weeknd", genres: ["r&b", "pop"], matchScore: 95, matchReasons: ["In your top artists"] },
    { name: "SZA", genres: ["r&b"], matchScore: 88, matchReasons: ["In your top artists"] },
    { name: "Post Malone", genres: ["hip hop", "pop"], matchScore: 82, matchReasons: ["In your top artists"] },
    { name: "Doja Cat", genres: ["pop", "hip hop"], matchScore: 78, matchReasons: ["In your top artists", "Genre match: pop"] },
  ];

  const genreMatchArtists = [
    { name: "Sabrina Carpenter", genres: ["pop"], matchScore: 65, matchReasons: ["Genre match: pop"] },
    { name: "Chappell Roan", genres: ["pop", "indie pop"], matchScore: 62, matchReasons: ["Genre match: pop", "Similar to Olivia Rodrigo"] },
    { name: "Charli XCX", genres: ["pop", "hyperpop"], matchScore: 58, matchReasons: ["Genre match: pop"] },
    { name: "21 Savage", genres: ["hip hop", "trap"], matchScore: 55, matchReasons: ["Genre match: hip hop"] },
    { name: "Laufey", genres: ["jazz pop", "indie"], matchScore: 52, matchReasons: ["Genre match: indie"] },
    { name: "Hozier", genres: ["indie folk", "rock"], matchScore: 48, matchReasons: ["Genre match: rock"] },
  ];

  const discoveryArtists = [
    { name: "Japanese Breakfast", genres: ["indie rock"], matchScore: 35, matchReasons: ["Fans also like: Billie Eilish"] },
    { name: "Boygenius", genres: ["indie rock"], matchScore: 32, matchReasons: ["Popular in your area"] },
    { name: "Turnstile", genres: ["hardcore punk", "rock"], matchScore: 28, matchReasons: ["Genre match: rock"] },
    { name: "Khruangbin", genres: ["psychedelic", "funk"], matchScore: 22, matchReasons: ["Trending in " + cityName] },
    { name: "Raye", genres: ["r&b", "pop"], matchScore: 18, matchReasons: ["Rising artist"] },
    { name: "Clairo", genres: ["indie pop"], matchScore: 15, matchReasons: ["Happening near you"] },
  ];

  const allArtists = [...matchedArtists, ...genreMatchArtists, ...discoveryArtists];

  // Generate concerts spread across the date range
  const dateSpread = endDate.getTime() - startDate.getTime();

  allArtists.forEach((artist, index) => {
    // Stagger dates
    const concertDate = new Date(
      startDate.getTime() + (dateSpread * (index * 0.06 + Math.random() * 0.1))
    );

    // Don't go past end date
    if (concertDate > endDate) return;

    const venue = venues[index % venues.length];

    concerts.push({
      id: `demo-${index}-${artist.name.toLowerCase().replace(/\s/g, "-")}`,
      name: `${artist.name} Live`,
      artists: [artist.name],
      genres: artist.genres,
      date: concertDate.toISOString().split("T")[0],
      time: "20:00:00",
      venue: {
        name: venue.name,
        city: cityName,
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
    "San Francisco": [
      { name: "Chase Center", state: "CA" },
      { name: "The Fillmore", state: "CA" },
      { name: "Bill Graham Civic Auditorium", state: "CA" },
      { name: "The Warfield", state: "CA" },
      { name: "Outside Lands", state: "CA" },
    ],
    "Los Angeles": [
      { name: "SoFi Stadium", state: "CA" },
      { name: "Hollywood Bowl", state: "CA" },
      { name: "The Forum", state: "CA" },
      { name: "Greek Theatre", state: "CA" },
      { name: "The Wiltern", state: "CA" },
    ],
    "New York": [
      { name: "Madison Square Garden", state: "NY" },
      { name: "Barclays Center", state: "NY" },
      { name: "Radio City Music Hall", state: "NY" },
      { name: "Terminal 5", state: "NY" },
      { name: "Brooklyn Steel", state: "NY" },
    ],
    default: [
      { name: "City Arena", state: "" },
      { name: "Downtown Theater", state: "" },
      { name: "Music Hall", state: "" },
      { name: "The Amphitheater", state: "" },
      { name: "Convention Center", state: "" },
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
    "Taylor Swift": "8B5CF6",
    "The Weeknd": "EF4444",
    "SZA": "EC4899",
    "Post Malone": "F59E0B",
    "Doja Cat": "10B981",
    "Sabrina Carpenter": "6366F1",
    "Chappell Roan": "F43F5E",
    "Charli XCX": "22D3EE",
    "21 Savage": "1F2937",
    "Laufey": "A78BFA",
    "Hozier": "65A30D",
    "Japanese Breakfast": "FB923C",
    "Boygenius": "A855F7",
    "Turnstile": "DC2626",
    "Khruangbin": "14B8A6",
    "Raye": "D946EF",
    "Clairo": "FCD34D",
  };

  const color = colors[artistName] || "6366F1";
  return `https://placehold.co/400x400/${color}/FFFFFF?text=${encodeURIComponent(artistName.split(" ")[0])}`;
}

function getPriceRange(matchScore: number): { min: number; max: number; currency: string } | undefined {
  // Higher match = likely bigger artist = higher prices
  if (matchScore > 80) return { min: 89, max: 350, currency: "USD" };
  if (matchScore > 60) return { min: 55, max: 150, currency: "USD" };
  if (matchScore > 40) return { min: 35, max: 95, currency: "USD" };
  return { min: 25, max: 65, currency: "USD" };
}

// Demo stats for display
export const DEMO_STATS = {
  highMatches: 5,
  totalElements: 17,
  userTopArtists: DEMO_TOP_ARTISTS.map((a) => a.name),
  userTopGenres: DEMO_TOP_GENRES,
  connectedServices: ["demo"] as const,
};
