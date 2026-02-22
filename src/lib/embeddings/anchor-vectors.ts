/**
 * Anchor Vectors for Onboarding Sliders
 * 
 * Predefined semantic anchor vectors for interpolating user preferences.
 * These are generated once and stored in embedding_anchors table.
 * 
 * Slider mapping:
 * - Energy: v_low_energy ↔ v_high_energy
 * - Venue Size: v_small_venue ↔ v_large_venue
 * - Vibes: v_dance, v_lyrical, v_spectacle, v_community
 */

import { createClient } from '@supabase/supabase-js';
import { 
  EmbeddingVector, 
  EmbeddingAnchor,
  OnboardingSliderValues,
  EMBEDDING_DIMENSIONS 
} from './types';
import { 
  generateEmbedding, 
  interpolateVectors, 
  weightedAverageVectors,
  normalizeVector,
  zeroVector,
  parseVectorFromDb 
} from './embedding-service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Semantic descriptions for anchor vector generation
export const ANCHOR_DEFINITIONS = {
  // Energy dimension
  energy_low: {
    type: 'energy',
    name: 'low',
    description: 'Calm, relaxed, ambient vibes. Singer-songwriter, acoustic, chill electronic. Quiet listening, seated shows, contemplative atmosphere.',
  },
  energy_high: {
    type: 'energy', 
    name: 'high',
    description: 'High energy, explosive, intense. Heavy metal, EDM drops, punk rock, hardcore. Mosh pits, jumping, screaming along, physical exertion.',
  },
  
  // Venue size dimension
  crowd_size_intimate: {
    type: 'crowd_size',
    name: 'intimate',
    description: 'Small intimate venues, 50-500 capacity. House shows, jazz clubs, dive bars. Close connection with artist, underground vibes.',
  },
  crowd_size_massive: {
    type: 'crowd_size',
    name: 'massive',
    description: 'Massive crowds, 10000+ capacity. Stadiums, arenas, major festivals. Sea of people, collective euphoria, big production.',
  },
  
  // Vibe dimensions
  vibe_dance_high: {
    type: 'vibe_dance',
    name: 'high',
    description: 'Dancing focus. Electronic, house, techno, disco, funk. Movement-oriented, rhythm-driven, club culture.',
  },
  vibe_dance_low: {
    type: 'vibe_dance',
    name: 'low',
    description: 'Non-dance focus. Standing/sitting, listening intently. Folk, classical, spoken word.',
  },
  
  vibe_lyrical_high: {
    type: 'vibe_lyrical',
    name: 'high',
    description: 'Lyric-focused. Storytelling, poetry, emotional depth. Singer-songwriters, hip-hop, indie folk. Words matter.',
  },
  vibe_lyrical_low: {
    type: 'vibe_lyrical',
    name: 'low',
    description: 'Instrumental focus. Sound over words. Post-rock, electronic, ambient, jam bands.',
  },
  
  vibe_spectacle_high: {
    type: 'vibe_spectacle',
    name: 'high',
    description: 'Visual spectacle. Elaborate production, lights, visuals, pyro, costumes, choreography. Pop mega-shows, EDM festivals.',
  },
  vibe_spectacle_low: {
    type: 'vibe_spectacle',
    name: 'low',
    description: 'Minimal production. Raw, stripped down, authentic. Acoustic, punk DIY, unplugged shows.',
  },
  
  vibe_community_high: {
    type: 'vibe_community',
    name: 'high',
    description: 'Community-focused. Scene culture, regulars, shared identity. Punk houses, local scenes, subculture gatherings.',
  },
  vibe_community_low: {
    type: 'vibe_community',
    name: 'low',
    description: 'Anonymous crowd. Go for the music, not the scene. Mainstream concerts, casual attendance.',
  },
  
  // Cultural preferences
  cultural_local: {
    type: 'cultural',
    name: 'local',
    description: 'Local scene preference. Regional artists, neighborhood venues, supporting local music.',
  },
  cultural_international: {
    type: 'cultural',
    name: 'international',
    description: 'International music. World music, foreign language, global sounds, touring international acts.',
  },
  cultural_underground: {
    type: 'cultural',
    name: 'underground',
    description: 'Underground culture. Anti-mainstream, experimental, avant-garde, DIY ethos.',
  },
  cultural_mainstream: {
    type: 'cultural',
    name: 'mainstream',
    description: 'Mainstream comfort. Radio hits, popular artists, accessible music, chart toppers.',
  },
} as const;

// Cache for anchor vectors
let anchorCache: Map<string, EmbeddingAnchor> | null = null;
let anchorCacheTime: number = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get all anchor vectors from database (with caching)
 */
export async function getAnchorVectors(): Promise<Map<string, EmbeddingAnchor>> {
  const now = Date.now();
  
  if (anchorCache && (now - anchorCacheTime) < CACHE_TTL_MS) {
    return anchorCache;
  }
  
  const { data, error } = await supabase
    .from('embedding_anchors')
    .select('*');
    
  if (error || !data) {
    console.error('Error fetching anchor vectors:', error);
    return anchorCache || new Map();
  }
  
  const anchors = new Map<string, EmbeddingAnchor>();
  for (const row of data) {
    const key = `${row.anchor_type}_${row.anchor_name}`;
    // Parse pgvector string to array
    const embedding = parseVectorFromDb(row.embedding);
    anchors.set(key, {
      id: row.id,
      anchorType: row.anchor_type,
      anchorName: row.anchor_name,
      embedding,
      defaultWeight: row.default_weight,
      description: row.description,
    });
  }
  
  anchorCache = anchors;
  anchorCacheTime = now;
  
  return anchors;
}

/**
 * Get a specific anchor vector
 */
export async function getAnchor(
  type: string, 
  name: string
): Promise<EmbeddingAnchor | null> {
  const anchors = await getAnchorVectors();
  return anchors.get(`${type}_${name}`) || null;
}

/**
 * Initialize anchor vectors in database
 * Call once during setup or when embeddings model changes
 */
export async function initializeAnchorVectors(): Promise<void> {
  console.log('Initializing anchor vectors...');
  
  for (const [key, def] of Object.entries(ANCHOR_DEFINITIONS)) {
    try {
      // Check if already exists
      const { data: existing, error: checkError } = await supabase
        .from('embedding_anchors')
        .select('id')
        .eq('anchor_type', def.type)
        .eq('anchor_name', def.name)
        .maybeSingle();  // Use maybeSingle to return null instead of error
        
      if (existing) {
        console.log(`Anchor ${key} already exists, skipping`);
        continue;
      }
      
      if (checkError) {
        console.error(`Error checking anchor ${key}:`, checkError);
        // Continue anyway to try inserting
      }
      
      // Generate embedding from description
      const embedding = await generateEmbedding(def.description);
      
      // Insert into database
      const { error } = await supabase
        .from('embedding_anchors')
        .insert({
          anchor_type: def.type,
          anchor_name: def.name,
          embedding: embedding,
          description: def.description,
          default_weight: 0.2,
        });
        
      if (error) {
        console.error(`Error inserting anchor ${key}:`, error);
      } else {
        console.log(`Created anchor vector: ${key}`);
      }
    } catch (error) {
      console.error(`Error processing anchor ${key}:`, error);
    }
  }
  
  // Clear cache
  anchorCache = null;
  console.log('Anchor vector initialization complete');
}

/**
 * Compute slider vector from onboarding values using lerp
 */
export async function computeSliderVector(
  sliders: OnboardingSliderValues
): Promise<EmbeddingVector> {
  const anchors = await getAnchorVectors();
  
  const components: EmbeddingVector[] = [];
  const weights: number[] = [];
  
  // Energy: lerp between low and high
  const energyLow = anchors.get('energy_low');
  const energyHigh = anchors.get('energy_high');
  if (energyLow?.embedding && energyHigh?.embedding) {
    const energyVec = interpolateVectors(
      energyLow.embedding,
      energyHigh.embedding,
      sliders.energy // 0 = low, 1 = high
    );
    components.push(energyVec);
    weights.push(0.35); // Energy is important
  }
  
  // Crowd size: lerp between intimate and massive
  const crowdIntimate = anchors.get('crowd_size_intimate');
  const crowdMassive = anchors.get('crowd_size_massive');
  if (crowdIntimate?.embedding && crowdMassive?.embedding) {
    const crowdVec = interpolateVectors(
      crowdIntimate.embedding,
      crowdMassive.embedding,
      sliders.crowdSize
    );
    components.push(crowdVec);
    weights.push(0.25);
  }
  
  // Dance vibe: lerp based on value
  const danceLow = anchors.get('vibe_dance_low');
  const danceHigh = anchors.get('vibe_dance_high');
  if (danceLow?.embedding && danceHigh?.embedding) {
    const danceVec = interpolateVectors(
      danceLow.embedding,
      danceHigh.embedding,
      sliders.vibes.dance
    );
    components.push(danceVec);
    weights.push(sliders.vibes.dance * 0.15);
  }
  
  // Lyrical vibe
  const lyricalLow = anchors.get('vibe_lyrical_low');
  const lyricalHigh = anchors.get('vibe_lyrical_high');
  if (lyricalLow?.embedding && lyricalHigh?.embedding) {
    const lyricalVec = interpolateVectors(
      lyricalLow.embedding,
      lyricalHigh.embedding,
      sliders.vibes.lyrical
    );
    components.push(lyricalVec);
    weights.push(sliders.vibes.lyrical * 0.1);
  }
  
  // Spectacle vibe
  const spectacleLow = anchors.get('vibe_spectacle_low');
  const spectacleHigh = anchors.get('vibe_spectacle_high');
  if (spectacleLow?.embedding && spectacleHigh?.embedding) {
    const spectacleVec = interpolateVectors(
      spectacleLow.embedding,
      spectacleHigh.embedding,
      sliders.vibes.spectacle
    );
    components.push(spectacleVec);
    weights.push(sliders.vibes.spectacle * 0.1);
  }
  
  // Community vibe
  const communityLow = anchors.get('vibe_community_low');
  const communityHigh = anchors.get('vibe_community_high');
  if (communityLow?.embedding && communityHigh?.embedding) {
    const communityVec = interpolateVectors(
      communityLow.embedding,
      communityHigh.embedding,
      sliders.vibes.community
    );
    components.push(communityVec);
    weights.push(sliders.vibes.community * 0.05);
  }
  
  if (components.length === 0) {
    return zeroVector(EMBEDDING_DIMENSIONS);
  }
  
  // Normalize weights to sum to 1
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);
  
  return weightedAverageVectors(components, normalizedWeights);
}

/**
 * Compute cultural preference vector
 */
export async function computeCulturalVector(
  preferences: string[]
): Promise<EmbeddingVector> {
  if (!preferences || preferences.length === 0) {
    return zeroVector(EMBEDDING_DIMENSIONS);
  }
  
  const anchors = await getAnchorVectors();
  const culturalVecs: EmbeddingVector[] = [];
  
  for (const pref of preferences) {
    const anchor = anchors.get(`cultural_${pref}`);
    if (anchor?.embedding) {
      culturalVecs.push(anchor.embedding);
    }
  }
  
  if (culturalVecs.length === 0) {
    return zeroVector(EMBEDDING_DIMENSIONS);
  }
  
  // Equal weight for all cultural preferences
  const weights = culturalVecs.map(() => 1 / culturalVecs.length);
  return weightedAverageVectors(culturalVecs, weights);
}
