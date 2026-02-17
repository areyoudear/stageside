import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/ticketmaster";
import type { Concert } from "@/lib/ticketmaster";

/**
 * POST /api/concerts/by-ids
 * Fetch full concert details for a list of concert IDs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Concert IDs array is required" },
        { status: 400 }
      );
    }

    // Limit to 20 IDs per request to avoid overwhelming the API
    const limitedIds = ids.slice(0, 20);

    // Fetch all concerts in parallel
    const concertPromises = limitedIds.map((id: string) => getEventById(id));
    const results = await Promise.all(concertPromises);

    // Filter out nulls (concerts that weren't found)
    const concerts: Concert[] = results.filter((c): c is Concert => c !== null);

    return NextResponse.json({
      concerts,
      found: concerts.length,
      requested: limitedIds.length,
    });
  } catch (error) {
    console.error("Error in POST /api/concerts/by-ids:", error);
    return NextResponse.json(
      { error: "Failed to fetch concerts" },
      { status: 500 }
    );
  }
}
