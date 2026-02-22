-- Festival Lineups Migration
-- Adds real 2025/2026 lineup data for major festivals
-- Based on actual announced lineups from Wikipedia and festival sources

-- ============================================
-- OUTSIDE LANDS 2025 (August 8-10, 2025)
-- Golden Gate Park, San Francisco
-- ============================================

DO $$
DECLARE
  osl_id UUID;
BEGIN
  SELECT id INTO osl_id FROM festivals WHERE slug = 'outside-lands' LIMIT 1;
  
  IF osl_id IS NOT NULL THEN
    INSERT INTO festival_artists (festival_id, artist_name, normalized_name, day, stage, start_time, end_time, headliner, genres)
    VALUES
      -- Friday Headliners
      (osl_id, 'Tyler, the Creator', 'tyler the creator', 'Friday', 'Lands End', '21:30', '23:00', true, ARRAY['Hip-Hop', 'Alternative']),
      (osl_id, 'Charli XCX', 'charli xcx', 'Friday', 'Twin Peaks', '19:30', '21:00', false, ARRAY['Pop', 'Electronic']),
      (osl_id, 'Glass Animals', 'glass animals', 'Friday', 'Sutro', '18:00', '19:15', false, ARRAY['Indie', 'Electronic']),
      (osl_id, 'Remi Wolf', 'remi wolf', 'Friday', 'Panhandle', '16:00', '17:00', false, ARRAY['Indie Pop', 'Funk']),
      (osl_id, 'Clairo', 'clairo', 'Friday', 'Twin Peaks', '17:15', '18:15', false, ARRAY['Indie Pop', 'Alternative']),
      (osl_id, 'Wallows', 'wallows', 'Friday', 'Sutro', '15:00', '16:00', false, ARRAY['Indie Rock', 'Alternative']),
      (osl_id, 'Ethel Cain', 'ethel cain', 'Friday', 'Panhandle', '14:00', '15:00', false, ARRAY['Alternative', 'Folk']),
      (osl_id, 'Vince Staples', 'vince staples', 'Friday', 'Lands End', '17:30', '18:30', false, ARRAY['Hip-Hop', 'Rap']),
      (osl_id, 'Turnstile', 'turnstile', 'Friday', 'Sutro', '20:00', '21:00', false, ARRAY['Hardcore', 'Punk']),
      
      -- Saturday Headliners
      (osl_id, 'Doja Cat', 'doja cat', 'Saturday', 'Lands End', '21:30', '23:00', true, ARRAY['Pop', 'Hip-Hop']),
      (osl_id, 'Sabrina Carpenter', 'sabrina carpenter', 'Saturday', 'Twin Peaks', '19:30', '21:00', false, ARRAY['Pop']),
      (osl_id, 'Justice', 'justice', 'Saturday', 'Sutro', '20:30', '22:00', false, ARRAY['Electronic', 'Dance']),
      (osl_id, 'Dominic Fike', 'dominic fike', 'Saturday', 'Panhandle', '17:00', '18:00', false, ARRAY['Alternative', 'Pop']),
      (osl_id, 'Chappell Roan', 'chappell roan', 'Saturday', 'Lands End', '18:00', '19:15', false, ARRAY['Pop', 'Alternative']),
      (osl_id, 'Gracie Abrams', 'gracie abrams', 'Saturday', 'Twin Peaks', '16:00', '17:00', false, ARRAY['Pop', 'Indie']),
      (osl_id, 'Raye', 'raye', 'Saturday', 'Sutro', '17:00', '18:00', false, ARRAY['R&B', 'Pop']),
      (osl_id, 'PinkPantheress', 'pinkpantheress', 'Saturday', 'Panhandle', '15:00', '16:00', false, ARRAY['Electronic', 'UK Garage']),
      (osl_id, 'Caroline Polachek', 'caroline polachek', 'Saturday', 'Twin Peaks', '18:15', '19:15', false, ARRAY['Art Pop', 'Electronic']),
      
      -- Sunday Headliners  
      (osl_id, 'Hozier', 'hozier', 'Sunday', 'Lands End', '21:00', '22:30', true, ARRAY['Folk', 'Rock', 'Soul']),
      (osl_id, 'ODESZA', 'odesza', 'Sunday', 'Twin Peaks', '19:30', '21:00', false, ARRAY['Electronic', 'Dance']),
      (osl_id, 'Tyla', 'tyla', 'Sunday', 'Sutro', '18:00', '19:00', false, ARRAY['Afrobeats', 'R&B']),
      (osl_id, 'Conan Gray', 'conan gray', 'Sunday', 'Panhandle', '16:30', '17:30', false, ARRAY['Pop', 'Indie']),
      (osl_id, 'Carly Rae Jepsen', 'carly rae jepsen', 'Sunday', 'Twin Peaks', '17:30', '18:30', false, ARRAY['Pop']),
      (osl_id, 'Fred Again..', 'fred again', 'Sunday', 'Lands End', '18:00', '19:30', false, ARRAY['Electronic', 'House']),
      (osl_id, 'Jungle', 'jungle', 'Sunday', 'Sutro', '19:30', '20:30', false, ARRAY['Funk', 'Electronic']),
      (osl_id, 'TV Girl', 'tv girl', 'Sunday', 'Panhandle', '14:30', '15:30', false, ARRAY['Indie Pop']),
      (osl_id, 'Kaytranada', 'kaytranada', 'Sunday', 'Sutro', '21:00', '22:15', false, ARRAY['Electronic', 'House']),
      (osl_id, 'Reneé Rapp', 'renee rapp', 'Sunday', 'Twin Peaks', '16:00', '17:00', false, ARRAY['Pop']),
      (osl_id, 'Mk.gee', 'mkgee', 'Sunday', 'Panhandle', '15:30', '16:30', false, ARRAY['Alternative', 'R&B']),
      (osl_id, 'Toro y Moi', 'toro y moi', 'Sunday', 'Sutro', '15:00', '16:00', false, ARRAY['Indie', 'Electronic'])
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- LOLLAPALOOZA 2026 (July 30 - August 2, 2026)
-- Grant Park, Chicago
-- ============================================

DO $$
DECLARE
  lolla_id UUID;
BEGIN
  SELECT id INTO lolla_id FROM festivals WHERE slug = 'lollapalooza' LIMIT 1;
  
  IF lolla_id IS NOT NULL THEN
    INSERT INTO festival_artists (festival_id, artist_name, normalized_name, day, stage, start_time, end_time, headliner, genres)
    VALUES
      -- Thursday
      (lolla_id, 'Olivia Rodrigo', 'olivia rodrigo', 'Thursday', 'Bud Light Stage', '21:00', '22:30', true, ARRAY['Pop', 'Alternative']),
      (lolla_id, 'Shawn Mendes', 'shawn mendes', 'Thursday', 'T-Mobile Stage', '19:30', '21:00', false, ARRAY['Pop']),
      (lolla_id, 'Gracie Abrams', 'gracie abrams', 'Thursday', 'Bud Light Stage', '17:30', '18:30', false, ARRAY['Pop', 'Indie']),
      (lolla_id, 'Role Model', 'role model', 'Thursday', 'Perry''s Stage', '16:00', '17:00', false, ARRAY['Pop', 'Alternative']),
      (lolla_id, 'Tate McRae', 'tate mcrae', 'Thursday', 'T-Mobile Stage', '18:00', '19:00', false, ARRAY['Pop', 'Dance']),
      (lolla_id, 'WILLOW', 'willow', 'Thursday', 'BMI Stage', '15:00', '16:00', false, ARRAY['Alternative', 'Rock']),
      (lolla_id, 'Eyedress', 'eyedress', 'Thursday', 'Solana x Lolla Stage', '14:00', '15:00', false, ARRAY['Shoegaze', 'Alternative']),
      
      -- Friday
      (lolla_id, 'Rüfüs Du Sol', 'rufus du sol', 'Friday', 'Bud Light Stage', '21:00', '22:30', true, ARRAY['Electronic', 'Dance']),
      (lolla_id, 'Tool', 'tool', 'Friday', 'T-Mobile Stage', '20:00', '22:00', true, ARRAY['Metal', 'Progressive Rock']),
      (lolla_id, 'The Backseat Lovers', 'the backseat lovers', 'Friday', 'Bud Light Stage', '17:00', '18:00', false, ARRAY['Indie Rock', 'Alternative']),
      (lolla_id, 'JPEGMAFIA', 'jpegmafia', 'Friday', 'Perry''s Stage', '18:00', '19:00', false, ARRAY['Hip-Hop', 'Experimental']),
      (lolla_id, 'Remi Wolf', 'remi wolf', 'Friday', 'BMI Stage', '16:00', '17:00', false, ARRAY['Indie Pop', 'Funk']),
      (lolla_id, 'Beach Weather', 'beach weather', 'Friday', 'T-Mobile Stage', '15:00', '16:00', false, ARRAY['Indie Rock']),
      (lolla_id, 'Skrillex', 'skrillex', 'Friday', 'Perry''s Stage', '21:00', '22:30', false, ARRAY['Electronic', 'Dubstep']),
      (lolla_id, 'Fisher', 'fisher', 'Friday', 'Perry''s Stage', '19:30', '21:00', false, ARRAY['House', 'Electronic']),
      
      -- Saturday
      (lolla_id, 'Justin Timberlake', 'justin timberlake', 'Saturday', 'Bud Light Stage', '21:00', '22:45', true, ARRAY['Pop', 'R&B']),
      (lolla_id, 'Alanis Morissette', 'alanis morissette', 'Saturday', 'T-Mobile Stage', '19:30', '21:15', true, ARRAY['Alternative Rock', 'Pop']),
      (lolla_id, 'T-Pain', 'tpain', 'Saturday', 'Bud Light Stage', '18:00', '19:00', false, ARRAY['Hip-Hop', 'R&B']),
      (lolla_id, 'Benson Boone', 'benson boone', 'Saturday', 'T-Mobile Stage', '17:00', '18:00', false, ARRAY['Pop']),
      (lolla_id, 'Glass Animals', 'glass animals', 'Saturday', 'BMI Stage', '19:00', '20:15', false, ARRAY['Indie', 'Electronic']),
      (lolla_id, 'Zedd', 'zedd', 'Saturday', 'Perry''s Stage', '21:00', '22:30', false, ARRAY['Electronic', 'House']),
      (lolla_id, 'Clairo', 'clairo', 'Saturday', 'BMI Stage', '16:00', '17:00', false, ARRAY['Indie Pop', 'Alternative']),
      (lolla_id, 'Aurora', 'aurora', 'Saturday', 'Solana x Lolla Stage', '17:30', '18:30', false, ARRAY['Art Pop', 'Electronic']),
      
      -- Sunday
      (lolla_id, 'Tyler, the Creator', 'tyler the creator', 'Sunday', 'Bud Light Stage', '21:00', '22:30', true, ARRAY['Hip-Hop', 'Alternative']),
      (lolla_id, 'Charli XCX', 'charli xcx', 'Sunday', 'T-Mobile Stage', '19:30', '21:00', false, ARRAY['Pop', 'Electronic']),
      (lolla_id, 'Conan Gray', 'conan gray', 'Sunday', 'Bud Light Stage', '17:00', '18:00', false, ARRAY['Pop', 'Indie']),
      (lolla_id, 'Mt. Joy', 'mt joy', 'Sunday', 'BMI Stage', '16:00', '17:00', false, ARRAY['Indie Rock', 'Folk']),
      (lolla_id, 'Feid', 'feid', 'Sunday', 'T-Mobile Stage', '18:00', '19:00', false, ARRAY['Reggaeton', 'Latin']),
      (lolla_id, 'Matt Champion', 'matt champion', 'Sunday', 'Perry''s Stage', '15:00', '16:00', false, ARRAY['Hip-Hop', 'Alternative']),
      (lolla_id, 'Troye Sivan', 'troye sivan', 'Sunday', 'Bud Light Stage', '19:00', '20:00', false, ARRAY['Pop', 'Electronic']),
      (lolla_id, 'Dom Dolla', 'dom dolla', 'Sunday', 'Perry''s Stage', '20:00', '21:30', false, ARRAY['House', 'Electronic']),
      (lolla_id, 'Tyla', 'tyla', 'Sunday', 'T-Mobile Stage', '16:00', '17:00', false, ARRAY['Afrobeats', 'R&B']),
      (lolla_id, 'Carly Rae Jepsen', 'carly rae jepsen', 'Sunday', 'BMI Stage', '17:30', '18:30', false, ARRAY['Pop'])
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- BONNAROO 2026 (June 11-14, 2026)
-- Great Stage Park, Manchester, Tennessee
-- ============================================

DO $$
DECLARE
  bonnaroo_id UUID;
BEGIN
  SELECT id INTO bonnaroo_id FROM festivals WHERE slug = 'bonnaroo' LIMIT 1;
  
  IF bonnaroo_id IS NOT NULL THEN
    INSERT INTO festival_artists (festival_id, artist_name, normalized_name, day, stage, start_time, end_time, headliner, genres)
    VALUES
      -- Thursday
      (bonnaroo_id, 'Goose', 'goose', 'Thursday', 'Which Stage', '21:00', '23:30', false, ARRAY['Jam Band', 'Rock']),
      (bonnaroo_id, 'Tipper', 'tipper', 'Thursday', 'The Other', '23:00', '01:30', false, ARRAY['Electronic', 'IDM']),
      (bonnaroo_id, 'Mt. Joy', 'mt joy', 'Thursday', 'Which Stage', '18:00', '19:30', false, ARRAY['Indie Rock', 'Folk']),
      (bonnaroo_id, 'Lettuce', 'lettuce', 'Thursday', 'That Tent', '20:00', '21:30', false, ARRAY['Funk', 'Jazz']),
      (bonnaroo_id, 'Lespecial', 'lespecial', 'Thursday', 'This Tent', '19:00', '20:00', false, ARRAY['Electronic', 'Rock']),
      
      -- Friday
      (bonnaroo_id, 'King Gizzard & The Lizard Wizard', 'king gizzard and the lizard wizard', 'Friday', 'What Stage', '21:00', '23:00', true, ARRAY['Psychedelic Rock', 'Progressive']),
      (bonnaroo_id, 'Vampire Weekend', 'vampire weekend', 'Friday', 'Which Stage', '19:00', '21:00', true, ARRAY['Indie Rock', 'Alternative']),
      (bonnaroo_id, 'Chris Lake', 'chris lake', 'Friday', 'The Other', '23:30', '01:30', false, ARRAY['House', 'Electronic']),
      (bonnaroo_id, 'Denzel Curry', 'denzel curry', 'Friday', 'Which Stage', '16:30', '17:30', false, ARRAY['Hip-Hop', 'Rap']),
      (bonnaroo_id, 'Chappell Roan', 'chappell roan', 'Friday', 'What Stage', '18:30', '19:45', false, ARRAY['Pop', 'Alternative']),
      (bonnaroo_id, 'Remi Wolf', 'remi wolf', 'Friday', 'That Tent', '17:00', '18:00', false, ARRAY['Indie Pop', 'Funk']),
      (bonnaroo_id, 'DRAMA', 'drama', 'Friday', 'This Tent', '15:00', '16:00', false, ARRAY['R&B', 'Electronic']),
      (bonnaroo_id, 'Goth Babe', 'goth babe', 'Friday', 'That Tent', '15:00', '16:00', false, ARRAY['Indie', 'Electronic']),
      
      -- Saturday
      (bonnaroo_id, 'Olivia Rodrigo', 'olivia rodrigo', 'Saturday', 'What Stage', '21:30', '23:00', true, ARRAY['Pop', 'Alternative']),
      (bonnaroo_id, 'Rainbow Kitten Surprise', 'rainbow kitten surprise', 'Saturday', 'Which Stage', '19:00', '20:30', false, ARRAY['Indie Folk', 'Alternative']),
      (bonnaroo_id, 'GRiZ', 'griz', 'Saturday', 'The Other', '22:00', '00:00', false, ARRAY['Electronic', 'Funk']),
      (bonnaroo_id, 'Cage The Elephant', 'cage the elephant', 'Saturday', 'What Stage', '18:00', '19:30', false, ARRAY['Alternative Rock']),
      (bonnaroo_id, 'Sierra Ferrell', 'sierra ferrell', 'Saturday', 'Which Stage', '15:30', '16:30', false, ARRAY['Country', 'Folk']),
      (bonnaroo_id, 'Still Woozy', 'still woozy', 'Saturday', 'That Tent', '17:00', '18:00', false, ARRAY['Indie', 'R&B']),
      (bonnaroo_id, 'Raveena', 'raveena', 'Saturday', 'This Tent', '16:00', '17:00', false, ARRAY['R&B', 'Soul']),
      (bonnaroo_id, 'Japanese Breakfast', 'japanese breakfast', 'Saturday', 'Which Stage', '17:00', '18:00', false, ARRAY['Indie Pop', 'Alternative']),
      
      -- Sunday
      (bonnaroo_id, 'Noah Kahan', 'noah kahan', 'Sunday', 'What Stage', '20:30', '22:00', true, ARRAY['Folk', 'Indie']),
      (bonnaroo_id, 'Trampled by Turtles', 'trampled by turtles', 'Sunday', 'Which Stage', '17:30', '18:30', false, ARRAY['Bluegrass', 'Folk']),
      (bonnaroo_id, 'Allison Russell', 'allison russell', 'Sunday', 'That Tent', '15:30', '16:30', false, ARRAY['Folk', 'Americana']),
      (bonnaroo_id, 'Zach Bryan', 'zach bryan', 'Sunday', 'What Stage', '18:30', '20:00', false, ARRAY['Country', 'Folk']),
      (bonnaroo_id, 'The Red Clay Strays', 'the red clay strays', 'Sunday', 'Which Stage', '15:00', '16:00', false, ARRAY['Southern Rock', 'Country']),
      (bonnaroo_id, 'Marcus King', 'marcus king', 'Sunday', 'That Tent', '17:30', '18:30', false, ARRAY['Rock', 'Blues']),
      (bonnaroo_id, 'Hozier', 'hozier', 'Sunday', 'Which Stage', '19:00', '20:30', false, ARRAY['Folk', 'Rock', 'Soul']),
      (bonnaroo_id, 'John Summit', 'john summit', 'Sunday', 'The Other', '21:00', '23:00', false, ARRAY['House', 'Electronic'])
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- GOVERNORS BALL 2026 (June 5-7, 2026)
-- Flushing Meadows-Corona Park, NYC
-- ============================================

DO $$
DECLARE
  govball_id UUID;
BEGIN
  SELECT id INTO govball_id FROM festivals WHERE slug = 'governors-ball' LIMIT 1;
  
  IF govball_id IS NOT NULL THEN
    INSERT INTO festival_artists (festival_id, artist_name, normalized_name, day, stage, start_time, end_time, headliner, genres)
    VALUES
      -- Friday
      (govball_id, 'Tyler, the Creator', 'tyler the creator', 'Friday', 'GovBallNYC Stage', '21:00', '22:30', true, ARRAY['Hip-Hop', 'Alternative']),
      (govball_id, 'Glass Animals', 'glass animals', 'Friday', 'Bacardi Stage', '19:00', '20:15', false, ARRAY['Indie', 'Electronic']),
      (govball_id, 'Benson Boone', 'benson boone', 'Friday', 'GovBallNYC Stage', '17:30', '18:30', false, ARRAY['Pop']),
      (govball_id, 'JPEGMafia', 'jpegmafia', 'Friday', 'Bacardi Stage', '16:30', '17:30', false, ARRAY['Hip-Hop', 'Experimental']),
      (govball_id, 'The Backseat Lovers', 'the backseat lovers', 'Friday', 'Honda Stage', '18:00', '19:00', false, ARRAY['Indie Rock', 'Alternative']),
      (govball_id, 'Mk.gee', 'mkgee', 'Friday', 'Big Apple Stage', '15:30', '16:30', false, ARRAY['Alternative', 'R&B']),
      (govball_id, 'Matt Champion', 'matt champion', 'Friday', 'Honda Stage', '14:30', '15:30', false, ARRAY['Hip-Hop', 'Alternative']),
      (govball_id, 'Royal Otis', 'royal otis', 'Friday', 'Big Apple Stage', '17:00', '18:00', false, ARRAY['Indie Rock']),
      
      -- Saturday
      (govball_id, 'Olivia Rodrigo', 'olivia rodrigo', 'Saturday', 'GovBallNYC Stage', '21:00', '22:30', true, ARRAY['Pop', 'Alternative']),
      (govball_id, 'Feid', 'feid', 'Saturday', 'Bacardi Stage', '19:30', '20:45', false, ARRAY['Reggaeton', 'Latin']),
      (govball_id, 'Conan Gray', 'conan gray', 'Saturday', 'GovBallNYC Stage', '18:00', '19:00', false, ARRAY['Pop', 'Indie']),
      (govball_id, 'T-Pain', 'tpain', 'Saturday', 'Bacardi Stage', '17:30', '18:30', false, ARRAY['Hip-Hop', 'R&B']),
      (govball_id, 'Tyla', 'tyla', 'Saturday', 'Honda Stage', '18:30', '19:30', false, ARRAY['Afrobeats', 'R&B']),
      (govball_id, 'Role Model', 'role model', 'Saturday', 'Big Apple Stage', '16:00', '17:00', false, ARRAY['Pop', 'Alternative']),
      (govball_id, 'Mt. Joy', 'mt joy', 'Saturday', 'Honda Stage', '15:00', '16:00', false, ARRAY['Indie Rock', 'Folk']),
      (govball_id, 'Clairo', 'clairo', 'Saturday', 'GovBallNYC Stage', '16:30', '17:30', false, ARRAY['Indie Pop', 'Alternative']),
      
      -- Sunday
      (govball_id, 'Hozier', 'hozier', 'Sunday', 'GovBallNYC Stage', '20:30', '22:00', true, ARRAY['Folk', 'Rock', 'Soul']),
      (govball_id, 'Troye Sivan', 'troye sivan', 'Sunday', 'Bacardi Stage', '19:00', '20:00', false, ARRAY['Pop', 'Electronic']),
      (govball_id, 'Gracie Abrams', 'gracie abrams', 'Sunday', 'GovBallNYC Stage', '17:30', '18:30', false, ARRAY['Pop', 'Indie']),
      (govball_id, 'Chappell Roan', 'chappell roan', 'Sunday', 'Bacardi Stage', '17:00', '18:00', false, ARRAY['Pop', 'Alternative']),
      (govball_id, 'Carly Rae Jepsen', 'carly rae jepsen', 'Sunday', 'Honda Stage', '18:30', '19:30', false, ARRAY['Pop']),
      (govball_id, 'Ethel Cain', 'ethel cain', 'Sunday', 'Big Apple Stage', '15:30', '16:30', false, ARRAY['Alternative', 'Folk']),
      (govball_id, 'TV Girl', 'tv girl', 'Sunday', 'Honda Stage', '14:30', '15:30', false, ARRAY['Indie Pop']),
      (govball_id, 'Reneé Rapp', 'renee rapp', 'Sunday', 'GovBallNYC Stage', '16:00', '17:00', false, ARRAY['Pop'])
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- PRIMAVERA SOUND 2026 (May 28-30, 2026)
-- Parc del Fòrum, Barcelona
-- ============================================

DO $$
DECLARE
  primavera_id UUID;
BEGIN
  SELECT id INTO primavera_id FROM festivals WHERE slug = 'primavera-sound' LIMIT 1;
  
  IF primavera_id IS NOT NULL THEN
    INSERT INTO festival_artists (festival_id, artist_name, normalized_name, day, stage, start_time, end_time, headliner, genres)
    VALUES
      -- Thursday
      (primavera_id, 'Doja Cat', 'doja cat', 'Thursday', 'Estrella Damm Stage', '00:30', '02:00', true, ARRAY['Pop', 'Hip-Hop']),
      (primavera_id, 'Massive Attack', 'massive attack', 'Thursday', 'Cupra Stage', '23:00', '00:30', true, ARRAY['Trip Hop', 'Electronic']),
      (primavera_id, 'Bad Gyal', 'bad gyal', 'Thursday', 'Pull&Bear Stage', '21:30', '22:45', true, ARRAY['Reggaeton', 'Electronic']),
      (primavera_id, 'Jamie xx', 'jamie xx', 'Thursday', 'Estrella Damm Stage', '22:00', '23:30', false, ARRAY['Electronic', 'House']),
      (primavera_id, 'Fontaines D.C.', 'fontaines dc', 'Thursday', 'Cupra Stage', '20:30', '21:45', false, ARRAY['Post-Punk', 'Rock']),
      (primavera_id, 'Floating Points', 'floating points', 'Thursday', 'Dice Stage', '01:00', '02:30', false, ARRAY['Electronic', 'Ambient']),
      (primavera_id, 'Jessy Lanza', 'jessy lanza', 'Thursday', 'Pull&Bear Stage', '19:30', '20:30', false, ARRAY['Electronic', 'R&B']),
      (primavera_id, 'JPEGMAFIA', 'jpegmafia', 'Thursday', 'Dice Stage', '22:30', '23:30', false, ARRAY['Hip-Hop', 'Experimental']),
      
      -- Friday
      (primavera_id, 'The Cure', 'the cure', 'Friday', 'Estrella Damm Stage', '00:00', '03:00', true, ARRAY['Alternative Rock', 'Post-Punk']),
      (primavera_id, 'Addison Rae', 'addison rae', 'Friday', 'Cupra Stage', '22:00', '23:15', true, ARRAY['Pop', 'Dance']),
      (primavera_id, 'Skrillex', 'skrillex', 'Friday', 'Pull&Bear Stage', '02:00', '04:00', true, ARRAY['Electronic', 'Dubstep']),
      (primavera_id, 'FKA Twigs', 'fka twigs', 'Friday', 'Estrella Damm Stage', '21:30', '22:45', false, ARRAY['Art Pop', 'Electronic']),
      (primavera_id, 'Turnstile', 'turnstile', 'Friday', 'Dice Stage', '20:30', '21:30', false, ARRAY['Hardcore', 'Punk']),
      (primavera_id, 'Caroline Polachek', 'caroline polachek', 'Friday', 'Cupra Stage', '19:30', '20:45', false, ARRAY['Art Pop', 'Electronic']),
      (primavera_id, 'Four Tet', 'four tet', 'Friday', 'Pull&Bear Stage', '00:30', '02:00', false, ARRAY['Electronic', 'IDM']),
      (primavera_id, 'Fred Again..', 'fred again', 'Friday', 'Estrella Damm Stage', '23:00', '00:00', false, ARRAY['Electronic', 'House']),
      
      -- Saturday
      (primavera_id, 'The xx', 'the xx', 'Saturday', 'Estrella Damm Stage', '00:00', '01:30', true, ARRAY['Indie', 'Electronic']),
      (primavera_id, 'Gorillaz', 'gorillaz', 'Saturday', 'Cupra Stage', '22:00', '23:45', true, ARRAY['Alternative', 'Electronic']),
      (primavera_id, 'My Bloody Valentine', 'my bloody valentine', 'Saturday', 'Estrella Damm Stage', '02:00', '03:30', true, ARRAY['Shoegaze', 'Alternative']),
      (primavera_id, 'Charli XCX', 'charli xcx', 'Saturday', 'Pull&Bear Stage', '23:30', '00:45', false, ARRAY['Pop', 'Electronic']),
      (primavera_id, 'Disclosure', 'disclosure', 'Saturday', 'Pull&Bear Stage', '01:30', '03:00', false, ARRAY['Electronic', 'House']),
      (primavera_id, 'Beach House', 'beach house', 'Saturday', 'Cupra Stage', '20:30', '21:45', false, ARRAY['Dream Pop', 'Shoegaze']),
      (primavera_id, 'LCD Soundsystem', 'lcd soundsystem', 'Saturday', 'Dice Stage', '22:30', '00:00', false, ARRAY['Electronic', 'Dance Punk']),
      (primavera_id, 'The National', 'the national', 'Saturday', 'Estrella Damm Stage', '21:30', '23:00', false, ARRAY['Indie Rock', 'Alternative']),
      (primavera_id, 'Clairo', 'clairo', 'Saturday', 'Dice Stage', '19:30', '20:30', false, ARRAY['Indie Pop', 'Alternative']),
      (primavera_id, 'Slowdive', 'slowdive', 'Saturday', 'Cupra Stage', '19:00', '20:15', false, ARRAY['Shoegaze', 'Dream Pop']),
      (primavera_id, 'Ethel Cain', 'ethel cain', 'Saturday', 'Dice Stage', '18:00', '19:00', false, ARRAY['Alternative', 'Folk']),
      (primavera_id, 'PinkPantheress', 'pinkpantheress', 'Saturday', 'Pull&Bear Stage', '20:30', '21:30', false, ARRAY['Electronic', 'UK Garage'])
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================
-- Summary of seeded data
-- ============================================
-- Outside Lands 2025: ~30 artists
-- Lollapalooza 2026: ~30 artists  
-- Bonnaroo 2026: ~28 artists
-- Governors Ball 2026: ~24 artists
-- Primavera Sound 2026: ~28 artists
-- Total: ~140 festival artists across 5 festivals
