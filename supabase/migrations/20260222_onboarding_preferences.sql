-- ============================================
-- Migration: Add onboarding and location preferences
-- ============================================

-- Add default_location column to user_preferences
ALTER TABLE user_preferences 
  ADD COLUMN IF NOT EXISTS default_location JSONB;

-- Add onboarding_completed flag
ALTER TABLE user_preferences 
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Comment the columns
COMMENT ON COLUMN user_preferences.default_location IS 'User default location {city, lat, lng}';
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Whether user completed onboarding flow';

-- Create index for checking onboarding status
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding 
  ON user_preferences(onboarding_completed) 
  WHERE onboarding_completed = FALSE;
