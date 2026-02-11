import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getUserAgenda,
  addToAgenda,
  removeFromAgenda,
  saveUserAgenda,
  getFestival,
  getFestivalLineup,
  calculateFestivalMatch,
  generateICS,
} from '@/lib/festivals';
import { getAggregatedArtists, getUnifiedMusicProfile } from '@/lib/supabase';

// GET - Fetch user's agenda for a festival
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const agenda = await getUserAgenda(session.user.id, id);
    
    // Get full artist details for agenda items
    if (agenda && agenda.artist_ids.length > 0) {
      const lineup = await getFestivalLineup(id);
      const profile = await getUnifiedMusicProfile(session.user.id);
      const userArtists = await getAggregatedArtists(session.user.id);
      
      const matchData = calculateFestivalMatch(
        lineup,
        userArtists,
        profile?.topGenres || []
      );
      
      const agendaArtists = matchData.allMatches.filter(a =>
        agenda.artist_ids.includes(a.id)
      );
      
      return NextResponse.json({
        agenda: agenda.artist_ids,
        artists: agendaArtists,
      });
    }
    
    return NextResponse.json({
      agenda: [],
      artists: [],
    });
    
  } catch (error) {
    console.error('Error fetching agenda:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agenda' },
      { status: 500 }
    );
  }
}

// POST - Add artist to agenda
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { artistId } = body;
    
    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID required' },
        { status: 400 }
      );
    }
    
    const success = await addToAgenda(session.user.id, id, artistId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to add to agenda' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error adding to agenda:', error);
    return NextResponse.json(
      { error: 'Failed to add to agenda' },
      { status: 500 }
    );
  }
}

// DELETE - Remove artist from agenda
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { artistId } = body;
    
    if (!artistId) {
      return NextResponse.json(
        { error: 'Artist ID required' },
        { status: 400 }
      );
    }
    
    const success = await removeFromAgenda(session.user.id, id, artistId);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Failed to remove from agenda' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error removing from agenda:', error);
    return NextResponse.json(
      { error: 'Failed to remove from agenda' },
      { status: 500 }
    );
  }
}

// PUT - Export agenda as ICS
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const festival = await getFestival(id);
    if (!festival) {
      return NextResponse.json(
        { error: 'Festival not found' },
        { status: 404 }
      );
    }
    
    const agenda = await getUserAgenda(session.user.id, id);
    if (!agenda || agenda.artist_ids.length === 0) {
      return NextResponse.json(
        { error: 'No artists in agenda' },
        { status: 400 }
      );
    }
    
    const lineup = await getFestivalLineup(id);
    const profile = await getUnifiedMusicProfile(session.user.id);
    const userArtists = await getAggregatedArtists(session.user.id);
    
    const matchData = calculateFestivalMatch(
      lineup,
      userArtists,
      profile?.topGenres || []
    );
    
    const agendaArtists = matchData.allMatches.filter(a =>
      agenda.artist_ids.includes(a.id)
    );
    
    const ics = generateICS(festival, agendaArtists);
    
    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar',
        'Content-Disposition': `attachment; filename="${festival.slug}-agenda.ics"`,
      },
    });
    
  } catch (error) {
    console.error('Error exporting agenda:', error);
    return NextResponse.json(
      { error: 'Failed to export agenda' },
      { status: 500 }
    );
  }
}
