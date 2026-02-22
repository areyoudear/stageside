-- Audio Profile System for V3 Matching Algorithm
-- Enables audio feature-based matching between users and concert artists

-- User audio profiles (computed from their top tracks)
CREATE TABLE IF NOT EXISTS user_audio_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Average audio features from user's top tracks
  avg_danceability FLOAT,
  avg_energy FLOAT,
  avg_valence FLOAT,
  avg_tempo FLOAT,
  avg_acousticness FLOAT,
  avg_instrumentalness FLOAT,
  avg_liveness FLOAT,
  avg_speechiness FLOAT,
  
  -- Feature ranges (captures taste breadth)
  energy_range JSONB,       -- [min, max]
  tempo_range JSONB,        -- [min, max]
  valence_range JSONB,      -- [min, max]
  
  -- Metadata
  track_count INT,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Artist audio profiles (cached for concert matching)
CREATE TABLE IF NOT EXISTS artist_audio_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spotify_id TEXT UNIQUE,
  artist_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  
  -- Average audio features from artist's top tracks
  avg_energy FLOAT,
  avg_valence FLOAT,
  avg_tempo FLOAT,
  avg_danceability FLOAT,
  avg_acousticness FLOAT,
  avg_instrumentalness FLOAT,
  avg_liveness FLOAT,
  avg_speechiness FLOAT,
  
  -- Preview track info (for audio previews in UI)
  top_track_id TEXT,
  top_track_name TEXT,
  top_track_preview_url TEXT,
  highlight_start_ms INT DEFAULT 30000,  -- Start at 30s by default (skip intro)
  
  -- Artist metadata
  genres TEXT[],
  popularity INT,
  
  -- Cache management
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast artist lookups by normalized name
CREATE INDEX IF NOT EXISTS idx_artist_audio_normalized ON artist_audio_profiles(normalized_name);

-- Index for cache staleness checks
CREATE INDEX IF NOT EXISTS idx_artist_audio_computed_at ON artist_audio_profiles(computed_at);

-- Index for user profile lookups
CREATE INDEX IF NOT EXISTS idx_user_audio_user_id ON user_audio_profiles(user_id);

-- Enable RLS
ALTER TABLE user_audio_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_audio_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own audio profile
CREATE POLICY "Users can read own audio profile"
  ON user_audio_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audio profile"
  ON user_audio_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own audio profile"
  ON user_audio_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Artist profiles are readable by all authenticated users (cached data)
CREATE POLICY "Authenticated users can read artist profiles"
  ON artist_audio_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Only the system can write artist profiles (via service role)
-- This is handled by not creating INSERT/UPDATE policies for regular users
