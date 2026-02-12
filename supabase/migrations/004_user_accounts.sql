-- ============================================
-- Migration 004: Proper User Accounts
-- Separates identity from music service connections
-- ============================================

-- ============================================
-- Update Users Table for standalone accounts
-- ============================================

-- Add new columns for standalone auth
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
  ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE,
  ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'credentials';

-- Make spotify_id nullable (no longer required for account)
ALTER TABLE users ALTER COLUMN spotify_id DROP NOT NULL;

-- Add unique constraint on email
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- Saved Searches Table
-- Store user's favorite search configurations
-- ============================================
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  location JSONB NOT NULL,  -- {lat, lng, city, state, country}
  date_range JSONB,  -- {type: 'next_3_months' | 'custom', start?, end?}
  filters JSONB,  -- {genres, price_range, venue_types, etc}
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);

-- ============================================
-- User Preferences Table
-- Learned and explicit preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  price_range_min DECIMAL(10,2),
  price_range_max DECIMAL(10,2),
  max_distance_miles INTEGER DEFAULT 50,
  preferred_venue_types JSONB DEFAULT '[]'::jsonb,  -- ["arena", "club", "outdoor"]
  preferred_days JSONB DEFAULT '[]'::jsonb,  -- ["friday", "saturday"]
  blacklisted_artists JSONB DEFAULT '[]'::jsonb,
  blacklisted_venues JSONB DEFAULT '[]'::jsonb,
  notification_new_matches BOOLEAN DEFAULT TRUE,
  notification_price_drops BOOLEAN DEFAULT TRUE,
  notification_friend_activity BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- ============================================
-- User Interactions Table
-- Track behavior for learning preferences
-- ============================================
CREATE TABLE IF NOT EXISTS user_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,  -- 'view', 'save', 'unsave', 'click_tickets', 'share', 'dismiss'
  concert_id VARCHAR(255),
  artist_name VARCHAR(255),
  genre VARCHAR(100),
  venue_name VARCHAR(255),
  metadata JSONB,  -- additional context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id ON user_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_type ON user_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_user_interactions_created ON user_interactions(created_at);

-- ============================================
-- Concert Groups (Concert Buddy Feature)
-- Groups for matching multiple users' preferences
-- ============================================
CREATE TABLE IF NOT EXISTS concert_groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  location JSONB,  -- shared location for the group
  date_range JSONB,  -- shared date range
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concert_groups_invite_code ON concert_groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_concert_groups_created_by ON concert_groups(created_by);

-- ============================================
-- Concert Group Members
-- ============================================
CREATE TABLE IF NOT EXISTS concert_group_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES concert_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_concert_group_members_group ON concert_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_concert_group_members_user ON concert_group_members(user_id);

-- ============================================
-- Shared Concert Lists
-- Shareable curated lists
-- ============================================
CREATE TABLE IF NOT EXISTS concert_lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  slug VARCHAR(100) UNIQUE,  -- for shareable URLs
  is_public BOOLEAN DEFAULT FALSE,
  concert_ids JSONB DEFAULT '[]'::jsonb,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_concert_lists_user_id ON concert_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_concert_lists_slug ON concert_lists(slug);
CREATE INDEX IF NOT EXISTS idx_concert_lists_public ON concert_lists(is_public) WHERE is_public = TRUE;

-- ============================================
-- Friend Connections
-- For social features
-- ============================================
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- ============================================
-- Enable RLS on new tables
-- ============================================
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE concert_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE concert_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE concert_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Helper function to generate invite codes
-- ============================================
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  chars VARCHAR(36) := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(20) := '';
  i INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger to auto-generate invite codes
-- ============================================
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER concert_groups_invite_code
  BEFORE INSERT ON concert_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_invite_code();
