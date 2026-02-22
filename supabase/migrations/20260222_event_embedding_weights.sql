-- ============================================
-- EVENT EMBEDDING WEIGHTS & CACHING
-- ============================================
-- Add support for:
-- - lineup_hash: For smart cache invalidation (only recompute if lineup changes)
-- - headliner_weight / support_weight: Store the weights used for multi-artist events

-- Add lineup hash for change detection
ALTER TABLE event_embeddings 
ADD COLUMN IF NOT EXISTS lineup_hash TEXT;

-- Add weights for multi-artist events (0.6 headliner, 0.4 support average)
ALTER TABLE event_embeddings 
ADD COLUMN IF NOT EXISTS headliner_weight FLOAT DEFAULT 0.6;

ALTER TABLE event_embeddings 
ADD COLUMN IF NOT EXISTS support_weight FLOAT DEFAULT 0.4;

-- Index on lineup_hash for quick lookups
CREATE INDEX IF NOT EXISTS idx_event_embeddings_lineup_hash 
ON event_embeddings(lineup_hash);

-- ============================================
-- FUNCTION: Find matching events with embedding parameter
-- ============================================
-- This version accepts embedding directly instead of user_id
-- More flexible for API usage

CREATE OR REPLACE FUNCTION find_matching_events_by_embedding(
  p_user_embedding vector(1024),
  p_city TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE + INTERVAL '90 days',
  p_limit INT DEFAULT 50
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
  similarity FLOAT
)
LANGUAGE sql
AS $$
  SELECT 
    e.id as event_id,
    e.external_id,
    e.source,
    e.name,
    e.venue_name,
    e.city,
    e.date,
    e.lineup,
    1 - (e.embedding <=> p_user_embedding) as similarity
  FROM event_embeddings e
  WHERE e.embedding IS NOT NULL
    AND e.date >= p_date_from
    AND e.date <= p_date_to
    AND (p_city IS NULL OR e.city ILIKE '%' || p_city || '%')
  ORDER BY e.embedding <=> p_user_embedding
  LIMIT p_limit;
$$;

-- ============================================
-- FUNCTION: Get events needing embedding
-- ============================================
-- Returns events that have no embedding or outdated embedding

CREATE OR REPLACE FUNCTION get_events_needing_embedding(
  p_limit INT DEFAULT 100
)
RETURNS TABLE(
  event_id UUID,
  external_id TEXT,
  source TEXT,
  name TEXT,
  lineup TEXT[],
  has_embedding BOOLEAN,
  last_embedded_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
AS $$
  SELECT 
    id as event_id,
    external_id,
    source,
    name,
    lineup,
    embedding IS NOT NULL as has_embedding,
    last_embedded_at
  FROM event_embeddings
  WHERE embedding IS NULL 
     OR last_embedded_at < NOW() - INTERVAL '30 days'
  ORDER BY 
    CASE WHEN embedding IS NULL THEN 0 ELSE 1 END,
    last_embedded_at ASC NULLS FIRST
  LIMIT p_limit;
$$;

-- Comment on columns
COMMENT ON COLUMN event_embeddings.lineup_hash IS 'Hash of normalized lineup for change detection';
COMMENT ON COLUMN event_embeddings.headliner_weight IS 'Weight given to headliner in multi-artist events (default 0.6)';
COMMENT ON COLUMN event_embeddings.support_weight IS 'Weight given to support acts average in multi-artist events (default 0.4)';
