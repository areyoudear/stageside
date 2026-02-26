import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUnifiedMusicProfile, getAggregatedArtists } from "@/lib/supabase";

/**
 * GET /api/user/music-profile
 * Get current user's music profile (artists, genres) from their connected services
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getUnifiedMusicProfile(session.user.id);
    
    if (!profile || profile.topArtists.length === 0) {
      return NextResponse.json({ 
        hasProfile: false,
        artists: [],
        genres: [],
        connectedServices: [],
      });
    }

    // Get full artist data for the discover page
    const artists = await getAggregatedArtists(session.user.id);
    
    // Transform to match the Artist interface used in discover page
    const formattedArtists = artists.slice(0, 20).map((a, index) => ({
      id: a.spotify_id || `user-artist-${index}`,
      name: a.artist_name,
      genres: a.genres || [],
      popularity: a.aggregated_score || 50,
      imageUrl: a.image_url || null,
    }));

    return NextResponse.json({
      hasProfile: true,
      artists: formattedArtists,
      genres: profile.topGenres,
      connectedServices: profile.connectedServices,
    });
  } catch (error) {
    console.error("Error fetching music profile:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
