# Matching Algorithm V3 - World-Class Concert Discovery

## Vision
Transform from "you follow Drake, here's Drake" to "you like emotionally layered electronic with live sampling — here are 3 artists touring with similar live performance styles that you didn't know you needed."

---

## Current Problems

1. **Flat scoring** - Shows 0%, 25%, 50%, 90%, 100% buckets. No nuance.
2. **Shallow matching** - Only checks: do you follow this artist? What genre?
3. **No audio DNA** - Ignores WHY you like artists (tempo, energy, mood)
4. **No live context** - Arena vs intimate, high energy vs storytelling
5. **No discovery magic** - Only surfaces obvious matches
6. **No audio preview** - Can't sample the vibe before deciding
7. **Duplicates** - Same concert from multiple sources

---

## Architecture

### Phase 1: Audio Feature Profile (User DNA)

**Data to capture from Spotify:**
```typescript
interface UserAudioProfile {
  // Aggregate audio features from top tracks
  avgDanceability: number;      // 0-1: How danceable
  avgEnergy: number;            // 0-1: Intensity/activity
  avgValence: number;           // 0-1: Musical positivity (happy vs sad)
  avgTempo: number;             // BPM
  avgAcousticness: number;      // 0-1: Acoustic vs electronic
  avgInstrumentalness: number;  // 0-1: Vocals vs instrumental
  avgLiveness: number;          // 0-1: Live audience presence
  avgSpeechiness: number;       // 0-1: Spoken word content
  
  // Distribution (variance tells us if user has narrow or broad taste)
  energyRange: [number, number];
  tempoRange: [number, number];
  
  // Time-of-day patterns
  morningVibe: "chill" | "energetic" | "mixed";
  nightVibe: "chill" | "energetic" | "mixed";
  
  // Listening contexts
  workoutBPM: number;
  chillBPM: number;
}
```

**How to build:**
1. Fetch user's top 50 tracks from Spotify
2. Get audio features for each track
3. Compute averages and ranges
4. Store in `user_audio_profiles` table

### Phase 2: Artist Audio Profiles

**For each artist playing a concert:**
```typescript
interface ArtistAudioProfile {
  artistId: string;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  topTrackPreviewUrl: string;  // For inline preview
  topTrackName: string;
  liveStyle: "arena" | "intimate" | "festival" | "club";
  setEnergy: "high" | "medium" | "low" | "builds";
}
```

**How to build:**
1. When concert appears, fetch artist's top tracks
2. Get audio features
3. Cache in `artist_profiles` table
4. Use external data (Songkick, Setlist.fm) for live style hints

### Phase 3: Continuous Scoring Algorithm

**Score Components (0-100 total):**

| Factor | Weight | Description |
|--------|--------|-------------|
| Direct Artist Match | 0-35 | You follow this artist (weighted by rank) |
| Related Artist | 0-25 | Similar to artists you love |
| Audio DNA Match | 0-20 | Energy/tempo/vibe similarity |
| Genre Affinity | 0-10 | Genre overlap with nuance |
| Discovery Bonus | 0-5 | Emerging artist in your taste profile |
| Social Signal | 0-5 | Friends interested/going |

**Continuous Score Formula:**
```typescript
function calculatePreciseScore(concert, userProfile, userAudio) {
  let score = 0;
  
  // 1. Direct artist (0-35)
  const artistRank = findArtistRank(concert.artist, userProfile.topArtists);
  if (artistRank >= 0) {
    // Top 5 = 35, top 10 = 30, top 20 = 25, etc.
    score += Math.max(15, 35 - artistRank * 0.8);
  }
  
  // 2. Related artist (0-25)
  const relatedMatch = findRelatedArtist(concert.artist, userProfile.relatedArtists);
  if (relatedMatch) {
    score += 25 * relatedMatch.similarity;
  }
  
  // 3. Audio DNA (0-20)
  const audioDNA = calculateAudioSimilarity(concert.artistAudio, userAudio);
  score += audioDNA * 20;
  
  // 4. Genre (0-10)
  const genreScore = calculateGenreAffinity(concert.genres, userProfile.topGenres);
  score += genreScore * 10;
  
  // 5. Discovery (0-5)
  if (isEmergingInTaste(concert.artist, userProfile)) {
    score += 5;
  }
  
  // 6. Social (0-5)
  score += Math.min(5, friendsInterested * 1);
  
  return Math.round(score);
}
```

### Phase 4: Audio Preview System

**UI Component:**
```tsx
<ConcertCard>
  <AudioPreview 
    previewUrl={artist.topTrackPreviewUrl}
    trackName={artist.topTrackName}
    seekToHighlight={true}  // Jump to the "best" part
  />
</ConcertCard>
```

**Finding the "best" part:**
1. Use audio analysis API to find chorus/drop
2. Fallback: skip first 30s (usually intro), play from :30-:60
3. Store highlight timestamp in cache

### Phase 5: Live Fit & Vibe Tags

**Vibe Categories:**
```typescript
type VibeTags = 
  | "Dance all night"
  | "Intimate acoustic storytelling"
  | "Chaotic mosh energy"
  | "Late-night warehouse rave"
  | "Festival mainstage energy"
  | "Sit-down, cry-in-your-feels"
  | "Sophisticated jazz evening"
  | "High-BPM workout energy"
  | "Chill Sunday vibes";

function generateVibeTags(concert, artistAudio): VibeTags[] {
  const tags = [];
  
  if (artistAudio.avgEnergy > 0.8 && artistAudio.avgTempo > 130) {
    tags.push("Dance all night");
  }
  if (artistAudio.avgAcousticness > 0.7 && artistAudio.avgEnergy < 0.4) {
    tags.push("Intimate acoustic storytelling");
  }
  // ... more rules
  
  return tags;
}
```

### Phase 6: Deduplication

**Strategy:**
1. Normalize artist names
2. Match by: artist + date + city
3. Merge metadata (pick best image, combine ticket links)
4. Track original sources for price comparison

---

## Database Changes

```sql
-- User audio profiles
CREATE TABLE user_audio_profiles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  avg_danceability FLOAT,
  avg_energy FLOAT,
  avg_valence FLOAT,
  avg_tempo FLOAT,
  avg_acousticness FLOAT,
  energy_range JSONB,
  tempo_range JSONB,
  computed_at TIMESTAMP,
  UNIQUE(user_id)
);

-- Artist audio profiles (cached)
CREATE TABLE artist_audio_profiles (
  id UUID PRIMARY KEY,
  spotify_id TEXT UNIQUE,
  artist_name TEXT,
  avg_energy FLOAT,
  avg_valence FLOAT,
  avg_tempo FLOAT,
  top_track_preview_url TEXT,
  top_track_name TEXT,
  highlight_start_ms INT,
  live_style TEXT,
  computed_at TIMESTAMP
);
```

---

## Implementation Order

### Agent 1: Audio Profile System
- Add Spotify audio features API calls
- Create user_audio_profiles table
- Compute profiles on music sync
- Create artist_audio_profiles cache

### Agent 2: Scoring Algorithm V3
- Rewrite calculateMatchScore with continuous scoring
- Add audio DNA similarity
- Implement precise percentages (63%, 78%)
- Update match reasons with nuanced language

### Agent 3: Audio Preview Component
- Create AudioPreview React component
- Fetch preview URLs for concert artists
- Implement highlight seeking
- Add to ConcertCard

### Agent 4: Vibe Tags & Deduplication
- Generate emotional vibe tags
- Implement concert deduplication
- Add live style classification
- Update UI to show vibe tags

### Agent 5: Social & Discovery
- Taste compatibility scoring
- "Friends would go" signals
- Discovery bonus for emerging artists
- Contextual urgency messaging

---

## Match Reason Examples

**Before:**
- "You listen to Taylor Swift"
- "Matches your pop taste"
- "Discover something new"

**After:**
- "78% match — Your top 3 artist with the acoustic energy you love"
- "67% match — Similar emotional depth to Bon Iver, plus your preferred tempo range"
- "54% match — You might love this: intimate acoustic storytelling in a 500-person venue"
- "Friends would go: Alex (82% taste match) is interested"

---

## Success Metrics

- Match scores span 0-100 with actual distribution
- Users can hear the vibe before deciding
- No duplicate concerts in results
- Vibe tags feel accurate and helpful
- Discovery feels magical, not random
