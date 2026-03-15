/**
 * Enrich user_artists with genres from Spotify API
 * Run with: npx tsx scripts/enrich-user-genres.ts
 * 
 * Uses Spotify's Get Several Artists endpoint to batch-fetch genres
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load env
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
const spotifyClientId = process.env['SPOTIFY_CLIENT_ID'] || envVars['SPOTIFY_CLIENT_ID'];
const spotifyClientSecret = process.env['SPOTIFY_CLIENT_SECRET'] || envVars['SPOTIFY_CLIENT_SECRET'];

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
}

interface UserArtist {
  id: string;
  artist_name: string;
  source_ids: { spotify?: string } | null;
  genres: string[];
}

async function getSpotifyAccessToken(): Promise<string> {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${spotifyClientId}:${spotifyClientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function getArtistGenres(token: string, artistIds: string[]): Promise<Map<string, string[]>> {
  // Spotify allows up to 50 artists per request
  const url = `https://api.spotify.com/v1/artists?ids=${artistIds.join(',')}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!response.ok) {
    console.error(`Spotify API error: ${response.status}`);
    return new Map();
  }

  const data = await response.json();
  const genreMap = new Map<string, string[]>();
  
  for (const artist of data.artists || []) {
    if (artist) {
      genreMap.set(artist.id, artist.genres || []);
    }
  }

  return genreMap;
}

async function enrichUserArtistGenres() {
  console.log('🎵 Enriching user_artists with Spotify genres...\n');

  if (!spotifyClientId || !spotifyClientSecret) {
    console.error('Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local');
    return;
  }

  // Get Spotify token
  console.log('Getting Spotify access token...');
  const token = await getSpotifyAccessToken();
  console.log('✓ Token acquired\n');

  // Get all user_artists with Spotify IDs but empty genres
  const { data: artists, error } = await supabase
    .from('user_artists')
    .select('id, artist_name, source_ids, genres')
    .or('genres.is.null,genres.eq.{}');

  if (error) {
    console.error('Error fetching artists:', error);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('✅ All user_artists already have genres!');
    return;
  }

  // Filter to only those with Spotify IDs
  const artistsWithSpotifyIds = (artists as UserArtist[]).filter(
    a => a.source_ids?.spotify
  );

  console.log(`Found ${artists.length} artists with empty genres`);
  console.log(`${artistsWithSpotifyIds.length} have Spotify IDs to look up\n`);

  if (artistsWithSpotifyIds.length === 0) {
    console.log('No artists with Spotify IDs to enrich.');
    return;
  }

  // Process in batches of 50 (Spotify API limit)
  const batchSize = 50;
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < artistsWithSpotifyIds.length; i += batchSize) {
    const batch = artistsWithSpotifyIds.slice(i, i + batchSize);
    const spotifyIds = batch.map(a => a.source_ids!.spotify!);

    console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(artistsWithSpotifyIds.length / batchSize)}...`);

    try {
      const genreMap = await getArtistGenres(token, spotifyIds);

      for (const artist of batch) {
        const spotifyId = artist.source_ids!.spotify!;
        const genres = genreMap.get(spotifyId) || [];

        if (genres.length > 0) {
          const { error: updateError } = await supabase
            .from('user_artists')
            .update({ genres })
            .eq('id', artist.id);

          if (updateError) {
            console.log(`  ❌ ${artist.artist_name}: DB error`);
            failed++;
          } else {
            console.log(`  ✓ ${artist.artist_name}: ${genres.slice(0, 3).join(', ')}${genres.length > 3 ? '...' : ''}`);
            enriched++;
          }
        } else {
          console.log(`  - ${artist.artist_name}: no genres from Spotify`);
        }
      }

      // Rate limit: small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (err) {
      console.error(`Batch error:`, err);
      failed += batch.length;
    }
  }

  console.log(`\n📊 Results: ${enriched} enriched, ${failed} failed`);

  // Also update music_profiles table for legacy support
  console.log('\n--- Updating music_profiles table ---');
  await enrichMusicProfiles(token);
}

async function enrichMusicProfiles(token: string) {
  const { data: profiles, error } = await supabase
    .from('music_profiles')
    .select('id, top_artists');

  if (error || !profiles) {
    console.error('Error fetching music_profiles:', error);
    return;
  }

  let updated = 0;

  for (const profile of profiles) {
    const topArtists = profile.top_artists || [];
    const needsUpdate = topArtists.some((a: any) => !a.genres || a.genres.length === 0);

    if (!needsUpdate) continue;

    // Get Spotify IDs from artists
    const spotifyIds = topArtists
      .filter((a: any) => a.id && !a.id.startsWith('mb:'))
      .map((a: any) => a.id)
      .slice(0, 50);

    if (spotifyIds.length === 0) continue;

    const genreMap = await getArtistGenres(token, spotifyIds);

    const updatedArtists = topArtists.map((a: any) => {
      if (a.id && genreMap.has(a.id)) {
        return { ...a, genres: genreMap.get(a.id) };
      }
      return a;
    });

    // Compute top_genres from all artists
    const allGenres = updatedArtists.flatMap((a: any) => a.genres || []);
    const genreCounts = allGenres.reduce((acc: Record<string, number>, g: string) => {
      acc[g] = (acc[g] || 0) + 1;
      return acc;
    }, {});
    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([g]) => g);

    const { error: updateError } = await supabase
      .from('music_profiles')
      .update({ 
        top_artists: updatedArtists,
        top_genres: topGenres 
      })
      .eq('id', profile.id);

    if (!updateError) {
      console.log(`✓ Updated profile ${profile.id.slice(0, 8)}... (${topGenres.slice(0, 3).join(', ')})`);
      updated++;
    }
  }

  console.log(`Updated ${updated} music profiles`);
}

async function main() {
  console.log('=== User Artist Genre Enrichment ===\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    return;
  }

  await enrichUserArtistGenres();

  console.log('\n=== Complete ===');
}

main().catch(console.error);
