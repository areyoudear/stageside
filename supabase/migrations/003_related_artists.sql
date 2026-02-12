-- Migration: Add user_related_artists table for improved matching
-- This stores related artists fetched from Spotify's Related Artists API
-- to enable "similar to [artist] you listen to" matching

-- Create the related artists table
CREATE TABLE IF NOT EXISTS user_related_artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  related_to TEXT NOT NULL,  -- The user's top artist this is related to
  popularity INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicates per user
  UNIQUE(user_id, artist_name)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_user_related_artists_user_id 
  ON user_related_artists(user_id);

-- Index for popularity-based sorting
CREATE INDEX IF NOT EXISTS idx_user_related_artists_popularity 
  ON user_related_artists(user_id, popularity DESC);

-- Enable RLS
ALTER TABLE user_related_artists ENABLE ROW LEVEL SECURITY;

-- Allow service role to manage all rows
CREATE POLICY "Service role can manage user_related_artists" ON user_related_artists
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Allow users to read their own related artists
CREATE POLICY "Users can read own related_artists" ON user_related_artists
  FOR SELECT
  USING (auth.uid()::text = user_id::text);
