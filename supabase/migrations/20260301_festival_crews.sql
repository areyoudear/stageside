-- Migration: Festival Crews (Group Planning)
-- Date: 2026-03-01
-- Description: Enables groups of friends to plan festival attendance together

-- ============================================
-- FESTIVAL CREWS TABLE
-- A crew is a group of friends attending a festival together
-- ============================================
CREATE TABLE IF NOT EXISTS festival_crews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  festival_id TEXT NOT NULL, -- References festival in festivals table
  name TEXT, -- Optional crew name ("The Squad", "Weekend 1 Crew")
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'), -- 12-char invite code
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_festival_crews_festival ON festival_crews(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_crews_invite ON festival_crews(invite_code);

-- ============================================
-- FESTIVAL CREW MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS festival_crew_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id UUID NOT NULL REFERENCES festival_crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crew_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_crew_members_crew ON festival_crew_members(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_user ON festival_crew_members(user_id);

-- ============================================
-- FESTIVAL ARTIST INTERESTS TABLE
-- Track which artists each user wants to see at a festival
-- ============================================
CREATE TABLE IF NOT EXISTS festival_artist_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  festival_id TEXT NOT NULL,
  artist_id TEXT NOT NULL, -- festival_artists.id or artist identifier
  artist_name TEXT NOT NULL, -- Denormalized for quick access
  interest_level TEXT NOT NULL DEFAULT 'interested' 
    CHECK (interest_level IN ('must-see', 'interested', 'maybe')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, festival_id, artist_id)
);

CREATE INDEX IF NOT EXISTS idx_artist_interests_user_festival 
  ON festival_artist_interests(user_id, festival_id);
CREATE INDEX IF NOT EXISTS idx_artist_interests_festival_artist 
  ON festival_artist_interests(festival_id, artist_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE festival_crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_artist_interests ENABLE ROW LEVEL SECURITY;

-- Festival crews: members can view
CREATE POLICY "Crew members can view crew" ON festival_crews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members 
      WHERE crew_id = festival_crews.id 
      AND user_id::text = auth.uid()::text
    )
  );

-- Anyone can create a crew
CREATE POLICY "Users can create crews" ON festival_crews
  FOR INSERT WITH CHECK (auth.uid()::text = created_by::text);

-- Admins can update crew
CREATE POLICY "Admins can update crew" ON festival_crews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members 
      WHERE crew_id = festival_crews.id 
      AND user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

-- Crew members: members can view all members
CREATE POLICY "Crew members can view members" ON festival_crew_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members fcm
      WHERE fcm.crew_id = festival_crew_members.crew_id 
      AND fcm.user_id::text = auth.uid()::text
    )
  );

-- Users can join crews (insert themselves)
CREATE POLICY "Users can join crews" ON festival_crew_members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can leave crews (delete themselves)
CREATE POLICY "Users can leave crews" ON festival_crew_members
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- Artist interests: users can manage their own
CREATE POLICY "Users can manage own artist interests" ON festival_artist_interests
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Artist interests: crew members can view each other's interests
CREATE POLICY "Crew members can view each others interests" ON festival_artist_interests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members fcm1
      JOIN festival_crew_members fcm2 ON fcm1.crew_id = fcm2.crew_id
      JOIN festival_crews fc ON fc.id = fcm1.crew_id
      WHERE fcm1.user_id::text = auth.uid()::text
      AND fcm2.user_id = festival_artist_interests.user_id
      AND fc.festival_id = festival_artist_interests.festival_id
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get crew members with their artist interests for a festival
CREATE OR REPLACE FUNCTION get_crew_artist_interests(p_crew_id UUID)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  username TEXT,
  avatar_url TEXT,
  artist_id TEXT,
  artist_name TEXT,
  interest_level TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.display_name,
    u.username,
    u.avatar_url,
    fai.artist_id,
    fai.artist_name,
    fai.interest_level
  FROM festival_crew_members fcm
  JOIN users u ON u.id = fcm.user_id
  JOIN festival_crews fc ON fc.id = fcm.crew_id
  LEFT JOIN festival_artist_interests fai 
    ON fai.user_id = u.id 
    AND fai.festival_id = fc.festival_id
  WHERE fcm.crew_id = p_crew_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get artist interest summary for a festival crew
CREATE OR REPLACE FUNCTION get_crew_artist_summary(p_crew_id UUID)
RETURNS TABLE (
  artist_id TEXT,
  artist_name TEXT,
  must_see_count INT,
  interested_count INT,
  maybe_count INT,
  total_interested INT,
  interested_users JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fai.artist_id,
    fai.artist_name,
    COUNT(*) FILTER (WHERE fai.interest_level = 'must-see')::INT as must_see_count,
    COUNT(*) FILTER (WHERE fai.interest_level = 'interested')::INT as interested_count,
    COUNT(*) FILTER (WHERE fai.interest_level = 'maybe')::INT as maybe_count,
    COUNT(*)::INT as total_interested,
    jsonb_agg(
      jsonb_build_object(
        'user_id', u.id,
        'display_name', u.display_name,
        'username', u.username,
        'avatar_url', u.avatar_url,
        'interest_level', fai.interest_level
      )
      ORDER BY 
        CASE fai.interest_level 
          WHEN 'must-see' THEN 1 
          WHEN 'interested' THEN 2 
          ELSE 3 
        END
    ) as interested_users
  FROM festival_crew_members fcm
  JOIN festival_crews fc ON fc.id = fcm.crew_id
  JOIN festival_artist_interests fai 
    ON fai.user_id = fcm.user_id 
    AND fai.festival_id = fc.festival_id
  JOIN users u ON u.id = fcm.user_id
  WHERE fcm.crew_id = p_crew_id
  GROUP BY fai.artist_id, fai.artist_name
  ORDER BY total_interested DESC, must_see_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
