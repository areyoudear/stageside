-- Migration: Crew Meetups (Saved meetup points)
-- Date: 2026-03-02
-- Description: Allows crews to save agreed-upon meetup points during schedule conflicts

-- ============================================
-- CREW MEETUPS TABLE
-- Stores crew-agreed meetup times/locations
-- ============================================
CREATE TABLE IF NOT EXISTS festival_crew_meetups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  crew_id UUID NOT NULL REFERENCES festival_crews(id) ON DELETE CASCADE,
  festival_id TEXT NOT NULL,
  
  -- When and where to meet
  day TEXT NOT NULL,
  time TEXT NOT NULL, -- "14:30" format
  location TEXT, -- Stage name, food court, etc.
  
  -- Context (what prompted this meetup)
  context_type TEXT NOT NULL DEFAULT 'conflict' 
    CHECK (context_type IN ('conflict', 'manual', 'break')),
  context_artist_ids TEXT[], -- Related artists if it's a conflict meetup
  
  -- Notes
  note TEXT, -- "Meet at the ferris wheel!"
  
  -- Who created it
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crew_meetups_crew ON festival_crew_meetups(crew_id);
CREATE INDEX IF NOT EXISTS idx_crew_meetups_festival ON festival_crew_meetups(festival_id);
CREATE INDEX IF NOT EXISTS idx_crew_meetups_day ON festival_crew_meetups(day);

-- ============================================
-- MEETUP ACKNOWLEDGEMENTS TABLE
-- Track who has seen/acknowledged meetup points
-- ============================================
CREATE TABLE IF NOT EXISTS festival_crew_meetup_acks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meetup_id UUID NOT NULL REFERENCES festival_crew_meetups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meetup_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_meetup_acks_meetup ON festival_crew_meetup_acks(meetup_id);
CREATE INDEX IF NOT EXISTS idx_meetup_acks_user ON festival_crew_meetup_acks(user_id);

-- ============================================
-- SCHEDULE DROP NOTIFICATIONS TABLE
-- Track when festival schedules are released
-- ============================================
CREATE TABLE IF NOT EXISTS festival_schedule_drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  festival_id TEXT NOT NULL UNIQUE,
  dropped_at TIMESTAMPTZ DEFAULT NOW(),
  notified_crews UUID[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_schedule_drops_festival ON festival_schedule_drops(festival_id);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE festival_crew_meetups ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_crew_meetup_acks ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_schedule_drops ENABLE ROW LEVEL SECURITY;

-- Crew meetups: members can view
CREATE POLICY "Crew members can view meetups" ON festival_crew_meetups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members 
      WHERE crew_id = festival_crew_meetups.crew_id 
      AND user_id::text = auth.uid()::text
    )
  );

-- Crew members can create meetups
CREATE POLICY "Crew members can create meetups" ON festival_crew_meetups
  FOR INSERT WITH CHECK (
    auth.uid()::text = created_by::text AND
    EXISTS (
      SELECT 1 FROM festival_crew_members 
      WHERE crew_id = festival_crew_meetups.crew_id 
      AND user_id::text = auth.uid()::text
    )
  );

-- Admins can update/delete meetups
CREATE POLICY "Admins can update meetups" ON festival_crew_meetups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members 
      WHERE crew_id = festival_crew_meetups.crew_id 
      AND user_id::text = auth.uid()::text
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete meetups" ON festival_crew_meetups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM festival_crew_members 
      WHERE crew_id = festival_crew_meetups.crew_id 
      AND user_id::text = auth.uid()::text
      AND role = 'admin'
    )
    OR auth.uid()::text = created_by::text
  );

-- Meetup acks: users can manage their own
CREATE POLICY "Users can manage own acks" ON festival_crew_meetup_acks
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Schedule drops: anyone can read
CREATE POLICY "Anyone can read schedule drops" ON festival_schedule_drops
  FOR SELECT USING (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get all meetups for a crew with ack status
CREATE OR REPLACE FUNCTION get_crew_meetups_with_status(
  p_crew_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  id UUID,
  day TEXT,
  time TEXT,
  location TEXT,
  context_type TEXT,
  note TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ,
  acknowledged BOOLEAN,
  ack_count INT,
  crew_size INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.day,
    m.time,
    m.location,
    m.context_type,
    m.note,
    u.display_name as created_by_name,
    m.created_at,
    EXISTS (
      SELECT 1 FROM festival_crew_meetup_acks a 
      WHERE a.meetup_id = m.id AND a.user_id = p_user_id
    ) as acknowledged,
    (SELECT COUNT(*)::INT FROM festival_crew_meetup_acks WHERE meetup_id = m.id) as ack_count,
    (SELECT COUNT(*)::INT FROM festival_crew_members WHERE crew_id = p_crew_id) as crew_size
  FROM festival_crew_meetups m
  JOIN users u ON u.id = m.created_by
  WHERE m.crew_id = p_crew_id
  ORDER BY m.day, m.time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
