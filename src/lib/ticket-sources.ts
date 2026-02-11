/**
 * Multi-Source Ticket Integration
 * Aggregates ticket links and prices from multiple providers
 */

export interface TicketSource {
  name: string;
  url: string;
  price?: {
    min: number;
    max: number;
    currency: string;
  };
  logo: string;
  available: boolean;
}

export interface TicketComparison {
  sources: TicketSource[];
  cheapestSource?: string;
  eventName: string;
}

// Generate SeatGeek search URL
export function getSeatGeekUrl(artistName: string, venueName: string, date: string): string {
  const query = encodeURIComponent(`${artistName} ${venueName}`);
  const formattedDate = date.replace(/-/g, '');
  return `https://seatgeek.com/search?q=${query}&date=${formattedDate}`;
}

// Generate StubHub search URL
export function getStubHubUrl(artistName: string, venueName: string, date: string): string {
  const query = encodeURIComponent(`${artistName}`);
  return `https://www.stubhub.com/search?q=${query}`;
}

// Generate Vivid Seats search URL
export function getVividSeatsUrl(artistName: string, venueName: string, date: string): string {
  const query = encodeURIComponent(`${artistName}`);
  return `https://www.vividseats.com/search?searchTerm=${query}`;
}

// Generate Gametime search URL
export function getGametimeUrl(artistName: string): string {
  const query = encodeURIComponent(artistName);
  return `https://gametime.co/search?q=${query}`;
}

/**
 * Get all ticket source links for an event
 * Note: For actual price comparison, you'd need API access to each service
 */
export function getTicketSources(
  artistName: string,
  venueName: string,
  date: string,
  ticketmasterUrl?: string,
  ticketmasterPrice?: { min: number; max: number; currency: string }
): TicketSource[] {
  const sources: TicketSource[] = [];

  // Ticketmaster (primary source)
  if (ticketmasterUrl) {
    sources.push({
      name: "Ticketmaster",
      url: ticketmasterUrl,
      price: ticketmasterPrice,
      logo: "/logos/ticketmaster.svg",
      available: true,
    });
  }

  // SeatGeek
  sources.push({
    name: "SeatGeek",
    url: getSeatGeekUrl(artistName, venueName, date),
    logo: "/logos/seatgeek.svg",
    available: true,
  });

  // StubHub
  sources.push({
    name: "StubHub",
    url: getStubHubUrl(artistName, venueName, date),
    logo: "/logos/stubhub.svg",
    available: true,
  });

  // Vivid Seats
  sources.push({
    name: "Vivid Seats",
    url: getVividSeatsUrl(artistName, venueName, date),
    logo: "/logos/vividseats.svg",
    available: true,
  });

  // Gametime
  sources.push({
    name: "Gametime",
    url: getGametimeUrl(artistName),
    logo: "/logos/gametime.svg",
    available: true,
  });

  return sources;
}

/**
 * Format ticket source for display
 */
export function formatTicketSources(
  concert: {
    artists: string[];
    venue: { name: string };
    date: string;
    ticketUrl?: string;
    priceRange?: { min: number; max: number; currency: string };
  }
): TicketComparison {
  const primaryArtist = concert.artists[0] || "Concert";
  
  const sources = getTicketSources(
    primaryArtist,
    concert.venue.name,
    concert.date,
    concert.ticketUrl,
    concert.priceRange
  );

  // Find cheapest (only Ticketmaster has price info currently)
  const sourcesWithPrices = sources.filter(s => s.price);
  const cheapestSource = sourcesWithPrices.length > 0
    ? sourcesWithPrices.reduce((min, s) => 
        !min.price || (s.price && s.price.min < min.price.min) ? s : min
      ).name
    : undefined;

  return {
    sources,
    cheapestSource,
    eventName: primaryArtist,
  };
}

/**
 * Ticket source logos (inline SVG data URIs for simplicity)
 */
export const TICKET_SOURCE_COLORS: Record<string, string> = {
  "Ticketmaster": "#026CDF",
  "SeatGeek": "#FF5722", 
  "StubHub": "#3A1D8A",
  "Vivid Seats": "#1F1F1F",
  "Gametime": "#00C853",
};
