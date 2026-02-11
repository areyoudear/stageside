-- ============================================
-- Setlist - Concert Discovery App
-- Database Schema for Supabase (PostgreSQL)
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table
-- Stores user accounts linked to Spotify
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spotify_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  display_name VARCHAR(255),
  default_location JSONB,  -- {lat, lng, city, country}
  notification_preferences JSONB DEFAULT '{"email_weekly": true, "email_instant": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster Spotify ID lookups
CREATE INDEX IF NOT EXISTS idx_users_spotify_id ON users(spotify_id);

-- ============================================
-- Music Profiles Table
-- Caches user's music taste from Spotify
-- ============================================
CREATE TABLE IF NOT EXISTS music_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  top_artists JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{id, name, genres, popularity, image_url}]
  top_genres JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["indie rock", "electronic", ...]
  last_synced TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_music_profiles_user_id ON music_profiles(user_id);

-- ============================================
-- Saved Concerts Table
-- User's bookmarked/saved concerts
-- ============================================
CREATE TABLE IF NOT EXISTS saved_concerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concert_id VARCHAR(255) NOT NULL,  -- Ticketmaster event ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, concert_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_concerts_user_id ON saved_concerts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_concerts_concert_id ON saved_concerts(concert_id);

-- ============================================
-- Email Subscriptions Table
-- For weekly digest and notifications
-- ============================================
CREATE TABLE IF NOT EXISTS email_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- Optional, can be standalone
  email VARCHAR(255) NOT NULL,
  frequency VARCHAR(50) DEFAULT 'weekly' CHECK (frequency IN ('weekly', 'daily', 'none')),
  location JSONB,  -- {lat, lng, city}
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(email)
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_email ON email_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_active ON email_subscriptions(is_active) WHERE is_active = TRUE;

-- ============================================
-- Concert Cache Table (Optional)
-- Cache concert data for performance
-- ============================================
CREATE TABLE IF NOT EXISTS concert_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255) UNIQUE NOT NULL,  -- Ticketmaster event ID
  source VARCHAR(50) DEFAULT 'ticketmaster',
  artist_name VARCHAR(255),
  venue_name VARCHAR(255),
  city VARCHAR(255),
  event_date TIMESTAMP WITH TIME ZONE,
  ticket_url VARCHAR(500),
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  image_url VARCHAR(500),
  genres JSONB DEFAULT '[]'::jsonb,
  raw_data JSONB,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '24 hours'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_concert_cache_external_id ON concert_cache(external_id);
CREATE INDEX IF NOT EXISTS idx_concert_cache_city ON concert_cache(city);
CREATE INDEX IF NOT EXISTS idx_concert_cache_event_date ON concert_cache(event_date);
CREATE INDEX IF NOT EXISTS idx_concert_cache_expires ON concert_cache(expires_at);

-- ============================================
-- Search History Table (Analytics)
-- Track user searches for insights
-- ============================================
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  location JSONB,  -- {lat, lng, city}
  date_range JSONB,  -- {start, end}
  results_count INTEGER,
  high_match_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_concerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concert_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = spotify_id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = spotify_id);

-- Music profiles are tied to users
CREATE POLICY "Users can view own music profile" ON music_profiles
  FOR SELECT USING (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));

-- Saved concerts are user-specific
CREATE POLICY "Users can manage own saved concerts" ON saved_concerts
  FOR ALL USING (user_id IN (SELECT id FROM users WHERE spotify_id = auth.uid()::text));

-- Concert cache is readable by all authenticated users
CREATE POLICY "Concert cache is public read" ON concert_cache
  FOR SELECT TO authenticated USING (true);

-- Service role bypass for API operations
-- Note: The service role key bypasses RLS automatically

-- ============================================
-- Functions
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_concert_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM concert_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Sample Data (for testing)
-- ============================================
-- Uncomment to insert test data

-- INSERT INTO users (spotify_id, email, display_name) VALUES
--   ('test_user_1', 'test@example.com', 'Test User');

-- ============================================
-- Grants (if needed for specific roles)
-- ============================================
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
