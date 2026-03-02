import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUnifiedMusicProfile, getAggregatedArtists } from "@/lib/supabase";

/**
 * GET /api/user/music-profile
 * Get current user's music profile (artists, genres) from their connected services
 * Returns isAuthenticated: false for anonymous users (no 401, to support public browse)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    // Return anonymous response for unauthenticated users (no 401)
    if (!session?.user?.id) {
      return NextResponse.json({ 
        isAuthenticated: false,
        hasProfile: false,
        artists: [],
        genres: [],
        connectedServices: [],
      });
    }

    const profile = await getUnifiedMusicProfile(session.user.id);
    
    if (!profile || profile.topArtists.length === 0) {
      return NextResponse.json({ 
        isAuthenticated: true,
        hasProfile: false,
        artists: [],
        genres: [],
        connectedServices: [],
      });
    }

    // Try to get full artist data from user_artists table first
    const aggregatedArtists = await getAggregatedArtists(session.user.id);
    
    // If user_artists is populated, use that (has image URLs, source IDs, etc.)
    // Otherwise fall back to profile.topArtists (from legacy music_profiles or connections)
    let formattedArtists;
    
    if (aggregatedArtists.length > 0) {
      formattedArtists = aggregatedArtists.slice(0, 20).map((a, index) => ({
        id: a.source_ids?.spotify || `user-artist-${index}`,
        name: a.artist_name,
        genres: a.genres || [],
        popularity: a.aggregated_score || 50,
        imageUrl: a.image_url || null,
      }));
    } else {
      // Fall back to unified profile artists (from music_profiles table)
      formattedArtists = profile.topArtists.slice(0, 20).map((a, index) => ({
        id: `profile-artist-${index}`,
        name: a.name,
        genres: a.genres || [],
        popularity: a.score || 50,
        imageUrl: null,
      }));
    }

    return NextResponse.json({
      isAuthenticated: true,
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
