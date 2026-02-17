-- Migration: Social Features (Friends + Concert Interests)
-- Date: 2026-02-17

-- ============================================
-- FRIENDSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Index for fast friend lookups
CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id, status);

-- RLS for friendships
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Users can see friendships they're part of
CREATE POLICY "Users can view own friendships" ON friendships
  FOR SELECT USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = addressee_id::text
  );

-- Users can create friend requests
CREATE POLICY "Users can send friend requests" ON friendships
  FOR INSERT WITH CHECK (auth.uid()::text = requester_id::text);

-- Users can update friendships they received (accept/block)
CREATE POLICY "Users can respond to friend requests" ON friendships
  FOR UPDATE USING (auth.uid()::text = addressee_id::text);

-- Users can delete friendships they're part of
CREATE POLICY "Users can remove friendships" ON friendships
  FOR DELETE USING (
    auth.uid()::text = requester_id::text OR 
    auth.uid()::text = addressee_id::text
  );

-- ============================================
-- CONCERT INTERESTS TABLE (Interested/Going)
-- ============================================
CREATE TABLE IF NOT EXISTS concert_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concert_id TEXT NOT NULL, -- Ticketmaster event ID
  concert_data JSONB NOT NULL, -- Cached concert details (name, date, venue, artists, image)
  status TEXT NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, concert_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_concert_interests_user ON concert_interests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_concert_interests_concert ON concert_interests(concert_id);

-- RLS for concert interests
ALTER TABLE concert_interests ENABLE ROW LEVEL SECURITY;

-- Users can view their own interests
CREATE POLICY "Users can view own interests" ON concert_interests
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can view friends' interests
CREATE POLICY "Users can view friends interests" ON concert_interests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM friendships f
      WHERE f.status = 'accepted'
      AND (
        (f.requester_id::text = auth.uid()::text AND f.addressee_id = concert_interests.user_id) OR
        (f.addressee_id::text = auth.uid()::text AND f.requester_id = concert_interests.user_id)
      )
    )
  );

-- Users can manage their own interests
CREATE POLICY "Users can manage own interests" ON concert_interests
  FOR ALL USING (auth.uid()::text = user_id::text);

-- ============================================
-- UPDATE CONCERT GROUPS TO SUPPORT FRIENDS
-- ============================================
-- Add friend-based group creation support
ALTER TABLE concert_groups ADD COLUMN IF NOT EXISTS is_friends_group BOOLEAN DEFAULT false;

-- ============================================
-- HELPER FUNCTION: Get user's friends
-- ============================================
CREATE OR REPLACE FUNCTION get_user_friends(p_user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  friend_name TEXT,
  friend_username TEXT,
  friendship_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.requester_id = p_user_id THEN f.addressee_id 
      ELSE f.requester_id 
    END as friend_id,
    u.display_name as friend_name,
    u.username as friend_username,
    f.created_at as friendship_created_at
  FROM friendships f
  JOIN users u ON u.id = CASE 
    WHEN f.requester_id = p_user_id THEN f.addressee_id 
    ELSE f.requester_id 
  END
  WHERE f.status = 'accepted'
  AND (f.requester_id = p_user_id OR f.addressee_id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get friends interested in a concert
-- ============================================
CREATE OR REPLACE FUNCTION get_friends_interested_in_concert(p_user_id UUID, p_concert_id TEXT)
RETURNS TABLE (
  friend_id UUID,
  friend_name TEXT,
  friend_username TEXT,
  interest_status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.user_id as friend_id,
    u.display_name as friend_name,
    u.username as friend_username,
    ci.status as interest_status
  FROM concert_interests ci
  JOIN users u ON u.id = ci.user_id
  WHERE ci.concert_id = p_concert_id
  AND ci.user_id IN (
    SELECT CASE 
      WHEN f.requester_id = p_user_id THEN f.addressee_id 
      ELSE f.requester_id 
    END
    FROM friendships f
    WHERE f.status = 'accepted'
    AND (f.requester_id = p_user_id OR f.addressee_id = p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
