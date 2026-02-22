-- ============================================
-- EMBEDDING SYSTEM ENHANCEMENTS
-- ============================================
-- Migration: 20260223_embedding_enhancements
-- Enhances existing embedding tables with additional fields,
-- improved functions, and better indexes

-- ============================================
-- 1. ENHANCE ARTIST_EMBEDDINGS TABLE
-- ============================================

-- Add missing columns to artist_embeddings
ALTER TABLE artist_embeddings 
  ADD COLUMN IF NOT EXISTS metadata_json JSONB DEFAULT '{}',
  -- Structured metadata: genres, venue_types, energy_level, crowd_intensity, 
  -- production_scale, cultural_region, typical_crowd_size, etc.
  ADD COLUMN IF NOT EXISTS energy_level FLOAT,          -- 0.0 to 1.0
  ADD COLUMN IF NOT EXISTS crowd_intensity FLOAT,        -- 0.0 to 1.0
  ADD COLUMN IF NOT EXISTS typical_venue_types TEXT[],   -- ['arena', 'club', 'festival', 'theater']
  ADD COLUMN IF NOT EXISTS popularity_score FLOAT;       -- Derived from streaming data

-- Migrate existing 'metadata' column to 'metadata_json' if needed
DO $$
BEGIN
  -- If metadata column exists and metadata_json is empty, copy data
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'artist_embeddings' AND column_name = 'metadata'
  ) THEN
    UPDATE artist_embeddings 
    SET metadata_json = metadata 
    WHERE metadata_json = '{}' AND metadata != '{}';
  END IF;
END $$;

-- Comment on metadata_json structure
COMMENT ON COLUMN artist_embeddings.metadata_json IS 
'Structured metadata: {
  "genres": ["indie rock", "dream pop"],
  "venue_types": ["club", "theater"],
  "energy_level": 0.7,
  "crowd_intensity": 0.5,
  "production_scale": "medium",
  "cultural_region": "north_america",
  "related_artist_ids": ["uuid1", "uuid2"],
  "bio_summary": "...",
  "typical_crowd_size": "medium"
}';

-- ============================================
-- 2. ENHANCE EVENT_EMBEDDINGS TABLE
-- ============================================

-- Add new columns for richer event embedding data
ALTER TABLE event_embeddings
  ADD COLUMN IF NOT EXISTS lineup_json JSONB DEFAULT '[]',
  -- Structured lineup: [{"artist_id": "uuid", "name": "...", "position": 1, "weight": 0.6}, ...]
  ADD COLUMN IF NOT EXISTS is_multi_artist BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS headliner_weight FLOAT DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS total_artists INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS event_type TEXT DEFAULT 'concert',
  -- 'concert', 'festival', 'club_night', 'residency'
  ADD COLUMN IF NOT EXISTS price_tier TEXT,
  -- 'budget', 'mid', 'premium', 'vip'
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Index for multi-artist events
CREATE INDEX IF NOT EXISTS idx_event_embeddings_multi_artist 
  ON event_embeddings(is_multi_artist) WHERE is_multi_artist = TRUE;

-- Index for event type filtering
CREATE INDEX IF NOT EXISTS idx_event_embeddings_type ON event_embeddings(event_type);

COMMENT ON COLUMN event_embeddings.lineup_json IS 
'Ordered lineup with weights: [
  {"artist_id": "uuid", "name": "Headliner", "position": 1, "weight": 0.6},
  {"artist_id": "uuid", "name": "Support 1", "position": 2, "weight": 0.25},
  {"artist_id": "uuid", "name": "Opener", "position": 3, "weight": 0.15}
]';

-- ============================================
-- 3. ENHANCE USER_TASTE_EMBEDDINGS TABLE
-- ============================================

-- Add exploration and versioning columns
ALTER TABLE user_taste_embeddings
  ADD COLUMN IF NOT EXISTS exploration_score FLOAT DEFAULT 0.5 
    CHECK (exploration_score >= 0 AND exploration_score <= 1),
  -- 0 = stick to known tastes, 1 = maximize discovery
  ADD COLUMN IF NOT EXISTS last_core_update_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_session_update_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS taste_confidence FLOAT DEFAULT 0.5,
  -- How confident we are in the embedding (based on data quality)
  ADD COLUMN IF NOT EXISTS artist_count INT DEFAULT 0,
  -- Number of artists used to compute embedding
  ADD COLUMN IF NOT EXISTS genre_distribution JSONB DEFAULT '{}';
  -- {"indie rock": 0.3, "electronic": 0.25, ...}

-- Sync the timestamp columns with existing ones
UPDATE user_taste_embeddings
SET 
  last_core_update_at = COALESCE(last_core_update_at, core_updated_at),
  last_session_update_at = COALESCE(last_session_update_at, session_updated_at)
WHERE last_core_update_at IS NULL OR last_session_update_at IS NULL;

-- ============================================
-- 4. PGVECTOR SIMILARITY FUNCTIONS
-- ============================================

-- Drop existing functions to recreate with better signatures
DROP FUNCTION IF EXISTS find_similar_artists(vector, int);
DROP FUNCTION IF EXISTS find_matching_events(uuid, text, date, date, int);

-- Enhanced find_similar_artists function
CREATE OR REPLACE FUNCTION find_similar_artists(
  p_embedding vector(1024),
  p_limit INT DEFAULT 20,
  p_min_similarity FLOAT DEFAULT 0.0,
  p_genres TEXT[] DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT NULL
)
RETURNS TABLE(
  artist_id UUID,
  spotify_id TEXT,
  name TEXT,
  normalized_name TEXT,
  similarity FLOAT,
  genres TEXT[],
  metadata_json JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as artist_id,
    a.spotify_id,
    a.name,
    a.normalized_name,
    (1 - (a.embedding <=> p_embedding))::FLOAT as similarity,
    COALESCE(
      (a.metadata_json->>'genres')::TEXT[],
      ARRAY[]::TEXT[]
    ) as genres,
    a.metadata_json
  FROM artist_embeddings a
  WHERE a.embedding IS NOT NULL
    AND (p_exclude_ids IS NULL OR a.id != ALL(p_exclude_ids))
    AND (1 - (a.embedding <=> p_embedding)) >= p_min_similarity
    AND (
      p_genres IS NULL 
      OR a.metadata_json->'genres' ?| p_genres
    )
  ORDER BY a.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$;

-- Enhanced find_similar_events with location and date filtering
CREATE OR REPLACE FUNCTION find_similar_events(
  p_embedding vector(1024),
  p_limit INT DEFAULT 20,
  p_location TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT NULL,
  p_date_to DATE DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.0,
  p_event_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  event_id UUID,
  external_id TEXT,
  source TEXT,
  name TEXT,
  venue_name TEXT,
  city TEXT,
  date DATE,
  lineup TEXT[],
  lineup_json JSONB,
  is_multi_artist BOOLEAN,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id as event_id,
    e.external_id,
    e.source,
    e.name,
    e.venue_name,
    e.city,
    e.date,
    e.lineup,
    e.lineup_json,
    e.is_multi_artist,
    (1 - (e.embedding <=> p_embedding))::FLOAT as similarity
  FROM event_embeddings e
  WHERE e.embedding IS NOT NULL
    AND (1 - (e.embedding <=> p_embedding)) >= p_min_similarity
    AND (p_location IS NULL OR e.city ILIKE '%' || p_location || '%')
    AND (p_date_from IS NULL OR e.date >= p_date_from)
    AND (p_date_to IS NULL OR e.date <= p_date_to)
    AND (p_event_type IS NULL OR e.event_type = p_event_type)
  ORDER BY e.embedding <=> p_embedding
  LIMIT p_limit;
END;
$$;

-- Function to calculate effective user embedding with alpha blending
CREATE OR REPLACE FUNCTION calculate_user_effective_embedding(
  p_core_embedding vector(1024),
  p_session_embedding vector(1024),
  p_alpha FLOAT DEFAULT 0.3  -- session weight (0 = core only, 1 = session only)
)
RETURNS vector(1024)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_result FLOAT[];
  v_core FLOAT[];
  v_session FLOAT[];
  i INT;
BEGIN
  -- If no session embedding, return core
  IF p_session_embedding IS NULL THEN
    RETURN p_core_embedding;
  END IF;
  
  -- If no core embedding, return session
  IF p_core_embedding IS NULL THEN
    RETURN p_session_embedding;
  END IF;
  
  -- Convert vectors to arrays for element-wise operations
  v_core := p_core_embedding::FLOAT[];
  v_session := p_session_embedding::FLOAT[];
  v_result := ARRAY[]::FLOAT[];
  
  -- Weighted average: (1 - alpha) * core + alpha * session
  FOR i IN 1..1536 LOOP
    v_result := array_append(
      v_result, 
      (1.0 - p_alpha) * v_core[i] + p_alpha * v_session[i]
    );
  END LOOP;
  
  RETURN v_result::vector(1024);
END;
$$;

-- Function to get user's effective embedding with automatic session decay
CREATE OR REPLACE FUNCTION get_user_effective_embedding(
  p_user_id UUID,
  p_base_session_weight FLOAT DEFAULT 0.3
)
RETURNS vector(1024)
LANGUAGE plpgsql
AS $$
DECLARE
  v_core vector(1024);
  v_session vector(1024);
  v_session_age_hours FLOAT;
  v_decay_hours INT;
  v_exploration_score FLOAT;
  v_effective_alpha FLOAT;
BEGIN
  SELECT 
    core_embedding,
    session_embedding,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(last_session_update_at, session_updated_at))) / 3600,
    session_decay_hours,
    exploration_score
  INTO v_core, v_session, v_session_age_hours, v_decay_hours, v_exploration_score
  FROM user_taste_embeddings
  WHERE user_id = p_user_id;
  
  -- No user embedding found
  IF v_core IS NULL AND v_session IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- If no session or session too old, return core only
  IF v_session IS NULL OR v_session_age_hours > v_decay_hours THEN
    RETURN v_core;
  END IF;
  
  -- Calculate effective alpha with exponential decay
  -- Higher exploration_score = more weight on session (recent behavior)
  v_effective_alpha := p_base_session_weight * 
    EXP(-v_session_age_hours / v_decay_hours) *
    (1 + COALESCE(v_exploration_score, 0.5));
  
  -- Clamp alpha to [0, 0.7] range
  v_effective_alpha := LEAST(0.7, GREATEST(0, v_effective_alpha));
  
  RETURN calculate_user_effective_embedding(v_core, v_session, v_effective_alpha);
END;
$$;

-- Function to find events matching a user's taste
CREATE OR REPLACE FUNCTION find_events_for_user(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_location TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE + INTERVAL '90 days',
  p_min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  event_id UUID,
  external_id TEXT,
  name TEXT,
  venue_name TEXT,
  city TEXT,
  date DATE,
  lineup TEXT[],
  similarity FLOAT,
  match_quality TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_embedding vector(1024);
BEGIN
  -- Get user's effective embedding
  v_user_embedding := get_user_effective_embedding(p_user_id);
  
  IF v_user_embedding IS NULL THEN
    RAISE EXCEPTION 'User % has no embedding', p_user_id;
  END IF;
  
  RETURN QUERY
  SELECT 
    e.event_id,
    e.external_id,
    e.name,
    e.venue_name,
    e.city,
    e.date,
    e.lineup,
    e.similarity,
    CASE 
      WHEN e.similarity >= 0.8 THEN 'excellent'
      WHEN e.similarity >= 0.6 THEN 'great'
      WHEN e.similarity >= 0.4 THEN 'good'
      ELSE 'discovery'
    END as match_quality
  FROM find_similar_events(
    v_user_embedding,
    p_limit,
    p_location,
    p_date_from,
    p_date_to,
    p_min_similarity
  ) e;
END;
$$;

-- ============================================
-- 5. IMPROVED VECTOR INDEXES
-- ============================================

-- Drop old indexes if they exist with wrong parameters
DROP INDEX IF EXISTS idx_artist_embeddings_vector;
DROP INDEX IF EXISTS idx_event_embeddings_vector;
DROP INDEX IF EXISTS idx_user_core_embedding_vector;

-- Create HNSW indexes for better performance (pgvector 0.5+)
-- HNSW is generally better than IVFFlat for recall/speed tradeoff

-- Check if we can use HNSW (pgvector >= 0.5.0), fall back to IVFFlat
DO $$
BEGIN
  -- Try creating HNSW index (better for most use cases)
  BEGIN
    CREATE INDEX idx_artist_embeddings_hnsw 
      ON artist_embeddings 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    
    CREATE INDEX idx_event_embeddings_hnsw 
      ON event_embeddings 
      USING hnsw (embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    
    CREATE INDEX idx_user_core_embedding_hnsw 
      ON user_taste_embeddings 
      USING hnsw (core_embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
    
    CREATE INDEX idx_user_session_embedding_hnsw 
      ON user_taste_embeddings 
      USING hnsw (session_embedding vector_cosine_ops)
      WITH (m = 16, ef_construction = 64);
      
    RAISE NOTICE 'Created HNSW indexes successfully';
  EXCEPTION WHEN OTHERS THEN
    -- Fall back to IVFFlat if HNSW not available
    RAISE NOTICE 'HNSW not available, creating IVFFlat indexes: %', SQLERRM;
    
    CREATE INDEX IF NOT EXISTS idx_artist_embeddings_ivfflat 
      ON artist_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    
    CREATE INDEX IF NOT EXISTS idx_event_embeddings_ivfflat 
      ON event_embeddings 
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100);
    
    CREATE INDEX IF NOT EXISTS idx_user_core_embedding_ivfflat 
      ON user_taste_embeddings 
      USING ivfflat (core_embedding vector_cosine_ops)
      WITH (lists = 50);
    
    CREATE INDEX IF NOT EXISTS idx_user_session_embedding_ivfflat 
      ON user_taste_embeddings 
      USING ivfflat (session_embedding vector_cosine_ops)
      WITH (lists = 50);
  END;
END $$;

-- Additional standard indexes for common queries
CREATE INDEX IF NOT EXISTS idx_artist_embeddings_energy 
  ON artist_embeddings(energy_level) 
  WHERE energy_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_artist_embeddings_popularity 
  ON artist_embeddings(popularity_score DESC) 
  WHERE popularity_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_embeddings_onboarding 
  ON user_taste_embeddings(onboarding_type);

CREATE INDEX IF NOT EXISTS idx_user_embeddings_exploration 
  ON user_taste_embeddings(exploration_score DESC);

-- GIN index for metadata_json queries
CREATE INDEX IF NOT EXISTS idx_artist_metadata_gin 
  ON artist_embeddings USING GIN (metadata_json);

CREATE INDEX IF NOT EXISTS idx_event_lineup_gin 
  ON event_embeddings USING GIN (lineup_json);

-- ============================================
-- 6. UTILITY FUNCTIONS
-- ============================================

-- Function to compute event embedding from lineup
CREATE OR REPLACE FUNCTION compute_event_embedding_from_lineup(
  p_lineup_artist_ids UUID[],
  p_headliner_weight FLOAT DEFAULT 0.6
)
RETURNS vector(1024)
LANGUAGE plpgsql
AS $$
DECLARE
  v_result FLOAT[];
  v_weights FLOAT[];
  v_total_weight FLOAT := 0;
  v_artist_embedding vector(1024);
  v_artist_array FLOAT[];
  v_num_artists INT;
  v_remaining_weight FLOAT;
  v_per_artist_weight FLOAT;
  i INT;
  j INT;
BEGIN
  v_num_artists := array_length(p_lineup_artist_ids, 1);
  
  IF v_num_artists IS NULL OR v_num_artists = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Initialize result array with zeros
  v_result := ARRAY_FILL(0::FLOAT, ARRAY[1536]);
  
  -- Calculate weights: headliner gets p_headliner_weight, rest split remaining
  v_remaining_weight := 1.0 - p_headliner_weight;
  
  FOR i IN 1..v_num_artists LOOP
    -- Get artist embedding
    SELECT embedding INTO v_artist_embedding
    FROM artist_embeddings
    WHERE id = p_lineup_artist_ids[i];
    
    IF v_artist_embedding IS NOT NULL THEN
      v_artist_array := v_artist_embedding::FLOAT[];
      
      -- Calculate weight for this position
      IF i = 1 THEN
        v_per_artist_weight := p_headliner_weight;
      ELSE
        v_per_artist_weight := v_remaining_weight / (v_num_artists - 1);
      END IF;
      
      v_total_weight := v_total_weight + v_per_artist_weight;
      
      -- Add weighted embedding
      FOR j IN 1..1536 LOOP
        v_result[j] := v_result[j] + v_per_artist_weight * v_artist_array[j];
      END LOOP;
    END IF;
  END LOOP;
  
  -- Normalize by total weight
  IF v_total_weight > 0 THEN
    FOR j IN 1..1536 LOOP
      v_result[j] := v_result[j] / v_total_weight;
    END LOOP;
  END IF;
  
  RETURN v_result::vector(1024);
END;
$$;

-- Function to batch-find artists by name
CREATE OR REPLACE FUNCTION find_artists_by_names(
  p_names TEXT[]
)
RETURNS TABLE(
  artist_id UUID,
  name TEXT,
  normalized_name TEXT,
  spotify_id TEXT,
  has_embedding BOOLEAN
)
LANGUAGE sql
AS $$
  SELECT 
    id as artist_id,
    name,
    normalized_name,
    spotify_id,
    (embedding IS NOT NULL) as has_embedding
  FROM artist_embeddings
  WHERE normalized_name = ANY(
    SELECT LOWER(TRIM(unnest(p_names)))
  );
$$;

-- ============================================
-- 7. GRANTS FOR SERVICE ROLE
-- ============================================

-- Ensure service role can manage embeddings
GRANT ALL ON artist_embeddings TO service_role;
GRANT ALL ON event_embeddings TO service_role;
GRANT ALL ON user_taste_embeddings TO service_role;
GRANT ALL ON festival_slot_embeddings TO service_role;
GRANT ALL ON embedding_anchors TO service_role;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION find_similar_artists TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_similar_events TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION calculate_user_effective_embedding TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_effective_embedding TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION find_events_for_user TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION compute_event_embedding_from_lineup TO service_role;
GRANT EXECUTE ON FUNCTION find_artists_by_names TO authenticated, service_role;
