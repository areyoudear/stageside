/**
 * Artist Embedding Pipeline
 * 
 * Generates taste embeddings for artists based on:
 * - Genres, related artists, bio
 * - Inferred live experience traits
 * - Venue types, energy levels, crowd intensity
 */

import { createClient } from '@supabase/supabase-js';
import { 
  ArtistMetadata, 
  ArtistEmbedding, 
  EmbeddingVector,
  EMBEDDING_DIMENSIONS 
} from './types';
import { generateEmbedding, getEmbeddingConfig } from './embedding-service';

// Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Normalize artist name for consistent lookups
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Raw artist data from various sources
 */
export interface RawArtistData {
  name: string;
  spotifyId?: string;
  genres?: string[];
  relatedArtists?: string[];
  bio?: string;
  popularity?: number;
  images?: { url: string }[];
}

/**
 * Normalize artist metadata for embedding
 * Uses simple heuristics instead of LLM (faster, no API dependency)
 * LLM enrichment can be added later as a background job
 */
async function normalizeArtistMetadata(raw: RawArtistData): Promise<ArtistMetadata> {
  // Infer venue types from popularity
  let venueTypes: ArtistMetadata['venueTypes'] = ['theater'];
  let mainstreamLevel: ArtistMetadata['mainstreamLevel'] = 'indie';
  
  if (raw.popularity !== undefined) {
    if (raw.popularity >= 80) {
      venueTypes = ['arena', 'stadium', 'festival'];
      mainstreamLevel = 'superstar';
    } else if (raw.popularity >= 60) {
      venueTypes = ['theater', 'arena', 'festival'];
      mainstreamLevel = 'mainstream';
    } else if (raw.popularity >= 40) {
      venueTypes = ['club', 'theater'];
      mainstreamLevel = 'indie';
    } else {
      venueTypes = ['club'];
      mainstreamLevel = 'underground';
    }
  }
  
  // Infer energy/danceability from genres
  const genres = raw.genres || [];
  const genreString = genres.join(' ').toLowerCase();
  
  let energyLevel: ArtistMetadata['energyLevel'] = 'medium';
  let danceability: ArtistMetadata['danceability'] = 'medium';
  let crowdIntensity: ArtistMetadata['crowdIntensity'] = 'moderate';
  
  if (genreString.includes('metal') || genreString.includes('punk') || genreString.includes('hardcore')) {
    energyLevel = 'extreme';
    crowdIntensity = 'chaotic';
    danceability = 'low';
  } else if (genreString.includes('edm') || genreString.includes('house') || genreString.includes('techno') || genreString.includes('dance')) {
    energyLevel = 'high';
    crowdIntensity = 'intense';
    danceability = 'high';
  } else if (genreString.includes('hip hop') || genreString.includes('rap') || genreString.includes('trap')) {
    energyLevel = 'high';
    crowdIntensity = 'intense';
    danceability = 'high';
  } else if (genreString.includes('jazz') || genreString.includes('classical') || genreString.includes('ambient')) {
    energyLevel = 'low';
    crowdIntensity = 'intimate';
    danceability = 'low';
  } else if (genreString.includes('rock') || genreString.includes('alternative')) {
    energyLevel = 'high';
    crowdIntensity = 'moderate';
    danceability = 'medium';
  } else if (genreString.includes('pop') || genreString.includes('r&b')) {
    energyLevel = 'medium';
    crowdIntensity = 'moderate';
    danceability = 'high';
  }
  
  return {
    genres: genres,
    relatedArtists: raw.relatedArtists || [],
    venueTypes,
    energyLevel,
    crowdIntensity,
    productionScale: mainstreamLevel === 'superstar' ? 'spectacular' : mainstreamLevel === 'mainstream' ? 'elaborate' : 'standard',
    mainstreamLevel,
    danceability,
  };
}

/**
 * Create embedding input text from metadata
 * This is what gets sent to the embedding model
 */
function createEmbeddingInput(name: string, metadata: ArtistMetadata): string {
  const parts: string[] = [
    `Artist: ${name}`,
    `Primary genres: ${metadata.genres.slice(0, 5).join(', ')}`,
    `Similar to: ${metadata.relatedArtists.slice(0, 5).join(', ')}`,
    `Typical venues: ${metadata.venueTypes.join(', ')}`,
    `Live energy: ${metadata.energyLevel}`,
    `Crowd intensity: ${metadata.crowdIntensity}`,
    `Production scale: ${metadata.productionScale}`,
    `Mainstream level: ${metadata.mainstreamLevel}`,
    `Danceability: ${metadata.danceability}`,
  ];
  
  if (metadata.bioSummary) {
    parts.push(`Style: ${metadata.bioSummary}`);
  }
  
  if (metadata.culturalRegion) {
    parts.push(`Cultural region: ${metadata.culturalRegion}`);
  }
  
  if (metadata.languageBias && metadata.languageBias.length > 0) {
    parts.push(`Languages: ${metadata.languageBias.join(', ')}`);
  }
  
  return parts.join('\n');
}

/**
 * Get or create artist embedding
 * 
 * 1. Check if embedding exists in DB
 * 2. If not, normalize metadata via LLM
 * 3. Generate embedding from structured text
 * 4. Store in DB
 */
export async function getOrCreateArtistEmbedding(
  raw: RawArtistData
): Promise<ArtistEmbedding> {
  const normalizedName = normalizeArtistName(raw.name);
  
  // Check cache first
  const { data: existing } = await supabase
    .from('artist_embeddings')
    .select('*')
    .eq('normalized_name', normalizedName)
    .single();
    
  if (existing && existing.embedding) {
    return {
      id: existing.id,
      spotifyId: existing.spotify_id,
      name: existing.name,
      normalizedName: existing.normalized_name,
      embedding: existing.embedding,
      metadata: existing.metadata,
      embeddingInput: existing.embedding_input,
      embeddingModel: existing.embedding_model,
      embeddingVersion: existing.embedding_version,
      lastEmbeddedAt: new Date(existing.last_embedded_at),
    };
  }
  
  // Normalize metadata via LLM
  const metadata = await normalizeArtistMetadata(raw);
  
  // Create embedding input text
  const embeddingInput = createEmbeddingInput(raw.name, metadata);
  
  // Generate embedding
  const config = getEmbeddingConfig();
  const embedding = await generateEmbedding(embeddingInput);
  
  // Store in DB
  const { data: inserted, error } = await supabase
    .from('artist_embeddings')
    .upsert({
      spotify_id: raw.spotifyId,
      name: raw.name,
      normalized_name: normalizedName,
      embedding: embedding,
      metadata: metadata,
      embedding_input: embeddingInput,
      embedding_model: config.model,
      embedding_version: 1,
      last_embedded_at: new Date().toISOString(),
    }, {
      onConflict: 'normalized_name',
    })
    .select()
    .single();
    
  if (error) {
    console.error('Error storing artist embedding:', error);
    throw error;
  }
  
  return {
    id: inserted.id,
    spotifyId: inserted.spotify_id,
    name: inserted.name,
    normalizedName: inserted.normalized_name,
    embedding: inserted.embedding,
    metadata: inserted.metadata,
    embeddingInput: inserted.embedding_input,
    embeddingModel: inserted.embedding_model,
    embeddingVersion: inserted.embedding_version,
    lastEmbeddedAt: new Date(inserted.last_embedded_at),
  };
}

/**
 * Get artist embedding by name (without creating)
 */
export async function getArtistEmbedding(
  name: string
): Promise<ArtistEmbedding | null> {
  const normalizedName = normalizeArtistName(name);
  
  const { data, error } = await supabase
    .from('artist_embeddings')
    .select('*')
    .eq('normalized_name', normalizedName)
    .single();
    
  if (error || !data) {
    return null;
  }
  
  return {
    id: data.id,
    spotifyId: data.spotify_id,
    name: data.name,
    normalizedName: data.normalized_name,
    embedding: data.embedding,
    metadata: data.metadata,
    embeddingInput: data.embedding_input,
    embeddingModel: data.embedding_model,
    embeddingVersion: data.embedding_version,
    lastEmbeddedAt: new Date(data.last_embedded_at),
  };
}

/**
 * Get multiple artist embeddings by names
 */
export async function getArtistEmbeddings(
  names: string[]
): Promise<Map<string, ArtistEmbedding>> {
  const normalizedNames = names.map(normalizeArtistName);
  
  const { data, error } = await supabase
    .from('artist_embeddings')
    .select('*')
    .in('normalized_name', normalizedNames);
    
  if (error) {
    console.error('Error fetching artist embeddings:', error);
    return new Map();
  }
  
  const result = new Map<string, ArtistEmbedding>();
  
  for (const row of data || []) {
    result.set(row.normalized_name, {
      id: row.id,
      spotifyId: row.spotify_id,
      name: row.name,
      normalizedName: row.normalized_name,
      embedding: row.embedding,
      metadata: row.metadata,
      embeddingInput: row.embedding_input,
      embeddingModel: row.embedding_model,
      embeddingVersion: row.embedding_version,
      lastEmbeddedAt: new Date(row.last_embedded_at),
    });
  }
  
  return result;
}

/**
 * Batch embed multiple artists
 */
export async function embedArtistsBatch(
  artists: RawArtistData[],
  maxConcurrent: number = 5
): Promise<ArtistEmbedding[]> {
  const results: ArtistEmbedding[] = [];
  
  // Process in batches
  for (let i = 0; i < artists.length; i += maxConcurrent) {
    const batch = artists.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(artist => getOrCreateArtistEmbedding(artist).catch(err => {
        console.error(`Error embedding artist ${artist.name}:`, err);
        return null;
      }))
    );
    
    results.push(...batchResults.filter((r): r is ArtistEmbedding => r !== null));
    
    // Small delay between batches
    if (i + maxConcurrent < artists.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * Search for similar artists using vector similarity
 */
export async function findSimilarArtists(
  embedding: EmbeddingVector,
  limit: number = 20
): Promise<Array<{ artist: ArtistEmbedding; similarity: number }>> {
  // Use pgvector's cosine distance operator
  const { data, error } = await supabase.rpc('find_similar_artists', {
    p_embedding: embedding,
    p_limit: limit,
  });
  
  if (error) {
    console.error('Error finding similar artists:', error);
    return [];
  }
  
  // Fetch full artist data for results
  const artistIds = data.map((r: { artist_id: string }) => r.artist_id);
  const { data: artists } = await supabase
    .from('artist_embeddings')
    .select('*')
    .in('id', artistIds);
    
  const artistMap = new Map(artists?.map(a => [a.id, a]) || []);
  
  return data.map((r: { artist_id: string; similarity: number }) => ({
    artist: {
      id: r.artist_id,
      ...artistMap.get(r.artist_id),
    } as ArtistEmbedding,
    similarity: r.similarity,
  }));
}
