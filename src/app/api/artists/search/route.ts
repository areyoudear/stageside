import { NextRequest, NextResponse } from "next/server";

const TICKETMASTER_API_BASE = "https://app.ticketmaster.com/discovery/v2";

interface TicketmasterAttraction {
  id: string;
  name: string;
  images?: { url: string; width: number; height: number }[];
  classifications?: {
    genre?: { name: string };
    subGenre?: { name: string };
  }[];
  externalLinks?: {
    spotify?: { url: string }[];
  };
}

export interface ArtistSearchResult {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

/**
 * GET /api/artists/search?q=taylor
 * Search for artists using Ticketmaster's Attractions API
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ artists: [] });
  }

  const apiKey = process.env.TICKETMASTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Ticketmaster API not configured" },
      { status: 500 }
    );
  }

  try {
    const url = new URL(`${TICKETMASTER_API_BASE}/attractions.json`);
    url.searchParams.set("apikey", apiKey);
    url.searchParams.set("keyword", query);
    url.searchParams.set("classificationName", "Music");
    url.searchParams.set("size", "10");
    url.searchParams.set("sort", "relevance,desc");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error("Ticketmaster API error:", await response.text());
      return NextResponse.json({ artists: [] });
    }

    const data = await response.json();

    if (!data._embedded?.attractions) {
      return NextResponse.json({ artists: [] });
    }

    const artists: ArtistSearchResult[] = data._embedded.attractions.map(
      (attraction: TicketmasterAttraction) => {
        // Get best image
        const image = attraction.images?.find((img) => img.width > 200);
        
        // Extract genres
        const genres: string[] = [];
        attraction.classifications?.forEach((c) => {
          if (c.genre?.name && c.genre.name !== "Undefined") {
            genres.push(c.genre.name);
          }
          if (c.subGenre?.name && c.subGenre.name !== "Undefined") {
            genres.push(c.subGenre.name);
          }
        });

        return {
          id: attraction.id,
          name: attraction.name,
          imageUrl: image?.url || null,
          genres: Array.from(new Set(genres)), // Dedupe
        };
      }
    );

    return NextResponse.json({ artists });
  } catch (error) {
    console.error("Error searching artists:", error);
    return NextResponse.json({ artists: [] });
  }
}
