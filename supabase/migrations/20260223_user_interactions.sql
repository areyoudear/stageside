-- ============================================
-- USER INTERACTIONS TABLE
-- ============================================
-- Tracks user interactions for session embedding computation
-- Interactions decay over time (24-72h configurable)

CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- User reference
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- What was interacted with
  entity_type TEXT NOT NULL, -- 'artist', 'event', 'festival'
  entity_id TEXT NOT NULL,
  entity_name TEXT, -- Denormalized for embedding lookup without joins
  
  -- Type of interaction
  interaction_type TEXT NOT NULL,
  -- Valid types: click, view, save, purchase, share, browse, search, dismiss
  
  -- Optional metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_entity_type CHECK (
    entity_type IN ('artist', 'event', 'festival')
  ),
  CONSTRAINT valid_interaction_type CHECK (
    interaction_type IN ('click', 'view', 'save', 'purchase', 'share', 'browse', 'search', 'dismiss')
  )
);

-- ============================================
-- INDEXES
-- ============================================

-- Primary lookup: user + recent time
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_time 
  ON user_interactions(user_id, created_at DESC);

-- For cleanup jobs
CREATE INDEX IF NOT EXISTS idx_user_interactions_created 
  ON user_interactions(created_at);

-- For analytics
CREATE INDEX IF NOT EXISTS idx_user_interactions_entity 
  ON user_interactions(entity_type, entity_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own interactions
CREATE POLICY "Users can read own interactions"
  ON user_interactions FOR SELECT 
  USING (auth.uid() = user_id);

-- Users can insert their own interactions
CREATE POLICY "Users can insert own interactions"
  ON user_interactions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Service role can do anything (for background jobs)
CREATE POLICY "Service role has full access"
  ON user_interactions 
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- CLEANUP FUNCTION
-- ============================================
-- Called periodically to remove old interactions

CREATE OR REPLACE FUNCTION cleanup_old_interactions(
  retention_days INT DEFAULT 30
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  WITH deleted AS (
    DELETE FROM user_interactions
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$;

-- ============================================
-- HELPER: GET USER SESSION STATS
-- ============================================

CREATE OR REPLACE FUNCTION get_user_session_stats(
  p_user_id UUID,
  p_hours_back INT DEFAULT 48
)
RETURNS TABLE(
  interaction_type TEXT,
  count BIGINT,
  latest_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    interaction_type,
    COUNT(*) as count,
    MAX(created_at) as latest_at
  FROM user_interactions
  WHERE user_id = p_user_id
    AND created_at > NOW() - (p_hours_back || ' hours')::INTERVAL
  GROUP BY interaction_type
  ORDER BY count DESC;
$$;
