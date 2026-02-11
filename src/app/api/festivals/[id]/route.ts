import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getFestival,
  getFestivalLineup,
  getFestivalWithMatch,
  calculateFestivalMatch,
  buildScheduleGrid,
  getUserAgenda,
} from '@/lib/festivals';
import { getAggregatedArtists, getUnifiedMusicProfile } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Get base festival data
    const festival = await getFestival(id);
    if (!festival) {
      return NextResponse.json(
        { error: 'Festival not found' },
        { status: 404 }
      );
    }
    
    // Get lineup
    const lineup = await getFestivalLineup(festival.id);
    
    // If authenticated, personalize the response
    if (session?.user?.id) {
      const profile = await getUnifiedMusicProfile(session.user.id);
      
      if (profile && profile.topArtists.length > 0) {
        const userArtists = await getAggregatedArtists(session.user.id);
        const matchData = calculateFestivalMatch(lineup, userArtists, profile.topGenres);
        
        // Get user's agenda
        const userAgenda = await getUserAgenda(session.user.id, festival.id);
        
        // Build schedule grid
        const schedule = buildScheduleGrid(matchData.allMatches, festival.dates);
        
        return NextResponse.json({
          festival: {
            ...festival,
            matchPercentage: matchData.matchPercentage,
            matchedArtistCount: matchData.matchedArtistCount,
            totalArtistCount: lineup.length,
            perfectMatches: matchData.perfectMatches,
            discoveryMatches: matchData.discoveryMatches,
          },
          lineup: matchData.allMatches,
          schedule,
          userAgenda: userAgenda?.artist_ids || [],
          personalized: true,
        });
      }
    }
    
    // Non-personalized response
    const genericLineup = lineup.map(a => ({
      ...a,
      matchType: 'none' as const,
      matchScore: 0,
    }));
    
    const schedule = buildScheduleGrid(genericLineup, festival.dates);
    
    return NextResponse.json({
      festival: {
        ...festival,
        matchPercentage: 0,
        matchedArtistCount: 0,
        totalArtistCount: lineup.length,
        perfectMatches: [],
        discoveryMatches: [],
      },
      lineup: genericLineup,
      schedule,
      userAgenda: [],
      personalized: false,
    });
    
  } catch (error) {
    console.error('Error in festival detail API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch festival' },
      { status: 500 }
    );
  }
}
