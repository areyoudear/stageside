-- Add Spotify-related columns to festival_artists
ALTER TABLE festival_artists ADD COLUMN IF NOT EXISTS preview_url TEXT;
ALTER TABLE festival_artists ADD COLUMN IF NOT EXISTS spotify_url TEXT;

-- Update spotify_url based on spotify_id if it exists
UPDATE festival_artists 
SET spotify_url = 'https://open.spotify.com/artist/' || spotify_id 
WHERE spotify_id IS NOT NULL AND spotify_url IS NULL;
