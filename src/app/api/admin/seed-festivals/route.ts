import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

// Better festival images (high-quality shots)
const festivalImages: Record<string, string> = {
  'coachella': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80',
  'edc-vegas': 'https://images.unsplash.com/photo-1571266028243-3716f02d2d73?w=1200&q=80',
  'bonnaroo': 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80',
  'lollapalooza': 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80',
  'outside-lands': 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80',
  'acl': 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&q=80',
};

// Real Coachella 2026 lineup (April 10-12 & 17-19, 2026)
const coachellaLineup = [
  // HEADLINERS
  { artist_name: 'Sabrina Carpenter', headliner: true, genres: ['Pop'] },
  { artist_name: 'Justin Bieber', headliner: true, genres: ['Pop', 'R&B'] },
  { artist_name: 'Karol G', headliner: true, genres: ['Reggaeton', 'Latin Pop'] },
  { artist_name: 'Anyma', headliner: true, genres: ['Electronic', 'Techno'] },
  
  // Major Acts
  { artist_name: 'Addison Rae', headliner: false, genres: ['Pop'] },
  { artist_name: 'Alex G', headliner: false, genres: ['Indie Rock'] },
  { artist_name: 'Armin van Buuren x Adam Beyer', headliner: false, genres: ['Trance', 'Techno'] },
  { artist_name: 'BIA', headliner: false, genres: ['Hip-Hop', 'Rap'] },
  { artist_name: 'BIGBANG', headliner: false, genres: ['K-Pop'] },
  { artist_name: 'BINI', headliner: false, genres: ['P-Pop'] },
  { artist_name: 'Black Flag', headliner: false, genres: ['Punk', 'Hardcore'] },
  { artist_name: 'Blood Orange', headliner: false, genres: ['R&B', 'Electronic'] },
  { artist_name: 'Blondshell', headliner: false, genres: ['Indie Rock'] },
  { artist_name: 'Boys Noize', headliner: false, genres: ['Electronic', 'Techno'] },
  { artist_name: 'Central Cee', headliner: false, genres: ['UK Rap', 'Hip-Hop'] },
  { artist_name: 'CLIPSE', headliner: false, genres: ['Hip-Hop', 'Rap'] },
  { artist_name: 'CMAT', headliner: false, genres: ['Country', 'Pop'] },
  { artist_name: 'Creepy Nuts', headliner: false, genres: ['J-Hip-Hop'] },
  { artist_name: 'David Byrne', headliner: false, genres: ['Art Rock', 'New Wave'] },
  { artist_name: 'David Guetta', headliner: false, genres: ['EDM', 'House'] },
  { artist_name: 'Davido', headliner: false, genres: ['Afrobeats'] },
  { artist_name: 'Devo', headliner: false, genres: ['New Wave', 'Synth-Pop'] },
  { artist_name: 'Dijon', headliner: false, genres: ['R&B', 'Indie'] },
  { artist_name: 'Disclosure', headliner: false, genres: ['Electronic', 'House'] },
  { artist_name: 'DJ Snake', headliner: false, genres: ['EDM', 'House'] },
  { artist_name: 'DRAIN', headliner: false, genres: ['Hardcore', 'Punk'] },
  { artist_name: 'Duke Dumont', headliner: false, genres: ['House', 'Electronic'] },
  { artist_name: 'Ethel Cain', headliner: false, genres: ['Indie', 'Gothic', 'Folk'] },
  { artist_name: 'Fatboy Slim', headliner: false, genres: ['Electronic', 'Big Beat'] },
  { artist_name: 'FKA twigs', headliner: false, genres: ['Art Pop', 'Electronic', 'R&B'] },
  { artist_name: 'Foster the People', headliner: false, genres: ['Indie Pop', 'Alternative'] },
  { artist_name: 'Fujii Kaze', headliner: false, genres: ['J-Pop', 'R&B'] },
  { artist_name: 'Geese', headliner: false, genres: ['Indie Rock'] },
  { artist_name: 'Gigi Perez', headliner: false, genres: ['Pop', 'Indie'] },
  { artist_name: 'GIVĒON', headliner: false, genres: ['R&B'] },
  { artist_name: 'Gordo', headliner: false, genres: ['House', 'Electronic'] },
  { artist_name: 'Green Velvet', headliner: false, genres: ['House', 'Techno'] },
  { artist_name: 'Groove Armada', headliner: false, genres: ['Electronic', 'House'] },
  { artist_name: 'Holly Humberstone', headliner: false, genres: ['Indie Pop'] },
  { artist_name: 'Hot Mulligan', headliner: false, genres: ['Emo', 'Pop Punk'] },
  { artist_name: 'Iggy Pop', headliner: false, genres: ['Punk', 'Rock'] },
  { artist_name: 'Interpol', headliner: false, genres: ['Post-Punk', 'Indie Rock'] },
  { artist_name: 'Jane Remover', headliner: false, genres: ['Hyperpop', 'Electronic'] },
  { artist_name: 'Turnstile', headliner: false, genres: ['Hardcore', 'Punk'] },
  { artist_name: 'Nine Inch Nails', headliner: false, genres: ['Industrial', 'Rock'] },
  { artist_name: 'The XX', headliner: false, genres: ['Indie Pop', 'Electronic'] },
];

function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: Request) {
  // Check for admin secret (simple protection)
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  
  if (secret !== 'stageside-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const adminClient = createAdminClient();
  const results: string[] = [];
  
  // First, ensure the festival_artists table exists
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS festival_artists (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
      artist_name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      day TEXT,
      stage TEXT,
      start_time TEXT,
      end_time TEXT,
      set_length_minutes INTEGER,
      headliner BOOLEAN DEFAULT false,
      spotify_id TEXT,
      image_url TEXT,
      genres TEXT[] DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_festival_artists_festival ON festival_artists(festival_id);
    CREATE INDEX IF NOT EXISTS idx_festival_artists_normalized ON festival_artists(normalized_name);
  `;
  
  const { error: tableError } = await adminClient.rpc('exec_sql', { sql: createTableSQL }).single();
  if (tableError) {
    // Table might already exist or RPC doesn't exist - continue anyway
    results.push(`Note: Table creation via RPC: ${tableError.message}`);
  } else {
    results.push('✓ Ensured festival_artists table exists');
  }
  
  try {
    // Update festival images
    for (const [slug, imageUrl] of Object.entries(festivalImages)) {
      const { error } = await adminClient
        .from('festivals')
        .update({ image_url: imageUrl })
        .eq('slug', slug);
      
      if (error) {
        results.push(`❌ Error updating ${slug}: ${error.message}`);
      } else {
        results.push(`✓ Updated image for ${slug}`);
      }
    }
    
    // Get Coachella festival ID
    const { data: festival, error: festivalError } = await adminClient
      .from('festivals')
      .select('id')
      .eq('slug', 'coachella')
      .single();
    
    if (festivalError || !festival) {
      results.push(`❌ Could not find Coachella festival`);
      return NextResponse.json({ results });
    }
    
    // Clear existing lineup
    await adminClient
      .from('festival_artists')
      .delete()
      .eq('festival_id', festival.id);
    
    // Insert new lineup
    const artists = coachellaLineup.map(artist => ({
      festival_id: festival.id,
      artist_name: artist.artist_name,
      normalized_name: normalizeArtistName(artist.artist_name),
      day: artist.day,
      stage: artist.stage,
      start_time: artist.start_time,
      end_time: artist.end_time,
      headliner: artist.headliner,
      genres: artist.genres,
    }));
    
    const { error: insertError } = await adminClient
      .from('festival_artists')
      .insert(artists);
    
    if (insertError) {
      results.push(`❌ Error inserting lineup: ${insertError.message}`);
    } else {
      results.push(`✓ Added ${artists.length} artists to Coachella lineup`);
    }
    
    return NextResponse.json({ success: true, results });
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to seed data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
