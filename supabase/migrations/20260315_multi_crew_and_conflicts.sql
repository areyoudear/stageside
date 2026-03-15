-- Migration: Multi-Crew Support and Conflict Detection
-- Date: 2026-03-15
-- Description: Enable multiple crews per festival and add conflict tracking

-- ============================================
-- No schema changes needed - the existing schema already supports
-- multiple crews per user per festival. The restriction was in app logic.
-- ============================================

-- Add a view for detecting schedule conflicts within a crew
CREATE OR REPLACE VIEW crew_schedule_conflicts AS
SELECT 
  fcm.crew_id,
  fc.festival_id,
  fa1.id as artist1_id,
  fa1.artist_name as artist1_name,
  fa1.day as conflict_day,
  fa1.stage as artist1_stage,
  fa1.start_time as artist1_start,
  fa1.end_time as artist1_end,
  fa2.id as artist2_id,
  fa2.artist_name as artist2_name,
  fa2.stage as artist2_stage,
  fa2.start_time as artist2_start,
  fa2.end_time as artist2_end,
  array_agg(DISTINCT u.display_name) as conflicting_members
FROM festival_crew_members fcm
JOIN festival_crews fc ON fc.id = fcm.crew_id
JOIN festival_artist_interests fai1 ON fai1.user_id = fcm.user_id AND fai1.festival_id = fc.festival_id
JOIN festival_artist_interests fai2 ON fai2.user_id = fcm.user_id AND fai2.festival_id = fc.festival_id
JOIN festival_artists fa1 ON fa1.id = fai1.artist_id
JOIN festival_artists fa2 ON fa2.id = fai2.artist_id
JOIN users u ON u.id = fcm.user_id
WHERE fa1.id < fa2.id  -- Prevent duplicates
  AND fa1.day = fa2.day  -- Same day
  AND fa1.start_time IS NOT NULL
  AND fa2.start_time IS NOT NULL
  -- Time overlap: start1 < end2 AND start2 < end1
  AND fa1.start_time < fa2.end_time
  AND fa2.start_time < fa1.end_time
GROUP BY 
  fcm.crew_id, fc.festival_id,
  fa1.id, fa1.artist_name, fa1.day, fa1.stage, fa1.start_time, fa1.end_time,
  fa2.id, fa2.artist_name, fa2.stage, fa2.start_time, fa2.end_time;

-- Function to get conflicts for a specific crew
CREATE OR REPLACE FUNCTION get_crew_conflicts(p_crew_id UUID)
RETURNS TABLE (
  artist1_id TEXT,
  artist1_name TEXT,
  artist1_stage TEXT,
  artist1_start TIME,
  artist1_end TIME,
  artist2_id TEXT,
  artist2_name TEXT,
  artist2_stage TEXT,
  artist2_start TIME,
  artist2_end TIME,
  conflict_day TEXT,
  affected_members TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    csc.artist1_id,
    csc.artist1_name,
    csc.artist1_stage,
    csc.artist1_start,
    csc.artist1_end,
    csc.artist2_id,
    csc.artist2_name,
    csc.artist2_stage,
    csc.artist2_start,
    csc.artist2_end,
    csc.conflict_day,
    csc.conflicting_members
  FROM crew_schedule_conflicts csc
  WHERE csc.crew_id = p_crew_id
  ORDER BY csc.conflict_day, csc.artist1_start;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
