/**
 * Taste Graph Types
 */

// Embedding vector (1024 dimensions for Voyage, 1536 for OpenAI)
export type EmbeddingVector = number[];

// Default to Voyage dimensions (configured via EMBEDDING_PROVIDER env var)
export const EMBEDDING_DIMENSIONS = 1024;

// ============================================
// ARTIST TYPES
// ============================================

export interface ArtistMetadata {
  genres: string[];
  relatedArtists: string[];
  bioSummary?: string;
  venueTypes: ('club' | 'theater' | 'arena' | 'festival' | 'stadium')[];
  energyLevel: 'low' | 'medium' | 'high' | 'extreme';
  crowdIntensity: 'intimate' | 'moderate' | 'intense' | 'chaotic';
  productionScale: 'minimal' | 'standard' | 'elaborate' | 'spectacular';
  mainstreamLevel: 'underground' | 'indie' | 'mainstream' | 'superstar';
  danceability: 'low' | 'medium' | 'high';
  culturalRegion?: string;
  languageBias?: string[];
}

export interface ArtistEmbedding {
  id: string;
  spotifyId?: string;
  musicbrainzId?: string;
  name: string;
  normalizedName: string;
  embedding: EmbeddingVector | null;
  metadata: ArtistMetadata;
  embeddingInput?: string;
  embeddingModel: string;
  embeddingVersion: number;
  lastEmbeddedAt: Date;
}

// ============================================
// EVENT TYPES
// ============================================

export interface EventEmbedding {
  id: string;
  externalId: string;
  source: 'ticketmaster' | 'eventbrite' | 'bandsintown' | 'seatgeek';
  name: string;
  venueName?: string;
  city?: string;
  date?: Date;
  lineup: string[];
  lineupArtistIds: string[];
  embedding: EmbeddingVector | null;
  embeddingMethod: 'weighted_average' | 'headliner_only';
  embeddingVersion: number;
  lastEmbeddedAt: Date;
}

// ============================================
// USER TYPES
// ============================================

export type OnboardingType = 'spotify' | 'apple_music' | 'manual';

export interface OnboardingSliderValues {
  energy: number;        // 0-1: chill to explosive
  crowdSize: number;     // 0-1: intimate to massive
  exploration: number;   // 0-1: familiar to discovering
  vibes: {
    dance: number;       // 0-1
    lyrical: number;     // 0-1
    spectacle: number;   // 0-1
    community: number;   // 0-1
  };
}

export interface OnboardingData {
  sliderValues?: OnboardingSliderValues;
  likedArtists?: string[];
  likedArtistIds?: string[];
  culturalPreferences?: string[];
  completedStages?: number[];
}

export interface UserTasteEmbedding {
  id: string;
  userId: string;
  coreEmbedding: EmbeddingVector | null;
  coreUpdatedAt?: Date;
  sessionEmbedding: EmbeddingVector | null;
  sessionUpdatedAt?: Date;
  sessionDecayHours: number;
  onboardingType: OnboardingType;
  onboardingCompletedAt?: Date;
  onboardingData: OnboardingData;
  embeddingVersion: number;
}

// ============================================
// FESTIVAL TYPES
// ============================================

export interface FestivalSlotEmbedding {
  id: string;
  festivalId: string;
  stageName?: string;
  day?: Date;
  startTime?: string;
  endTime?: string;
  artistIds: string[];
  embedding: EmbeddingVector | null;
  embeddingVersion: number;
  lastEmbeddedAt: Date;
}

// ============================================
// ANCHOR VECTORS
// ============================================

export type AnchorType = 'energy' | 'crowd_size' | 'exploration' | 'vibe_dance' | 'vibe_lyrical' | 'vibe_spectacle' | 'vibe_community';

export interface EmbeddingAnchor {
  id: string;
  anchorType: AnchorType;
  anchorName: string;
  embedding: EmbeddingVector;
  defaultWeight: number;
  description?: string;
}

// ============================================
// MATCHING TYPES
// ============================================

export interface MatchResult {
  entityId: string;
  entityType: 'artist' | 'event' | 'festival_slot';
  similarity: number; // 0-1
  name: string;
  metadata?: Record<string, unknown>;
}

export interface UserMatchContext {
  userId: string;
  effectiveEmbedding: EmbeddingVector;
  sessionWeight: number;
}

// ============================================
// EMBEDDING PROVIDER TYPES
// ============================================

export type EmbeddingProvider = 'openai' | 'voyage' | 'local';

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model: string;
  dimensions: number;
  apiKey?: string;
}

export const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: 'openai',
  model: 'text-embedding-3-small',
  dimensions: 1536,
};
