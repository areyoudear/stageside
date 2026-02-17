/**
 * Ticketmaster Discovery API Integration
 * https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/
 */

const TICKETMASTER_API_BASE = "https://app.ticketmaster.com/discovery/v2";

export interface TicketmasterEvent {
  id: string;
  name: string;
  type: string;
  url: string;
  images: {
    url: string;
    width: number;
    height: number;
    ratio?: string;
  }[];
  dates: {
    start: {
      localDate: string;
      localTime?: string;
      dateTime?: string;
    };
    status: {
      code: string;
    };
  };
  priceRanges?: {
    type: string;
    currency: string;
    min: number;
    max: number;
  }[];
  _embedded?: {
    venues?: {
      id: string;
      name: string;
      city: {
        name: string;
      };
      state?: {
        name: string;
        stateCode: string;
      };
      country: {
        name: string;
        countryCode: string;
      };
      address?: {
        line1: string;
      };
      location?: {
        latitude: string;
        longitude: string;
      };
    }[];
    attractions?: {
      id: string;
      name: string;
      classifications?: {
        genre?: { name: string };
        subGenre?: { name: string };
      }[];
      externalLinks?: {
        spotify?: { url: string }[];
      };
    }[];
  };
  classifications?: {
    segment?: { name: string };
    genre?: { name: string };
    subGenre?: { name: string };
  }[];
}

export interface Concert {
  id: string;
  name: string;
  artists: string[];
  venue: {
    name: string;
    city: string;
    state?: string;
    country: string;
    address?: string;
    location?: {
      lat: number;
      lng: number;
    };
  };
  date: string;
  time?: string;
  imageUrl: string;
  ticketUrl: string;
  priceRange?: {
    min: number;
    max: number;
    currency: string;
  };
  genres: string[];
  // Venue size: intimate (<1000), medium (1000-5000), large (5000-20000), arena (20000+)
  venueSize?: "intimate" | "medium" | "large" | "arena" | "festival";
  // Distance from search location (in miles, calculated after fetch)
  distance?: number;
  // Added during matching
  matchScore?: number;
  matchReasons?: string[];
  isSaved?: boolean;
}

interface SearchParams {
  city?: string;
  latLong?: string; // Format: "latitude,longitude"
  radius?: number; // In miles
  startDate?: string; // Format: YYYY-MM-DDTHH:mm:ssZ
  endDate?: string;
  keyword?: string;
  size?: number;
  page?: number;
  sort?: string;
}

/**
 * Search for music events from Ticketmaster
 */
export async function searchConcerts(params: SearchParams): Promise<{
  concerts: Concert[];
  totalElements: number;
  totalPages: number;
  page: number;
}> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY is not configured");
  }

  // Build query parameters
  const queryParams = new URLSearchParams({
    apikey: apiKey,
    classificationName: "Music", // Only music events
    size: String(params.size || 50),
    page: String(params.page || 0),
    sort: params.sort || "date,asc",
  });

  // Location: prefer latLong for accuracy, fallback to city
  if (params.latLong) {
    queryParams.set("latlong", params.latLong);
    queryParams.set("radius", String(params.radius || 50));
    queryParams.set("unit", "miles");
  } else if (params.city) {
    queryParams.set("city", params.city);
  }

  // Date range
  if (params.startDate) {
    queryParams.set("startDateTime", params.startDate);
  }
  if (params.endDate) {
    queryParams.set("endDateTime", params.endDate);
  }

  // Keyword search (for artist filtering)
  if (params.keyword) {
    queryParams.set("keyword", params.keyword);
  }

  const url = `${TICKETMASTER_API_BASE}/events.json?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Ticketmaster API error:", errorText);
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const data = await response.json();

    // Handle empty results
    if (!data._embedded?.events) {
      return {
        concerts: [],
        totalElements: 0,
        totalPages: 0,
        page: 0,
      };
    }

    // Transform to our Concert format
    const concerts: Concert[] = data._embedded.events.map(transformEvent);

    return {
      concerts,
      totalElements: data.page?.totalElements || concerts.length,
      totalPages: data.page?.totalPages || 1,
      page: data.page?.number || 0,
    };
  } catch (error) {
    console.error("Error fetching concerts:", error);
    throw error;
  }
}

/**
 * Transform Ticketmaster event to our Concert format
 */
function transformEvent(event: TicketmasterEvent): Concert {
  // Get best quality image (prefer 16:9 ratio)
  const image =
    event.images.find((img) => img.ratio === "16_9" && img.width > 500) ||
    event.images.find((img) => img.width > 500) ||
    event.images[0];

  // Extract venue info
  const venue = event._embedded?.venues?.[0];
  const venueLocation = venue?.location
    ? {
        lat: parseFloat(venue.location.latitude),
        lng: parseFloat(venue.location.longitude),
      }
    : undefined;
  
  const venueInfo = venue
    ? {
        name: venue.name,
        city: venue.city?.name || "Unknown",
        state: venue.state?.stateCode,
        country: venue.country?.countryCode || venue.country?.name || "US",
        address: venue.address?.line1,
        location: venueLocation,
      }
    : {
        name: "TBA",
        city: "Unknown",
        country: "US",
      };
  
  // Estimate venue size based on venue name patterns
  const venueSize = estimateVenueSize(venue?.name || "");

  // Extract artist names from attractions
  const artists =
    event._embedded?.attractions?.map((a) => a.name) || [event.name.split(" - ")[0]];

  // Extract genres from classifications
  const genres: string[] = [];
  const classifications = event.classifications || event._embedded?.attractions?.[0]?.classifications;
  if (classifications) {
    classifications.forEach((c) => {
      if (c.genre?.name && c.genre.name !== "Undefined") genres.push(c.genre.name);
      if (c.subGenre?.name && c.subGenre.name !== "Undefined") genres.push(c.subGenre.name);
    });
  }

  // Extract price range
  const priceRange = event.priceRanges?.[0]
    ? {
        min: event.priceRanges[0].min,
        max: event.priceRanges[0].max,
        currency: event.priceRanges[0].currency,
      }
    : undefined;

  return {
    id: event.id,
    name: event.name,
    artists: Array.from(new Set(artists)), // Deduplicate
    venue: venueInfo,
    date: event.dates.start.localDate,
    time: event.dates.start.localTime,
    imageUrl: image?.url || "/placeholder-concert.jpg",
    ticketUrl: event.url,
    priceRange,
    genres: Array.from(new Set(genres)), // Deduplicate
    venueSize,
  };
}

/**
 * Estimate venue size based on venue name patterns
 * This is a heuristic - not all venues will be correctly categorized
 */
function estimateVenueSize(venueName: string): Concert["venueSize"] {
  const name = venueName.toLowerCase();
  
  // Festival/outdoor patterns
  if (
    name.includes("festival") ||
    name.includes("fairground") ||
    name.includes("polo field") ||
    name.includes("speedway") ||
    name.includes("raceway")
  ) {
    return "festival";
  }
  
  // Arena patterns (15k-25k capacity)
  if (
    name.includes("arena") ||
    name.includes("center") ||
    name.includes("centre") ||
    name.includes("coliseum") ||
    name.includes("stadium") ||
    name.includes("garden") ||
    name.includes("forum")
  ) {
    return "arena";
  }
  
  // Large venue patterns (5k-15k)
  if (
    name.includes("amphitheater") ||
    name.includes("amphitheatre") ||
    name.includes("pavilion") ||
    name.includes("theater") ||
    name.includes("theatre") ||
    name.includes("hall")
  ) {
    return "large";
  }
  
  // Intimate venue patterns (<1k)
  if (
    name.includes("lounge") ||
    name.includes("club") ||
    name.includes("bar") ||
    name.includes("cafe") ||
    name.includes("coffee") ||
    name.includes("basement") ||
    name.includes("room") ||
    name.includes("tavern") ||
    name.includes("pub")
  ) {
    return "intimate";
  }
  
  // Default to medium
  return "medium";
}

/**
 * Search concerts and filter by artist names
 * More efficient than searching for each artist individually
 */
export async function searchConcertsForArtists(
  params: Omit<SearchParams, "keyword">,
  artistNames: string[]
): Promise<Concert[]> {
  // First, get all concerts in the area and date range
  const allConcerts = await searchConcerts({
    ...params,
    size: 200, // Get more results for filtering
  });

  // Filter concerts that match any of our artists
  const normalizedArtists = artistNames.map((name) =>
    name.toLowerCase().replace(/[^a-z0-9\s]/g, "")
  );

  return allConcerts.concerts.filter((concert) => {
    const concertArtistsNormalized = concert.artists.map((name) =>
      name.toLowerCase().replace(/[^a-z0-9\s]/g, "")
    );

    return concertArtistsNormalized.some(
      (concertArtist) =>
        normalizedArtists.some(
          (userArtist) =>
            concertArtist.includes(userArtist) || userArtist.includes(concertArtist)
        )
    );
  });
}

/**
 * Get event details by ID
 */
export async function getEventById(eventId: string): Promise<Concert | null> {
  const apiKey = process.env.TICKETMASTER_API_KEY;

  if (!apiKey) {
    throw new Error("TICKETMASTER_API_KEY is not configured");
  }

  const url = `${TICKETMASTER_API_BASE}/events/${eventId}.json?apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Ticketmaster API error: ${response.status}`);
    }

    const event: TicketmasterEvent = await response.json();
    return transformEvent(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    return null;
  }
}
