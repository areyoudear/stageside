-- ============================================
-- TASTE GRAPH EMBEDDING SYSTEM
-- ============================================
-- Unified embedding space for users, artists, events, festivals
-- All entities share same dimensionality for cosine similarity matching

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- ARTIST EMBEDDINGS
-- ============================================
CREATE TABLE IF NOT EXISTS artist_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Artist identifiers (can come from multiple sources)
  spotify_id TEXT,
  musicbrainz_id TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  
  -- The embedding vector (1536 dims for OpenAI, adjustable)
  embedding vector(1536),
  
  -- Structured metadata used to generate embedding
  metadata JSONB NOT NULL DEFAULT '{}',
  -- Contains: genres, related_artists, bio_summary, venue_types, 
  -- energy_level, crowd_intensity, production_scale, cultural_region
  
  -- Raw text that was embedded
  embedding_input TEXT,
  
  -- Versioning for embedding model changes
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  embedding_version INT DEFAULT 1,
  
  -- Cache management
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_embedded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(spotify_id),
  UNIQUE(normalized_name)
);

-- ============================================
-- EVENT EMBEDDINGS
-- ============================================
CREATE TABLE IF NOT EXISTS event_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Event identifiers
  external_id TEXT NOT NULL, -- Ticketmaster, Eventbrite, etc.
  source TEXT NOT NULL, -- 'ticketmaster', 'eventbrite', 'bandsintown', etc.
  
  -- Event details
  name TEXT NOT NULL,
  venue_name TEXT,
  city TEXT,
  date DATE,
  
  -- Lineup (ordered, first = headliner)
  lineup TEXT[] NOT NULL DEFAULT '{}',
  lineup_artist_ids UUID[] DEFAULT '{}', -- References to artist_embeddings
  
  -- The embedding vector (computed from artist embeddings)
  embedding vector(1536),
  
  -- How embedding was computed
  embedding_method TEXT DEFAULT 'weighted_average', -- 'weighted_average', 'headliner_only', etc.
  
  -- Versioning
  embedding_version INT DEFAULT 1,
  last_embedded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(external_id, source)
);

-- ============================================
-- USER TASTE EMBEDDINGS
-- ============================================
CREATE TABLE IF NOT EXISTS user_taste_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Core embedding: stable long-term taste
  core_embedding vector(1536),
  core_updated_at TIMESTAMP WITH TIME ZONE,
  
  -- Session embedding: short-term intent (decays over 24-72h)
  session_embedding vector(1536),
  session_updated_at TIMESTAMP WITH TIME ZONE,
  session_decay_hours INT DEFAULT 48,
  
  -- Onboarding source
  onboarding_type TEXT DEFAULT 'manual', -- 'spotify', 'apple_music', 'manual'
  onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Onboarding preferences (stored for recomputation)
  onboarding_data JSONB DEFAULT '{}',
  -- Contains: slider_values, liked_artists, cultural_preferences, etc.
  
  -- Versioning
  embedding_version INT DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================
-- FESTIVAL SLOT EMBEDDINGS
-- ============================================
CREATE TABLE IF NOT EXISTS festival_slot_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  festival_id UUID NOT NULL, -- References festivals table
  
  -- Slot details
  stage_name TEXT,
  day DATE,
  start_time TIME,
  end_time TIME,
  
  -- Artists in this slot
  artist_ids UUID[] DEFAULT '{}',
  
  -- The embedding vector
  embedding vector(1536),
  
  -- Versioning
  embedding_version INT DEFAULT 1,
  last_embedded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(festival_id, stage_name, day, start_time)
);

-- ============================================
-- ONBOARDING ANCHOR VECTORS
-- ============================================
-- Pre-computed vectors for onboarding sliders
CREATE TABLE IF NOT EXISTS embedding_anchors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  anchor_type TEXT NOT NULL, -- 'energy', 'crowd_size', 'exploration', 'vibe'
  anchor_name TEXT NOT NULL, -- 'low_energy', 'high_energy', 'intimate', 'festival', etc.
  
  -- The anchor vector
  embedding vector(1536) NOT NULL,
  
  -- Weight when combining with user embedding
  default_weight FLOAT DEFAULT 0.2,
  
  -- Description for debugging
  description TEXT,
  
  -- Versioning
  embedding_version INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(anchor_type, anchor_name)
);

-- ============================================
-- INDEXES FOR VECTOR SIMILARITY SEARCH
-- ============================================

-- IVFFlat indexes for fast approximate nearest neighbor search
-- Lists = sqrt(num_rows) as a starting point, tune based on data size

CREATE INDEX IF NOT EXISTS idx_artist_embeddings_vector 
  ON artist_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_event_embeddings_vector 
  ON event_embeddings 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_user_core_embedding_vector 
  ON user_taste_embeddings 
  USING ivfflat (core_embedding vector_cosine_ops)
  WITH (lists = 50);

-- Standard indexes
CREATE INDEX IF NOT EXISTS idx_artist_embeddings_normalized ON artist_embeddings(normalized_name);
CREATE INDEX IF NOT EXISTS idx_artist_embeddings_spotify ON artist_embeddings(spotify_id);
CREATE INDEX IF NOT EXISTS idx_event_embeddings_date ON event_embeddings(date);
CREATE INDEX IF NOT EXISTS idx_event_embeddings_city ON event_embeddings(city);
CREATE INDEX IF NOT EXISTS idx_festival_slots_festival ON festival_slot_embeddings(festival_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE artist_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_taste_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_slot_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_anchors ENABLE ROW LEVEL SECURITY;

-- Artist/event embeddings: readable by all authenticated users
CREATE POLICY "Authenticated users can read artist embeddings"
  ON artist_embeddings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read event embeddings"
  ON event_embeddings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read embedding anchors"
  ON embedding_anchors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read festival slot embeddings"
  ON festival_slot_embeddings FOR SELECT TO authenticated USING (true);

-- User embeddings: only own data
CREATE POLICY "Users can read own taste embedding"
  ON user_taste_embeddings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own taste embedding"
  ON user_taste_embeddings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own taste embedding"
  ON user_taste_embeddings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to compute effective user embedding (core + session with decay)
CREATE OR REPLACE FUNCTION get_effective_user_embedding(
  p_user_id UUID,
  p_session_weight FLOAT DEFAULT 0.3
)
RETURNS vector(1536)
LANGUAGE plpgsql
AS $$
DECLARE
  v_core vector(1536);
  v_session vector(1536);
  v_session_age_hours FLOAT;
  v_decay_hours INT;
  v_actual_session_weight FLOAT;
BEGIN
  SELECT 
    core_embedding,
    session_embedding,
    EXTRACT(EPOCH FROM (NOW() - session_updated_at)) / 3600,
    session_decay_hours
  INTO v_core, v_session, v_session_age_hours, v_decay_hours
  FROM user_taste_embeddings
  WHERE user_id = p_user_id;
  
  -- If no session or session too old, return core only
  IF v_session IS NULL OR v_session_age_hours > v_decay_hours THEN
    RETURN v_core;
  END IF;
  
  -- Exponential decay of session weight
  v_actual_session_weight := p_session_weight * EXP(-v_session_age_hours / v_decay_hours);
  
  -- Weighted combination (simplified - proper vector math in application layer)
  -- This is a placeholder; actual implementation uses application-level vector ops
  RETURN v_core;
END;
$$;

-- Function to find similar artists
CREATE OR REPLACE FUNCTION find_similar_artists(
  p_embedding vector(1536),
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  artist_id UUID,
  name TEXT,
  similarity FLOAT
)
LANGUAGE sql
AS $$
  SELECT 
    id as artist_id,
    name,
    1 - (embedding <=> p_embedding) as similarity
  FROM artist_embeddings
  WHERE embedding IS NOT NULL
  ORDER BY embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- Function to find matching events for a user
CREATE OR REPLACE FUNCTION find_matching_events(
  p_user_id UUID,
  p_city TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE + INTERVAL '90 days',
  p_limit INT DEFAULT 50
)
RETURNS TABLE(
  event_id UUID,
  name TEXT,
  venue_name TEXT,
  city TEXT,
  date DATE,
  lineup TEXT[],
  similarity FLOAT
)
LANGUAGE sql
AS $$
  WITH user_emb AS (
    SELECT core_embedding as embedding
    FROM user_taste_embeddings
    WHERE user_id = p_user_id
  )
  SELECT 
    e.id as event_id,
    e.name,
    e.venue_name,
    e.city,
    e.date,
    e.lineup,
    1 - (e.embedding <=> u.embedding) as similarity
  FROM event_embeddings e
  CROSS JOIN user_emb u
  WHERE e.embedding IS NOT NULL
    AND e.date >= p_date_from
    AND e.date <= p_date_to
    AND (p_city IS NULL OR e.city ILIKE '%' || p_city || '%')
  ORDER BY e.embedding <=> u.embedding
  LIMIT p_limit;
$$;
