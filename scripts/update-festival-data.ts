/**
 * Script to update festival images and add lineup data
 * Run with: npx tsx scripts/update-festival-data.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load env from .env.local
const envPath = join(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const envVars: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Better festival images (official or well-known shots)
const festivalImages: Record<string, string> = {
  'coachella': 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80', // Ferris wheel crowd shot
  'edc-vegas': 'https://images.unsplash.com/photo-1571266028243-3716f02d2d73?w=1200&q=80', // Neon festival lights
  'bonnaroo': 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&q=80', // Festival crowd daylight
  'lollapalooza': 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1200&q=80', // Chicago skyline festival
  'outside-lands': 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&q=80', // Foggy outdoor festival
  'acl': 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=1200&q=80', // Austin sunset festival
};

// Sample Coachella 2026 lineup (realistic based on typical Coachella bookings)
const coachellaLineup = [
  // Headliners
  { artist_name: 'Beyoncé', day: 'Friday', stage: 'Coachella Stage', start_time: '23:00', end_time: '01:00', headliner: true, genres: ['Pop', 'R&B', 'Hip-Hop'] },
  { artist_name: 'Kendrick Lamar', day: 'Saturday', stage: 'Coachella Stage', start_time: '23:15', end_time: '01:00', headliner: true, genres: ['Hip-Hop', 'Rap'] },
  { artist_name: 'Radiohead', day: 'Sunday', stage: 'Coachella Stage', start_time: '22:30', end_time: '00:30', headliner: true, genres: ['Alternative', 'Rock', 'Electronic'] },
  
  // Sub-headliners
  { artist_name: 'Doja Cat', day: 'Friday', stage: 'Coachella Stage', start_time: '21:00', end_time: '22:15', headliner: false, genres: ['Pop', 'Hip-Hop', 'R&B'] },
  { artist_name: 'Fred Again..', day: 'Saturday', stage: 'Outdoor Theatre', start_time: '21:30', end_time: '23:00', headliner: false, genres: ['Electronic', 'House'] },
  { artist_name: 'Dua Lipa', day: 'Sunday', stage: 'Coachella Stage', start_time: '20:30', end_time: '21:45', headliner: false, genres: ['Pop', 'Dance'] },
  
  // Friday acts
  { artist_name: 'Tyler, The Creator', day: 'Friday', stage: 'Outdoor Theatre', start_time: '20:30', end_time: '21:45', headliner: false, genres: ['Hip-Hop', 'Rap', 'Alternative'] },
  { artist_name: 'Charli XCX', day: 'Friday', stage: 'Mojave', start_time: '19:00', end_time: '20:00', headliner: false, genres: ['Pop', 'Electronic'] },
  { artist_name: 'Jungle', day: 'Friday', stage: 'Gobi', start_time: '18:30', end_time: '19:30', headliner: false, genres: ['Electronic', 'Funk', 'Soul'] },
  { artist_name: 'Peggy Gou', day: 'Friday', stage: 'Yuma', start_time: '22:00', end_time: '23:30', headliner: false, genres: ['Electronic', 'House', 'Techno'] },
  { artist_name: 'Raye', day: 'Friday', stage: 'Outdoor Theatre', start_time: '17:30', end_time: '18:30', headliner: false, genres: ['Pop', 'R&B'] },
  { artist_name: 'Ethel Cain', day: 'Friday', stage: 'Mojave', start_time: '16:00', end_time: '17:00', headliner: false, genres: ['Indie', 'Alternative', 'Gothic'] },
  
  // Saturday acts
  { artist_name: 'Skrillex', day: 'Saturday', stage: 'Sahara', start_time: '23:30', end_time: '01:00', headliner: false, genres: ['Electronic', 'Dubstep', 'House'] },
  { artist_name: 'Ice Spice', day: 'Saturday', stage: 'Coachella Stage', start_time: '19:00', end_time: '20:00', headliner: false, genres: ['Hip-Hop', 'Rap'] },
  { artist_name: 'Turnstile', day: 'Saturday', stage: 'Outdoor Theatre', start_time: '18:00', end_time: '19:00', headliner: false, genres: ['Hardcore', 'Punk', 'Rock'] },
  { artist_name: 'Floating Points', day: 'Saturday', stage: 'Yuma', start_time: '20:00', end_time: '21:30', headliner: false, genres: ['Electronic', 'Ambient'] },
  { artist_name: 'Royel Otis', day: 'Saturday', stage: 'Gobi', start_time: '16:30', end_time: '17:30', headliner: false, genres: ['Indie', 'Rock'] },
  { artist_name: 'Mannequin Pussy', day: 'Saturday', stage: 'Sonora', start_time: '15:00', end_time: '16:00', headliner: false, genres: ['Punk', 'Rock', 'Alternative'] },
  
  // Sunday acts
  { artist_name: 'Jamie xx', day: 'Sunday', stage: 'Outdoor Theatre', start_time: '22:00', end_time: '23:30', headliner: false, genres: ['Electronic', 'House'] },
  { artist_name: 'SZA', day: 'Sunday', stage: 'Coachella Stage', start_time: '18:30', end_time: '19:45', headliner: false, genres: ['R&B', 'Pop', 'Hip-Hop'] },
  { artist_name: 'LCD Soundsystem', day: 'Sunday', stage: 'Outdoor Theatre', start_time: '19:30', end_time: '21:00', headliner: false, genres: ['Electronic', 'Rock', 'Dance'] },
  { artist_name: 'Clairo', day: 'Sunday', stage: 'Mojave', start_time: '17:00', end_time: '18:00', headliner: false, genres: ['Indie', 'Pop'] },
  { artist_name: 'Four Tet', day: 'Sunday', stage: 'Yuma', start_time: '20:30', end_time: '22:00', headliner: false, genres: ['Electronic', 'Ambient', 'House'] },
  { artist_name: 'Beach House', day: 'Sunday', stage: 'Gobi', start_time: '19:00', end_time: '20:15', headliner: false, genres: ['Indie', 'Dream Pop'] },
];

function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateFestivalImages() {
  console.log('Updating festival images...');
  
  for (const [slug, imageUrl] of Object.entries(festivalImages)) {
    const { error } = await supabase
      .from('festivals')
      .update({ image_url: imageUrl })
      .eq('slug', slug);
    
    if (error) {
      console.error(`Error updating ${slug}:`, error);
    } else {
      console.log(`✓ Updated image for ${slug}`);
    }
  }
}

async function addCoachellaLineup() {
  console.log('\nAdding Coachella lineup...');
  
  // Get Coachella festival ID
  const { data: festival, error: festivalError } = await supabase
    .from('festivals')
    .select('id')
    .eq('slug', 'coachella')
    .single();
  
  if (festivalError || !festival) {
    console.error('Could not find Coachella festival:', festivalError);
    return;
  }
  
  console.log(`Found Coachella with ID: ${festival.id}`);
  
  // Clear existing lineup
  const { error: deleteError } = await supabase
    .from('festival_artists')
    .delete()
    .eq('festival_id', festival.id);
  
  if (deleteError) {
    console.error('Error clearing existing lineup:', deleteError);
    return;
  }
  
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
  
  const { error: insertError } = await supabase
    .from('festival_artists')
    .insert(artists);
  
  if (insertError) {
    console.error('Error inserting lineup:', insertError);
  } else {
    console.log(`✓ Added ${artists.length} artists to Coachella lineup`);
  }
}

async function main() {
  console.log('=== Festival Data Update ===\n');
  
  await updateFestivalImages();
  await addCoachellaLineup();
  
  console.log('\n=== Complete ===');
}

main().catch(console.error);
