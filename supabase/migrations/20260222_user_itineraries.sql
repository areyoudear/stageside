-- User Festival Itineraries
-- Stores user's saved/customized itineraries for festivals

CREATE TABLE user_festival_itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  itinerary JSONB NOT NULL,  -- The full GeneratedItinerary object
  settings JSONB,             -- maxPerDay, restBreak, includeDiscoveries, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, festival_id)
);

-- Index for efficient user lookups
CREATE INDEX idx_user_itineraries_user ON user_festival_itineraries(user_id);

-- Index for efficient festival lookups
CREATE INDEX idx_user_itineraries_festival ON user_festival_itineraries(festival_id);

-- Enable Row Level Security
ALTER TABLE user_festival_itineraries ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own itineraries
CREATE POLICY "Users can manage own itineraries" ON user_festival_itineraries
  FOR ALL USING (auth.uid()::text = user_id::text);

-- Service role can do everything (for API routes using admin client)
CREATE POLICY "Service role full access" ON user_festival_itineraries
  FOR ALL USING (true) WITH CHECK (true);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_itinerary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER update_user_festival_itineraries_updated_at
  BEFORE UPDATE ON user_festival_itineraries
  FOR EACH ROW
  EXECUTE FUNCTION update_itinerary_updated_at();
