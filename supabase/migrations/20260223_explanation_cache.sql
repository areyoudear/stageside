-- ============================================
-- EXPLANATION CACHE TABLE
-- ============================================
-- Caches LLM-generated match explanations
-- Explanations are for DISPLAY ONLY - never used for ranking

CREATE TABLE IF NOT EXISTS explanation_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Cache key for fast lookup
  cache_key TEXT UNIQUE NOT NULL,
  
  -- Reference data
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_id TEXT NOT NULL, -- Could be event_id, user_id, artist_id
  match_type TEXT NOT NULL CHECK (match_type IN ('event', 'buddy', 'artist')),
  
  -- The explanation
  explanation TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for cleanup
  CONSTRAINT explanation_cache_cache_key_unique UNIQUE (cache_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_explanation_cache_user ON explanation_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_explanation_cache_created ON explanation_cache(created_at);
CREATE INDEX IF NOT EXISTS idx_explanation_cache_type ON explanation_cache(match_type);

-- RLS
ALTER TABLE explanation_cache ENABLE ROW LEVEL SECURITY;

-- Users can only read their own explanations
CREATE POLICY "Users can read own explanations"
  ON explanation_cache FOR SELECT 
  USING (auth.uid() = user_id);

-- Cleanup function to remove old explanations (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_old_explanations()
RETURNS void AS $$
BEGIN
  DELETE FROM explanation_cache 
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
