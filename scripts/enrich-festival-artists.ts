/**
 * Enrich festival artists with Spotify data (images, preview URLs, spotify IDs)
 * Run with: npx tsx scripts/enrich-festival-artists.ts
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
const spotifyClientId = envVars['SPOTIFY_CLIENT_ID'];
const spotifyClientSecret = envVars['SPOTIFY_CLIENT_SECRET'];

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{ url: string; width: number; height: number }>;
  genres: string[];
  popularity: number;
  external_urls: { spotify: string };
}

interface SpotifyTrack {
  preview_url: string | null;
  name: string;
}

let accessToken: string | null = null;

async function getSpotifyToken(): Promise<string> {
  if (accessToken) return accessToken;

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  accessToken = data.access_token;
  return accessToken!;
}

async function searchArtist(name: string): Promise<SpotifyArtist | null> {
  const token = await getSpotifyToken();
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    console.error(`Error searching for ${name}:`, response.status);
    return null;
  }

  const data = await response.json();
  const artists = data.artists?.items || [];
  
  if (artists.length === 0) return null;

  // Find best match (exact or close match)
  const normalizedSearch = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const exactMatch = artists.find((a: SpotifyArtist) => 
    a.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedSearch
  );

  return exactMatch || artists[0];
}

async function getArtistTopTrack(artistId: string): Promise<SpotifyTrack | null> {
  const token = await getSpotifyToken();
  
  const response = await fetch(
    `https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) return null;

  const data = await response.json();
  const tracks = data.tracks || [];
  
  // Return first track with a preview
  return tracks.find((t: SpotifyTrack) => t.preview_url) || tracks[0] || null;
}

async function enrichArtists(festivalSlug?: string) {
  console.log('🎵 Enriching festival artists with Spotify data...\n');

  // Get artists that need enrichment
  let query = supabase
    .from('festival_artists')
    .select('id, artist_name, festival_id, spotify_id, image_url')
    .or('image_url.is.null,spotify_id.is.null');

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
    console.log('✅ All artists already enriched!');
    return;
  }

  console.log(`Found ${artists.length} artists to enrich\n`);

  let enriched = 0;
  let failed = 0;

  for (const artist of artists) {
    process.stdout.write(`  ${artist.artist_name}... `);

    try {
      const spotifyArtist = await searchArtist(artist.artist_name);

      if (!spotifyArtist) {
        console.log('❌ not found on Spotify');
        failed++;
        continue;
      }

      // Get image (prefer 640px, fallback to largest)
      const image = spotifyArtist.images.find(i => i.width === 640) || spotifyArtist.images[0];
      
      // Get top track with preview
      const topTrack = await getArtistTopTrack(spotifyArtist.id);

      // Update database
      const updates: Record<string, any> = {
        spotify_id: spotifyArtist.id,
        image_url: image?.url || null,
      };

      // Store preview URL in a metadata field (we might need to add this column)
      // For now, just update what we can

      const { error: updateError } = await supabase
        .from('festival_artists')
        .update(updates)
        .eq('id', artist.id);

      if (updateError) {
        console.log(`❌ DB error: ${updateError.message}`);
        failed++;
      } else {
        console.log(`✅ ${spotifyArtist.name} (${topTrack?.preview_url ? 'has preview' : 'no preview'})`);
        enriched++;
      }

      // Rate limit: 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.log(`❌ error: ${err}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${enriched} enriched, ${failed} failed`);
}

// Check if we need to add preview_url column
async function ensurePreviewColumn() {
  // This would need to be done via migration, but let's check if column exists
  const { data, error } = await supabase
    .from('festival_artists')
    .select('preview_url')
    .limit(1);

  if (error && error.message.includes('preview_url')) {
    console.log('Note: preview_url column not found. Run this migration:');
    console.log('ALTER TABLE festival_artists ADD COLUMN preview_url TEXT;');
    console.log('ALTER TABLE festival_artists ADD COLUMN spotify_url TEXT;\n');
  }
}

async function main() {
  console.log('=== Festival Artist Enrichment ===\n');

  if (!spotifyClientId || !spotifyClientSecret) {
    console.error('Missing Spotify credentials in .env.local');
    console.error('Required: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET');
    return;
  }

  await ensurePreviewColumn();

  // Enrich Coachella specifically, or all festivals
  const targetFestival = process.argv[2] || 'coachella';
  await enrichArtists(targetFestival);

  console.log('\n=== Complete ===');
}

main().catch(console.error);
