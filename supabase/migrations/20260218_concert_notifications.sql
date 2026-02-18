-- Concert notification preferences table
-- Users can subscribe to get email notifications when new concerts match their filters

CREATE TABLE IF NOT EXISTS concert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Filter settings
  location_name TEXT NOT NULL,
  location_lat DOUBLE PRECISION NOT NULL,
  location_lng DOUBLE PRECISION NOT NULL,
  radius_miles INTEGER NOT NULL DEFAULT 50,
  
  -- Optional filters
  min_match_score INTEGER DEFAULT 0,
  status_filter TEXT DEFAULT 'all', -- 'all', 'interested', 'going', 'friends-interested', 'friends-going'
  
  -- Notification settings
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'instant'
  
  -- Tracking
  last_notified_at TIMESTAMPTZ,
  last_concert_ids JSONB DEFAULT '[]'::jsonb, -- Track which concerts we've already notified about
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One notification preference per user (can expand later if needed)
  UNIQUE(user_id)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_concert_notifications_user ON concert_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_concert_notifications_enabled ON concert_notifications(enabled) WHERE enabled = true;

-- Update trigger
CREATE OR REPLACE FUNCTION update_concert_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER concert_notifications_updated_at
  BEFORE UPDATE ON concert_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_concert_notifications_updated_at();

-- RLS policies
ALTER TABLE concert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON concert_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON concert_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON concert_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON concert_notifications FOR DELETE
  USING (auth.uid() = user_id);
