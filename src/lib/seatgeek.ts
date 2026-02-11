/**
 * SeatGeek API Integration
 * https://platform.seatgeek.com/
 * 
 * Requires: SEATGEEK_CLIENT_ID (get from developer.seatgeek.com)
 * Optional: SEATGEEK_CLIENT_SECRET for higher rate limits
 */

const SEATGEEK_API_BASE = "https://api.seatgeek.com/2";

export interface SeatGeekEvent {
  id: number;
  title: string;
  type: string;
  url: string;
  datetime_local: string;
  datetime_utc: string;
  announce_date: string;
  visible_until_utc: string;
  performers: SeatGeekPerformer[];
  venue: SeatGeekVenue;
  stats: {
    listing_count: number;
    average_price: number;
    lowest_price: number;
    highest_price: number;
  };
  taxonomies: { name: string; id: number }[];
  score: number;
}

export interface SeatGeekPerformer {
  id: number;
  name: string;
  slug: string;
  image: string;
  images: {
    huge?: string;
    banner?: string;
  };
  genres?: { name: string; slug: string }[];
  taxonomies?: { name: string }[];
  score: number;
  popularity: number;
}

export interface SeatGeekVenue {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  location: {
    lat: number;
    lon: number;
  };
  capacity: number;
  score: number;
}

interface SeatGeekResponse {
  events: SeatGeekEvent[];
  meta: {
    total: number;
    took: number;
    page: number;
    per_page: number;
  };
}

export interface SeatGeekSearchParams {
  lat?: number;
  lon?: number;
  range?: string; // e.g., "50mi"
  city?: string;
  state?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  performer?: string; // Search by performer name
  page?: number;
  perPage?: number;
}

/**
 * Search for concerts on SeatGeek
 */
export async function searchSeatGeekConcerts(params: SeatGeekSearchParams): Promise<{
  events: SeatGeekEvent[];
  total: number;
  page: number;
}> {
  const clientId = process.env.SEATGEEK_CLIENT_ID;
  const clientSecret = process.env.SEATGEEK_CLIENT_SECRET;

  if (!clientId) {
    console.warn("SEATGEEK_CLIENT_ID not configured, skipping SeatGeek");
    return { events: [], total: 0, page: 0 };
  }

  const queryParams = new URLSearchParams({
    client_id: clientId,
    type: "concert", // Only concerts
    per_page: String(params.perPage || 50),
    page: String(params.page || 1),
    sort: "datetime_local.asc",
  });

  if (clientSecret) {
    queryParams.set("client_secret", clientSecret);
  }

  // Location: prefer lat/lon, fallback to city/state
  if (params.lat && params.lon) {
    queryParams.set("lat", String(params.lat));
    queryParams.set("lon", String(params.lon));
    queryParams.set("range", params.range || "50mi");
  } else if (params.city) {
    queryParams.set("venue.city", params.city);
    if (params.state) {
      queryParams.set("venue.state", params.state);
    }
  }

  // Date range
  if (params.dateFrom) {
    queryParams.set("datetime_local.gte", `${params.dateFrom}T00:00:00`);
  }
  if (params.dateTo) {
    queryParams.set("datetime_local.lte", `${params.dateTo}T23:59:59`);
  }

  // Performer search
  if (params.performer) {
    queryParams.set("performers.slug", params.performer.toLowerCase().replace(/\s+/g, "-"));
  }

  const url = `${SEATGEEK_API_BASE}/events?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SeatGeek API error:", errorText);
      throw new Error(`SeatGeek API error: ${response.status}`);
    }

    const data: SeatGeekResponse = await response.json();

    return {
      events: data.events,
      total: data.meta.total,
      page: data.meta.page,
    };
  } catch (error) {
    console.error("Error fetching from SeatGeek:", error);
    return { events: [], total: 0, page: 0 };
  }
}

/**
 * Transform SeatGeek event to unified Concert format
 */
export function transformSeatGeekEvent(event: SeatGeekEvent): import("./ticketmaster").Concert {
  const mainPerformer = event.performers[0];
  
  // Extract genres from performers
  const genres: string[] = [];
  event.performers.forEach(p => {
    p.genres?.forEach(g => genres.push(g.name));
    p.taxonomies?.forEach(t => {
      if (t.name !== "concert" && t.name !== "music") {
        genres.push(t.name);
      }
    });
  });

  // Get best image
  const imageUrl = mainPerformer?.images?.huge || 
                   mainPerformer?.images?.banner || 
                   mainPerformer?.image || 
                   "/placeholder-concert.jpg";

  // Price range from stats
  const priceRange = event.stats.lowest_price > 0 ? {
    min: event.stats.lowest_price,
    max: event.stats.highest_price || event.stats.lowest_price,
    currency: "USD",
  } : undefined;

  return {
    id: `seatgeek-${event.id}`,
    name: event.title,
    artists: event.performers.map(p => p.name),
    venue: {
      name: event.venue.name,
      city: event.venue.city,
      state: event.venue.state,
      country: event.venue.country,
      address: event.venue.address,
    },
    date: event.datetime_local.split("T")[0],
    time: event.datetime_local.split("T")[1]?.substring(0, 5),
    imageUrl,
    ticketUrl: event.url,
    priceRange,
    genres: Array.from(new Set(genres)),
  };
}

/**
 * Search SeatGeek and return unified Concert format
 */
export async function searchSeatGeekAsUnified(params: SeatGeekSearchParams): Promise<{
  concerts: import("./ticketmaster").Concert[];
  total: number;
}> {
  const result = await searchSeatGeekConcerts(params);
  
  return {
    concerts: result.events.map(transformSeatGeekEvent),
    total: result.total,
  };
}
