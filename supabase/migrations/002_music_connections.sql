-- Migration: Add support for multiple music service connections
-- Run this after your initial schema migration

-- ============================================
-- USER MUSIC CONNECTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_music_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('spotify', 'apple_music', 'youtube_music', 'tidal', 'deezer')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  service_user_id TEXT,
  service_username TEXT,
  is_active BOOLEAN DEFAULT true,
  error TEXT,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ,
  
  -- Ensure one connection per user per service
  UNIQUE(user_id, service)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_music_connections_user ON user_music_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_music_connections_service ON user_music_connections(service);
CREATE INDEX IF NOT EXISTS idx_music_connections_active ON user_music_connections(user_id) WHERE is_active = true;

-- ============================================
-- USER ARTISTS TABLE (AGGREGATED)
-- ============================================

CREATE TABLE IF NOT EXISTS user_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  source_services TEXT[] NOT NULL DEFAULT '{}',
  aggregated_score NUMERIC NOT NULL DEFAULT 0,
  genres TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  source_ids JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one entry per artist per user
  UNIQUE(user_id, normalized_name)
);

-- Indexes for artist lookups
CREATE INDEX IF NOT EXISTS idx_user_artists_user ON user_artists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_artists_name ON user_artists(normalized_name);
CREATE INDEX IF NOT EXISTS idx_user_artists_score ON user_artists(user_id, aggregated_score DESC);

-- GIN index for searching artists by name
CREATE INDEX IF NOT EXISTS idx_user_artists_name_search ON user_artists USING GIN (to_tsvector('english', artist_name));

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS
ALTER TABLE user_music_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_artists ENABLE ROW LEVEL SECURITY;

-- Policies for user_music_connections
CREATE POLICY "Users can view own connections" ON user_music_connections
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own connections" ON user_music_connections
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own connections" ON user_music_connections
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own connections" ON user_music_connections
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access connections" ON user_music_connections
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Policies for user_artists
CREATE POLICY "Users can view own artists" ON user_artists
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own artists" ON user_artists
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own artists" ON user_artists
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own artists" ON user_artists
  FOR DELETE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role full access artists" ON user_artists
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get active services for a user
CREATE OR REPLACE FUNCTION get_active_music_services(p_user_id UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(array_agg(service), '{}')
  FROM user_music_connections
  WHERE user_id = p_user_id AND is_active = true AND error IS NULL;
$$ LANGUAGE SQL STABLE;

-- Function to check if user has any active connection
CREATE OR REPLACE FUNCTION has_music_connection(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_music_connections
    WHERE user_id = p_user_id AND is_active = true AND error IS NULL
  );
$$ LANGUAGE SQL STABLE;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE user_music_connections IS 'Stores OAuth connections to various music streaming services';
COMMENT ON TABLE user_artists IS 'Aggregated artist data from all connected music services';

COMMENT ON COLUMN user_music_connections.service IS 'Music service identifier: spotify, apple_music, youtube_music, tidal, deezer';
COMMENT ON COLUMN user_music_connections.error IS 'Last error message if connection failed';
COMMENT ON COLUMN user_music_connections.last_synced IS 'When artist data was last synced from this service';

COMMENT ON COLUMN user_artists.normalized_name IS 'Lowercase, cleaned version of artist name for deduplication';
COMMENT ON COLUMN user_artists.aggregated_score IS 'Combined relevance score from all services';
COMMENT ON COLUMN user_artists.source_services IS 'Array of services that reported this artist';
COMMENT ON COLUMN user_artists.source_ids IS 'JSON object mapping service to artist ID in that service';
