-- ============================================
-- VECTOR SEARCH FUNCTIONS
-- ============================================
-- Optimized similarity search using pgvector

-- Function to find matching events with location and date filters
-- Uses pgvector's efficient cosine similarity
CREATE OR REPLACE FUNCTION find_matching_events_v2(
  p_user_embedding vector(1536),
  p_city TEXT DEFAULT NULL,
  p_date_from DATE DEFAULT CURRENT_DATE,
  p_date_to DATE DEFAULT CURRENT_DATE + INTERVAL '90 days',
  p_limit INT DEFAULT 50,
  p_min_similarity FLOAT DEFAULT 0.3
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
STABLE
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
    AND 1 - (e.embedding <=> p_user_embedding) >= p_min_similarity
  ORDER BY e.embedding <=> p_user_embedding
  LIMIT p_limit;
$$;

-- Function to find similar artists with better performance
CREATE OR REPLACE FUNCTION find_similar_artists_v2(
  p_embedding vector(1536),
  p_limit INT DEFAULT 20,
  p_exclude_name TEXT DEFAULT NULL,
  p_min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  artist_id UUID,
  name TEXT,
  spotify_id TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    a.id as artist_id,
    a.name,
    a.spotify_id,
    a.metadata,
    1 - (a.embedding <=> p_embedding) as similarity
  FROM artist_embeddings a
  WHERE a.embedding IS NOT NULL
    AND (p_exclude_name IS NULL OR a.normalized_name != LOWER(p_exclude_name))
    AND 1 - (a.embedding <=> p_embedding) >= p_min_similarity
  ORDER BY a.embedding <=> p_embedding
  LIMIT p_limit;
$$;

-- Function to find potential buddies based on embedding similarity
CREATE OR REPLACE FUNCTION find_similar_users(
  p_user_id UUID,
  p_limit INT DEFAULT 50,
  p_min_similarity FLOAT DEFAULT 0.3
)
RETURNS TABLE(
  user_id UUID,
  similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  WITH current_user_embedding AS (
    SELECT core_embedding
    FROM user_taste_embeddings
    WHERE user_id = p_user_id
  )
  SELECT 
    t.user_id,
    1 - (t.core_embedding <=> c.core_embedding) as similarity
  FROM user_taste_embeddings t
  CROSS JOIN current_user_embedding c
  WHERE t.user_id != p_user_id
    AND t.core_embedding IS NOT NULL
    AND 1 - (t.core_embedding <=> c.core_embedding) >= p_min_similarity
  ORDER BY t.core_embedding <=> c.core_embedding
  LIMIT p_limit;
$$;

-- Function to get users who saved a specific event, ranked by taste similarity
CREATE OR REPLACE FUNCTION find_event_buddies(
  p_user_id UUID,
  p_event_id TEXT,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  taste_similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
  WITH requesting_user AS (
    SELECT core_embedding
    FROM user_taste_embeddings
    WHERE user_id = p_user_id
  ),
  event_savers AS (
    SELECT DISTINCT sc.user_id
    FROM saved_concerts sc
    WHERE sc.concert_id = p_event_id
      AND sc.user_id != p_user_id
  )
  SELECT 
    es.user_id,
    u.display_name,
    CASE 
      WHEN t.core_embedding IS NOT NULL AND ru.core_embedding IS NOT NULL 
      THEN 1 - (t.core_embedding <=> ru.core_embedding)
      ELSE 0
    END as taste_similarity
  FROM event_savers es
  JOIN users u ON u.id = es.user_id
  LEFT JOIN user_taste_embeddings t ON t.user_id = es.user_id
  CROSS JOIN requesting_user ru
  ORDER BY 
    CASE 
      WHEN t.core_embedding IS NOT NULL AND ru.core_embedding IS NOT NULL 
      THEN t.core_embedding <=> ru.core_embedding
      ELSE 999
    END
  LIMIT p_limit;
$$;

-- Function to compute shared events between two users
CREATE OR REPLACE FUNCTION get_shared_events(
  p_user_id_1 UUID,
  p_user_id_2 UUID
)
RETURNS TABLE(
  concert_id TEXT,
  both_saved BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    sc1.concert_id,
    TRUE as both_saved
  FROM saved_concerts sc1
  INNER JOIN saved_concerts sc2 
    ON sc1.concert_id = sc2.concert_id
  WHERE sc1.user_id = p_user_id_1
    AND sc2.user_id = p_user_id_2;
$$;
