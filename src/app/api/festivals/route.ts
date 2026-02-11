import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFestivals, getFestivalsWithMatches } from '@/lib/festivals';
import { getAggregatedArtists, getUnifiedMusicProfile } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    
    const genre = searchParams.get('genre') || undefined;
    const upcoming = searchParams.get('upcoming') !== 'false';
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // If user is authenticated, get personalized matches
    if (session?.user?.id) {
      const profile = await getUnifiedMusicProfile(session.user.id);
      
      if (profile && profile.topArtists.length > 0) {
        const userArtists = await getAggregatedArtists(session.user.id);
        const festivals = await getFestivalsWithMatches(
          userArtists,
          profile.topGenres,
          { upcoming, limit }
        );
        
        return NextResponse.json({
          festivals,
          personalized: true,
          connectedServices: profile.connectedServices,
        });
      }
    }
    
    // Fallback to non-personalized list
    const festivals = await getFestivals({ genre, upcoming, limit });
    
    return NextResponse.json({
      festivals: festivals.map(f => ({
        ...f,
        matchPercentage: 0,
        matchedArtistCount: 0,
        totalArtistCount: 0,
        perfectMatches: [],
        discoveryMatches: [],
      })),
      personalized: false,
    });
    
  } catch (error) {
    console.error('Error in festivals API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch festivals' },
      { status: 500 }
    );
  }
}
