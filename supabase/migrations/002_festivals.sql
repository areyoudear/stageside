-- Festival Planner Feature Database Schema
-- Migration: 002_festivals
-- Description: Add tables for festival planning feature

-- ============================================
-- FESTIVALS TABLE
-- Stores festival information
-- ============================================

CREATE TABLE IF NOT EXISTS festivals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  location JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"city": "Indio", "state": "CA", "country": "US", "venue": "Empire Polo Club"}
  dates JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example: {"start": "2026-04-10", "end": "2026-04-12", "year": 2026}
  genres TEXT[] DEFAULT '{}',
  website_url TEXT,
  ticket_url TEXT,
  image_url TEXT,
  description TEXT,
  capacity TEXT CHECK (capacity IN ('small', 'medium', 'large', 'massive')),
  camping BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for festivals
CREATE INDEX IF NOT EXISTS idx_festivals_slug ON festivals(slug);
CREATE INDEX IF NOT EXISTS idx_festivals_dates ON festivals USING GIN (dates);
CREATE INDEX IF NOT EXISTS idx_festivals_genres ON festivals USING GIN (genres);

-- ============================================
-- FESTIVAL ARTISTS TABLE
-- Stores lineup information for each festival
-- ============================================

CREATE TABLE IF NOT EXISTS festival_artists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  day TEXT, -- "Friday", "Saturday", etc.
  stage TEXT,
  start_time TEXT, -- "14:00" format
  end_time TEXT, -- "15:30" format
  set_length_minutes INTEGER,
  headliner BOOLEAN DEFAULT false,
  spotify_id TEXT,
  image_url TEXT,
  genres TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for festival_artists
CREATE INDEX IF NOT EXISTS idx_festival_artists_festival ON festival_artists(festival_id);
CREATE INDEX IF NOT EXISTS idx_festival_artists_normalized ON festival_artists(normalized_name);
CREATE INDEX IF NOT EXISTS idx_festival_artists_day ON festival_artists(day);
CREATE INDEX IF NOT EXISTS idx_festival_artists_spotify ON festival_artists(spotify_id);

-- ============================================
-- USER FESTIVAL AGENDAS TABLE
-- Stores user's personal schedule for each festival
-- ============================================

CREATE TABLE IF NOT EXISTS user_festival_agendas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  festival_id UUID NOT NULL REFERENCES festivals(id) ON DELETE CASCADE,
  artist_ids UUID[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, festival_id)
);

-- Indexes for user_festival_agendas
CREATE INDEX IF NOT EXISTS idx_user_agendas_user ON user_festival_agendas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agendas_festival ON user_festival_agendas(festival_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE festivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE festival_artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_festival_agendas ENABLE ROW LEVEL SECURITY;

-- Festivals: Anyone can read
CREATE POLICY "Festivals are viewable by everyone" ON festivals
  FOR SELECT USING (true);

-- Festival Artists: Anyone can read
CREATE POLICY "Festival artists are viewable by everyone" ON festival_artists
  FOR SELECT USING (true);

-- User Agendas: Users can only see/modify their own
CREATE POLICY "Users can view their own agendas" ON user_festival_agendas
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert their own agendas" ON user_festival_agendas
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update their own agendas" ON user_festival_agendas
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete their own agendas" ON user_festival_agendas
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- ============================================
-- SEED DATA: Popular Festivals
-- ============================================

-- Coachella
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Coachella Valley Music and Arts Festival',
  'coachella',
  '{"city": "Indio", "state": "CA", "country": "US", "venue": "Empire Polo Club"}',
  '{"start": "2026-04-10", "end": "2026-04-12", "year": 2026}',
  ARRAY['Electronic', 'Indie', 'Pop', 'Hip-Hop', 'Rock'],
  'https://coachella.com',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800',
  'massive',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Bonnaroo
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Bonnaroo Music & Arts Festival',
  'bonnaroo',
  '{"city": "Manchester", "state": "TN", "country": "US", "venue": "Great Stage Park"}',
  '{"start": "2026-06-11", "end": "2026-06-14", "year": 2026}',
  ARRAY['Rock', 'Indie', 'Electronic', 'Hip-Hop', 'Folk'],
  'https://bonnaroo.com',
  'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
  'large',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Lollapalooza
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Lollapalooza',
  'lollapalooza',
  '{"city": "Chicago", "state": "IL", "country": "US", "venue": "Grant Park"}',
  '{"start": "2026-07-30", "end": "2026-08-02", "year": 2026}',
  ARRAY['Rock', 'Pop', 'Electronic', 'Hip-Hop', 'Alternative'],
  'https://lollapalooza.com',
  'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800',
  'massive',
  false
) ON CONFLICT (slug) DO NOTHING;

-- Outside Lands
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Outside Lands Music and Arts Festival',
  'outside-lands',
  '{"city": "San Francisco", "state": "CA", "country": "US", "venue": "Golden Gate Park"}',
  '{"start": "2026-08-07", "end": "2026-08-09", "year": 2026}',
  ARRAY['Indie', 'Rock', 'Electronic', 'Pop', 'Hip-Hop'],
  'https://sfoutsidelands.com',
  'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800',
  'large',
  false
) ON CONFLICT (slug) DO NOTHING;

-- Austin City Limits
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Austin City Limits Music Festival',
  'acl',
  '{"city": "Austin", "state": "TX", "country": "US", "venue": "Zilker Park"}',
  '{"start": "2026-10-02", "end": "2026-10-04", "year": 2026}',
  ARRAY['Rock', 'Country', 'Indie', 'Hip-Hop', 'Electronic'],
  'https://aclfestival.com',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800',
  'large',
  false
) ON CONFLICT (slug) DO NOTHING;

-- Electric Daisy Carnival
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Electric Daisy Carnival Las Vegas',
  'edc-vegas',
  '{"city": "Las Vegas", "state": "NV", "country": "US", "venue": "Las Vegas Motor Speedway"}',
  '{"start": "2026-05-15", "end": "2026-05-17", "year": 2026}',
  ARRAY['Electronic', 'House', 'Techno', 'Trance', 'Dubstep'],
  'https://lasvegas.electricdaisycarnival.com',
  'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=800',
  'massive',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Governors Ball
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Governors Ball Music Festival',
  'governors-ball',
  '{"city": "New York", "state": "NY", "country": "US", "venue": "Flushing Meadows Corona Park"}',
  '{"start": "2026-06-05", "end": "2026-06-07", "year": 2026}',
  ARRAY['Rock', 'Hip-Hop', 'Electronic', 'Pop', 'Indie'],
  'https://governorsballmusicfestival.com',
  'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=800',
  'large',
  false
) ON CONFLICT (slug) DO NOTHING;

-- Pitchfork Music Festival
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Pitchfork Music Festival',
  'pitchfork',
  '{"city": "Chicago", "state": "IL", "country": "US", "venue": "Union Park"}',
  '{"start": "2026-07-17", "end": "2026-07-19", "year": 2026}',
  ARRAY['Indie', 'Alternative', 'Hip-Hop', 'Electronic', 'Experimental'],
  'https://pitchforkmusicfestival.com',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=800',
  'medium',
  false
) ON CONFLICT (slug) DO NOTHING;

-- Glastonbury
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Glastonbury Festival',
  'glastonbury',
  '{"city": "Pilton", "state": "Somerset", "country": "UK", "venue": "Worthy Farm"}',
  '{"start": "2026-06-24", "end": "2026-06-28", "year": 2026}',
  ARRAY['Rock', 'Pop', 'Electronic', 'Folk', 'World'],
  'https://glastonburyfestivals.co.uk',
  'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800',
  'massive',
  true
) ON CONFLICT (slug) DO NOTHING;

-- Primavera Sound
INSERT INTO festivals (name, slug, location, dates, genres, website_url, image_url, capacity, camping)
VALUES (
  'Primavera Sound',
  'primavera-sound',
  '{"city": "Barcelona", "country": "ES", "venue": "Parc del Fòrum"}',
  '{"start": "2026-05-28", "end": "2026-05-30", "year": 2026}',
  ARRAY['Indie', 'Electronic', 'Rock', 'Pop', 'Experimental'],
  'https://primaverasound.com',
  'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800',
  'large',
  false
) ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- HELPER FUNCTION: Update timestamps
-- ============================================

CREATE OR REPLACE FUNCTION update_festival_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for festivals
DROP TRIGGER IF EXISTS trigger_festivals_updated_at ON festivals;
CREATE TRIGGER trigger_festivals_updated_at
  BEFORE UPDATE ON festivals
  FOR EACH ROW
  EXECUTE FUNCTION update_festival_updated_at();

-- Trigger for user_festival_agendas
DROP TRIGGER IF EXISTS trigger_user_agendas_updated_at ON user_festival_agendas;
CREATE TRIGGER trigger_user_agendas_updated_at
  BEFORE UPDATE ON user_festival_agendas
  FOR EACH ROW
  EXECUTE FUNCTION update_festival_updated_at();

-- ============================================
-- SAMPLE LINEUP DATA (Coachella example)
-- ============================================

-- Get Coachella ID and add sample lineup
DO $$
DECLARE
  coachella_id UUID;
BEGIN
  SELECT id INTO coachella_id FROM festivals WHERE slug = 'coachella' LIMIT 1;
  
  IF coachella_id IS NOT NULL THEN
    -- Headliners
    INSERT INTO festival_artists (festival_id, artist_name, normalized_name, day, stage, start_time, end_time, headliner, genres)
    VALUES
      (coachella_id, 'Lady Gaga', 'lady gaga', 'Friday', 'Main Stage', '22:30', '00:00', true, ARRAY['Pop', 'Dance']),
      (coachella_id, 'Green Day', 'green day', 'Saturday', 'Main Stage', '22:30', '00:00', true, ARRAY['Rock', 'Punk']),
      (coachella_id, 'Post Malone', 'post malone', 'Sunday', 'Main Stage', '22:30', '00:00', true, ARRAY['Hip-Hop', 'Pop']),
      
      -- Sub-headliners
      (coachella_id, 'Charli XCX', 'charli xcx', 'Friday', 'Outdoor Stage', '20:00', '21:15', false, ARRAY['Pop', 'Electronic']),
      (coachella_id, 'Fred Again..', 'fred again', 'Saturday', 'Sahara', '20:30', '22:00', false, ARRAY['Electronic', 'House']),
      (coachella_id, 'Raye', 'raye', 'Friday', 'Gobi', '18:00', '19:00', false, ARRAY['R&B', 'Pop']),
      
      -- Other artists
      (coachella_id, 'Remi Wolf', 'remi wolf', 'Friday', 'Mojave', '15:30', '16:30', false, ARRAY['Indie Pop', 'Funk']),
      (coachella_id, 'PinkPantheress', 'pinkpantheress', 'Saturday', 'Gobi', '16:00', '17:00', false, ARRAY['Electronic', 'UK Garage']),
      (coachella_id, 'Channel Tres', 'channel tres', 'Sunday', 'Sahara', '17:00', '18:00', false, ARRAY['House', 'Hip-Hop']),
      (coachella_id, 'Disclosure', 'disclosure', 'Saturday', 'Outdoor Stage', '18:30', '19:45', false, ARRAY['Electronic', 'House']),
      (coachella_id, 'Doja Cat', 'doja cat', 'Sunday', 'Main Stage', '19:30', '20:45', false, ARRAY['Pop', 'Hip-Hop']),
      (coachella_id, 'Tame Impala', 'tame impala', 'Friday', 'Outdoor Stage', '21:30', '23:00', false, ARRAY['Psychedelic', 'Indie']),
      (coachella_id, 'Kaytranada', 'kaytranada', 'Sunday', 'Mojave', '21:00', '22:15', false, ARRAY['Electronic', 'House'])
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
