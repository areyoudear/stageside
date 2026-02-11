/**
 * Bandsintown API Integration
 * https://www.bandsintown.com/
 * 
 * Bandsintown is artist-centric - you search by artist name to find their events.
 * Good for indie coverage and catching events Ticketmaster misses.
 * 
 * Requires: BANDSINTOWN_APP_ID (can be your app name for basic access)
 */

const BANDSINTOWN_API_BASE = "https://rest.bandsintown.com";

export interface BandsintownEvent {
  id: string;
  artist_id: string;
  url: string;
  on_sale_datetime: string;
  datetime: string;
  description: string;
  venue: BandsintownVenue;
  offers: BandsintownOffer[];
  lineup: string[];
  title: string;
}

export interface BandsintownVenue {
  name: string;
  latitude: string;
  longitude: string;
  city: string;
  region: string;
  country: string;
}

export interface BandsintownOffer {
  type: string;
  url: string;
  status: string;
}

export interface BandsintownArtist {
  id: string;
  name: string;
  url: string;
  image_url: string;
  thumb_url: string;
  facebook_page_url: string;
  mbid: string;
  tracker_count: number;
  upcoming_event_count: number;
}

/**
 * Get artist info from Bandsintown
 */
export async function getArtist(artistName: string): Promise<BandsintownArtist | null> {
  const appId = process.env.BANDSINTOWN_APP_ID || "stageside";
  
  const encodedName = encodeURIComponent(artistName);
  const url = `${BANDSINTOWN_API_BASE}/artists/${encodedName}?app_id=${appId}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Bandsintown API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Bandsintown returns { error: "..." } for not found
    if (data.error) return null;
    
    return data;
  } catch (error) {
    console.error(`Error fetching artist ${artistName}:`, error);
    return null;
  }
}

/**
 * Get events for an artist from Bandsintown
 */
export async function getArtistEvents(
  artistName: string,
  options?: {
    dateFrom?: string; // YYYY-MM-DD
    dateTo?: string;
  }
): Promise<BandsintownEvent[]> {
  const appId = process.env.BANDSINTOWN_APP_ID || "stageside";
  
  const encodedName = encodeURIComponent(artistName);
  
  // Build date parameter
  let dateParam = "upcoming";
  if (options?.dateFrom && options?.dateTo) {
    dateParam = `${options.dateFrom},${options.dateTo}`;
  } else if (options?.dateFrom) {
    dateParam = `${options.dateFrom},all`;
  }
  
  const url = `${BANDSINTOWN_API_BASE}/artists/${encodedName}/events?app_id=${appId}&date=${dateParam}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Bandsintown API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Handle error response
    if (data.error || !Array.isArray(data)) return [];
    
    return data;
  } catch (error) {
    console.error(`Error fetching events for ${artistName}:`, error);
    return [];
  }
}

/**
 * Transform Bandsintown event to unified Concert format
 */
export function transformBandsintownEvent(
  event: BandsintownEvent,
  artistName: string,
  artistImage?: string
): import("./ticketmaster").Concert {
  const ticketOffer = event.offers.find(o => o.status === "available") || event.offers[0];
  
  return {
    id: `bandsintown-${event.id}`,
    name: event.title || `${artistName} at ${event.venue.name}`,
    artists: event.lineup.length > 0 ? event.lineup : [artistName],
    venue: {
      name: event.venue.name,
      city: event.venue.city,
      state: event.venue.region,
      country: event.venue.country,
    },
    date: event.datetime.split("T")[0],
    time: event.datetime.includes("T") ? event.datetime.split("T")[1]?.substring(0, 5) : undefined,
    imageUrl: artistImage || "/placeholder-concert.jpg",
    ticketUrl: ticketOffer?.url || event.url,
    genres: [], // Bandsintown doesn't provide genre info
  };
}

/**
 * Search events for multiple artists and filter by location
 * This is the main function to use for concert discovery
 */
export async function searchBandsintownForArtists(
  artistNames: string[],
  options: {
    lat?: number;
    lng?: number;
    radiusMiles?: number;
    dateFrom?: string;
    dateTo?: string;
    maxArtists?: number; // Limit API calls
  }
): Promise<{
  concerts: import("./ticketmaster").Concert[];
  artistsSearched: number;
}> {
  const concerts: import("./ticketmaster").Concert[] = [];
  const limit = options.maxArtists || 50; // Default limit to avoid rate limits
  const artistsToSearch = artistNames.slice(0, limit);
  
  // Get events for each artist in parallel (with concurrency limit)
  const batchSize = 10;
  for (let i = 0; i < artistsToSearch.length; i += batchSize) {
    const batch = artistsToSearch.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (artistName) => {
        const [artist, events] = await Promise.all([
          getArtist(artistName),
          getArtistEvents(artistName, {
            dateFrom: options.dateFrom,
            dateTo: options.dateTo,
          }),
        ]);
        
        return events.map(event => 
          transformBandsintownEvent(event, artistName, artist?.image_url)
        );
      })
    );
    
    concerts.push(...batchResults.flat());
  }
  
  // Filter by location if provided
  let filteredConcerts = concerts;
  if (options.lat && options.lng && options.radiusMiles) {
    filteredConcerts = concerts.filter(concert => {
      // We don't have exact coordinates from Bandsintown venue
      // For now, we'll include all and rely on city matching
      // This could be improved with geocoding
      return true;
    });
  }
  
  return {
    concerts: filteredConcerts,
    artistsSearched: artistsToSearch.length,
  };
}

/**
 * Get recommended events from Bandsintown based on artist list
 * Useful for getting a quick list of "concerts you might like"
 */
export async function getRecommendedEvents(
  artistNames: string[],
  options?: {
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  }
): Promise<import("./ticketmaster").Concert[]> {
  const result = await searchBandsintownForArtists(artistNames, {
    dateFrom: options?.dateFrom,
    dateTo: options?.dateTo,
    maxArtists: options?.limit || 20,
  });
  
  return result.concerts;
}
