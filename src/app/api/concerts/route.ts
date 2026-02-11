import { NextRequest, NextResponse } from "next/server";
import { searchConcerts } from "@/lib/ticketmaster";

/**
 * GET /api/concerts
 * Search for concerts by location and date range
 *
 * Query params:
 * - city: City name (optional if latLong provided)
 * - lat: Latitude (optional)
 * - lng: Longitude (optional)
 * - radius: Search radius in miles (default: 50)
 * - startDate: Start date YYYY-MM-DD (default: today)
 * - endDate: End date YYYY-MM-DD (default: +3 months)
 * - page: Page number (default: 0)
 * - size: Results per page (default: 50)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Parse parameters
    const city = searchParams.get("city") || undefined;
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radius = parseInt(searchParams.get("radius") || "50");
    const page = parseInt(searchParams.get("page") || "0");
    const size = parseInt(searchParams.get("size") || "50");

    // Parse dates
    const today = new Date();
    const defaultEndDate = new Date();
    defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);

    const startDateStr = searchParams.get("startDate") || today.toISOString().split("T")[0];
    const endDateStr =
      searchParams.get("endDate") || defaultEndDate.toISOString().split("T")[0];

    // Format dates for Ticketmaster API (requires full ISO format)
    const startDate = `${startDateStr}T00:00:00Z`;
    const endDate = `${endDateStr}T23:59:59Z`;

    // Build location string
    let latLong: string | undefined;
    if (lat && lng) {
      latLong = `${lat},${lng}`;
    }

    // Validate that we have either city or coordinates
    if (!city && !latLong) {
      return NextResponse.json(
        { error: "Please provide either city or lat/lng coordinates" },
        { status: 400 }
      );
    }

    // Fetch concerts from Ticketmaster
    const result = await searchConcerts({
      city,
      latLong,
      radius,
      startDate,
      endDate,
      page,
      size,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in /api/concerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch concerts" },
      { status: 500 }
    );
  }
}
