/**
 * Enrich festival artists with images from Bandsintown (free, no API key)
 * Run with: npx tsx scripts/enrich-festival-artists.ts [festival-slug]
 * 
 * Falls back to MusicBrainz if Bandsintown doesn't have the artist
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

const BANDSINTOWN_API = 'https://rest.bandsintown.com';
const APP_ID = 'stageside'; // Free tier just needs app name

interface BandsintownArtist {
  id: string;
  name: string;
  url: string;
  image_url: string;
  thumb_url: string;
  tracker_count: number;
  upcoming_event_count: number;
}

async function getArtistFromBandsintown(name: string): Promise<BandsintownArtist | null> {
  const encodedName = encodeURIComponent(name);
  const url = `${BANDSINTOWN_API}/artists/${encodedName}?app_id=${APP_ID}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.error || !data.id) return null;
    
    return data;
  } catch (error) {
    return null;
  }
}

// Fallback: Try to get image from TheAudioDB (free)
async function getArtistFromAudioDB(name: string): Promise<string | null> {
  const encodedName = encodeURIComponent(name);
  const url = `https://www.theaudiodb.com/api/v1/json/2/search.php?s=${encodedName}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    const artist = data.artists?.[0];
    
    // Return the best available image
    return artist?.strArtistThumb || artist?.strArtistFanart || null;
  } catch (error) {
    return null;
  }
}

// Try Wikipedia/Wikimedia Commons as last resort
async function getArtistFromWikipedia(name: string): Promise<string | null> {
  const encodedName = encodeURIComponent(name);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodedName}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.thumbnail?.source || null;
  } catch (error) {
    return null;
  }
}

async function enrichArtists(festivalSlug?: string) {
  console.log('🎵 Enriching festival artists with images...\n');

  // Get artists that need enrichment
  let query = supabase
    .from('festival_artists')
    .select('id, artist_name, festival_id')
    .is('image_url', null);

  if (festivalSlug) {
    // Get festival ID first
    const { data: festival } = await supabase
      .from('festivals')
      .select('id, name')
      .eq('slug', festivalSlug)
      .single();

    if (!festival) {
      console.error(`Festival ${festivalSlug} not found`);
      return;
    }

    console.log(`Enriching artists for: ${festival.name}\n`);
    query = query.eq('festival_id', festival.id);
  }

  const { data: artists, error } = await query;

  if (error) {
    console.error('Error fetching artists:', error);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('✅ All artists already have images!');
    return;
  }

  console.log(`Found ${artists.length} artists needing images\n`);

  let enriched = 0;
  let failed = 0;

  for (const artist of artists) {
    process.stdout.write(`  ${artist.artist_name}... `);

    try {
      let imageUrl: string | null = null;
      let source = '';

      // Try Bandsintown first (best quality, most current)
      const bandsintownArtist = await getArtistFromBandsintown(artist.artist_name);
      if (bandsintownArtist?.image_url && !bandsintownArtist.image_url.includes('no_photo')) {
        imageUrl = bandsintownArtist.image_url;
        source = 'Bandsintown';
      }

      // Fallback to TheAudioDB
      if (!imageUrl) {
        imageUrl = await getArtistFromAudioDB(artist.artist_name);
        if (imageUrl) source = 'AudioDB';
      }

      // Last resort: Wikipedia
      if (!imageUrl) {
        imageUrl = await getArtistFromWikipedia(artist.artist_name);
        if (imageUrl) source = 'Wikipedia';
      }

      if (!imageUrl) {
        console.log('❌ no image found');
        failed++;
        continue;
      }

      // Update database
      const { error: updateError } = await supabase
        .from('festival_artists')
        .update({ image_url: imageUrl })
        .eq('id', artist.id);

      if (updateError) {
        console.log(`❌ DB error: ${updateError.message}`);
        failed++;
      } else {
        console.log(`✅ ${source}`);
        enriched++;
      }

      // Rate limit: 200ms between requests to be nice to free APIs
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.log(`❌ error: ${err}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${enriched} enriched, ${failed} failed out of ${artists.length}`);
}

async function main() {
  console.log('=== Festival Artist Image Enrichment ===');
  console.log('Using: Bandsintown → TheAudioDB → Wikipedia\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    return;
  }

  // Enrich specific festival or all
  const targetFestival = process.argv[2] || 'coachella';
  await enrichArtists(targetFestival);

  console.log('\n=== Complete ===');
}

main().catch(console.error);
