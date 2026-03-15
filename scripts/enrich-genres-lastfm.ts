/**
 * Enrich user_artists with genres from Last.fm API
 * Run with: npx tsx scripts/enrich-genres-lastfm.ts
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

// Public Last.fm API key (for demo purposes - widely shared)
const LASTFM_API_KEY = 'b25b959554ed76058ac220b7b2e0a026';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getGenresFromLastFm(artistName: string): Promise<string[]> {
  const encodedName = encodeURIComponent(artistName);
  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodedName}&api_key=${LASTFM_API_KEY}&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (data.error) return [];
    
    const tags = data.artist?.tags?.tag || [];
    // Filter out non-genre tags (like artist name, "seen live", etc.)
    const genres = tags
      .map((t: any) => t.name.toLowerCase())
      .filter((tag: string) => {
        // Skip tags that are likely not genres
        const skipTags = ['seen live', 'favorites', 'favourite', 'my music', 'awesome', 'love'];
        const isSkip = skipTags.some(skip => tag.includes(skip));
        const isArtistName = artistName.toLowerCase().includes(tag) || tag.includes(artistName.toLowerCase());
        return !isSkip && !isArtistName && tag.length > 1;
      })
      .slice(0, 5);
    
    return genres;
  } catch (error) {
    return [];
  }
}

async function main() {
  console.log('🎵 Enriching user_artists with Last.fm genres...\n');

  // Get all user_artists with empty genres
  const { data: artists, error } = await supabase
    .from('user_artists')
    .select('id, artist_name, genres')
    .or('genres.is.null,genres.eq.{}');

  if (error) {
    console.error('Error fetching artists:', error);
    return;
  }

  if (!artists || artists.length === 0) {
    console.log('✅ All user_artists already have genres!');
    return;
  }

  console.log(`Found ${artists.length} artists needing genres\n`);

  let enriched = 0;
  let failed = 0;

  for (const artist of artists) {
    process.stdout.write(`  ${artist.artist_name}... `);

    const genres = await getGenresFromLastFm(artist.artist_name);

    if (genres.length > 0) {
      const { error: updateError } = await supabase
        .from('user_artists')
        .update({ genres })
        .eq('id', artist.id);

      if (updateError) {
        console.log(`❌ DB error`);
        failed++;
      } else {
        console.log(`✓ ${genres.slice(0, 3).join(', ')}`);
        enriched++;
      }
    } else {
      console.log(`- no tags found`);
      failed++;
    }

    // Rate limit: 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Results: ${enriched} enriched, ${failed} no data`);

  // Also update music_profiles
  console.log('\n--- Updating music_profiles table ---');
  
  const { data: profiles, error: profileError } = await supabase
    .from('music_profiles')
    .select('id, top_artists, top_genres');

  if (!profileError && profiles) {
    for (const profile of profiles) {
      const topArtists = profile.top_artists || [];
      const artistsNeedingGenres = topArtists.filter((a: any) => !a.genres || a.genres.length === 0);
      
      if (artistsNeedingGenres.length === 0) continue;

      let updated = false;
      const updatedArtists = [...topArtists];

      for (let i = 0; i < updatedArtists.length; i++) {
        const a = updatedArtists[i];
        if (!a.genres || a.genres.length === 0) {
          const genres = await getGenresFromLastFm(a.name);
          if (genres.length > 0) {
            updatedArtists[i] = { ...a, genres };
            updated = true;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (updated) {
        // Recompute top_genres
        const allGenres = updatedArtists.flatMap((a: any) => a.genres || []);
        const genreCounts = allGenres.reduce((acc: Record<string, number>, g: string) => {
          acc[g] = (acc[g] || 0) + 1;
          return acc;
        }, {});
        const topGenres = Object.entries(genreCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([g]) => g);

        await supabase
          .from('music_profiles')
          .update({ top_artists: updatedArtists, top_genres: topGenres })
          .eq('id', profile.id);

        console.log(`✓ Updated profile ${profile.id.slice(0, 8)}...`);
      }
    }
  }

  console.log('\n=== Complete ===');
}

main().catch(console.error);
