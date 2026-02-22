/**
 * Enhanced Vibe Tag System
 * 
 * Generates emotional vibe tags based on:
 * - Artist audio profiles (energy, tempo, valence, etc.) when available
 * - Genre analysis as fallback
 * - Venue context for live experience hints
 */

export type VibeTag =
  | "Dance all night"
  | "Intimate acoustic storytelling"
  | "Chaotic mosh energy"
  | "Late-night warehouse rave"
  | "Festival mainstage energy"
  | "Sit-down, cry-in-your-feels"
  | "Sophisticated jazz evening"
  | "High-BPM workout energy"
  | "Chill Sunday vibes"
  | "Guitar hero worship"
  | "Emotional rollercoaster"
  | "Underground discovery";

export interface VibeResult {
  primary: VibeTag;
  secondary?: VibeTag;
  emoji: string;
  color: string; // Tailwind color class for UI styling
  bgColor: string; // Background color for badges
  borderColor: string; // Border color for highlights
}

/**
 * Audio profile for an artist (from Spotify audio features)
 * This type should match what the audio-profiles agent creates
 */
export interface ArtistAudioProfile {
  artistId: string;
  avgEnergy: number;        // 0-1: Intensity/activity level
  avgValence: number;       // 0-1: Musical positivity (happy vs sad)
  avgTempo: number;         // BPM (typically 60-200)
  avgDanceability: number;  // 0-1: How danceable
  avgAcousticness: number;  // 0-1: Acoustic vs electronic
  avgInstrumentalness: number; // 0-1: Vocals vs instrumental
  avgLiveness: number;      // 0-1: Live audience presence
  avgSpeechiness: number;   // 0-1: Spoken word content
  topTrackPreviewUrl?: string;
  topTrackName?: string;
  liveStyle?: "arena" | "intimate" | "festival" | "club";
}

// Vibe configurations with colors
const VIBE_CONFIG: Record<VibeTag, { emoji: string; color: string; bgColor: string; borderColor: string }> = {
  "Dance all night": { 
    emoji: "💃", 
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
    borderColor: "border-pink-500/40"
  },
  "Intimate acoustic storytelling": { 
    emoji: "🎸", 
    color: "text-amber-400",
    bgColor: "bg-amber-500/20",
    borderColor: "border-amber-500/40"
  },
  "Chaotic mosh energy": { 
    emoji: "🤘", 
    color: "text-red-400",
    bgColor: "bg-red-500/20",
    borderColor: "border-red-500/40"
  },
  "Late-night warehouse rave": { 
    emoji: "🌃", 
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
    borderColor: "border-purple-500/40"
  },
  "Festival mainstage energy": { 
    emoji: "🎆", 
    color: "text-orange-400",
    bgColor: "bg-orange-500/20",
    borderColor: "border-orange-500/40"
  },
  "Sit-down, cry-in-your-feels": { 
    emoji: "😢", 
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
    borderColor: "border-blue-500/40"
  },
  "Sophisticated jazz evening": { 
    emoji: "🎷", 
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
    borderColor: "border-yellow-500/40"
  },
  "High-BPM workout energy": { 
    emoji: "🏃", 
    color: "text-green-400",
    bgColor: "bg-green-500/20",
    borderColor: "border-green-500/40"
  },
  "Chill Sunday vibes": { 
    emoji: "☀️", 
    color: "text-sky-400",
    bgColor: "bg-sky-500/20",
    borderColor: "border-sky-500/40"
  },
  "Guitar hero worship": { 
    emoji: "🎸", 
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/20",
    borderColor: "border-indigo-500/40"
  },
  "Emotional rollercoaster": { 
    emoji: "🎢", 
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    borderColor: "border-violet-500/40"
  },
  "Underground discovery": { 
    emoji: "🔮", 
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/20",
    borderColor: "border-cyan-500/40"
  },
};

// Genre keywords for fallback classification
const GENRE_PATTERNS = {
  mosh: ["metal", "punk", "hardcore", "thrash", "death metal", "metalcore", "grindcore", "deathcore"],
  rave: ["techno", "house", "trance", "drum and bass", "dnb", "hardstyle", "gabber", "acid"],
  dance: ["edm", "electronic", "dance", "pop", "disco", "electro", "synth-pop", "eurodance"],
  acoustic: ["acoustic", "folk", "singer-songwriter", "unplugged", "americana"],
  sad: ["indie", "folk", "emo", "sad", "melancholy", "slowcore"],
  jazz: ["jazz", "bebop", "swing", "blues", "soul", "smooth jazz", "fusion"],
  chill: ["ambient", "lo-fi", "chillwave", "downtempo", "chill", "lounge"],
  rock: ["rock", "alternative", "grunge", "classic rock", "hard rock", "prog rock"],
  hiphop: ["hip-hop", "rap", "hip hop", "trap", "drill", "grime"],
  latin: ["latin", "reggaeton", "salsa", "bachata", "cumbia", "latin pop"],
};

/**
 * Detect vibe from genres (fallback when no audio profile)
 */
function getVibeFromGenres(genres: string[]): VibeTag[] {
  const genreStr = genres.join(" ").toLowerCase();
  const vibes: VibeTag[] = [];

  // Check patterns in priority order
  if (GENRE_PATTERNS.mosh.some(g => genreStr.includes(g))) {
    vibes.push("Chaotic mosh energy");
  }
  if (GENRE_PATTERNS.rave.some(g => genreStr.includes(g))) {
    vibes.push("Late-night warehouse rave");
  }
  if (GENRE_PATTERNS.dance.some(g => genreStr.includes(g))) {
    vibes.push("Dance all night");
  }
  if (GENRE_PATTERNS.acoustic.some(g => genreStr.includes(g))) {
    vibes.push("Intimate acoustic storytelling");
  }
  if (GENRE_PATTERNS.sad.some(g => genreStr.includes(g))) {
    vibes.push("Sit-down, cry-in-your-feels");
  }
  if (GENRE_PATTERNS.jazz.some(g => genreStr.includes(g))) {
    vibes.push("Sophisticated jazz evening");
  }
  if (GENRE_PATTERNS.chill.some(g => genreStr.includes(g))) {
    vibes.push("Chill Sunday vibes");
  }
  if (GENRE_PATTERNS.rock.some(g => genreStr.includes(g))) {
    vibes.push("Guitar hero worship");
  }

  return vibes;
}

/**
 * Generate vibe tags based on audio features and genres
 * 
 * Rules based on audio features:
 * - Energy > 0.8 + Tempo > 130 → "Dance all night"
 * - Acousticness > 0.7 + Energy < 0.4 → "Intimate acoustic storytelling"
 * - Energy > 0.9 + genres include metal/punk/rock → "Chaotic mosh energy"
 * - Energy > 0.7 + Tempo > 140 + genres include techno/house → "Late-night warehouse rave"
 * - Valence < 0.3 + genres include indie/folk → "Sit-down, cry-in-your-feels"
 * - Danceability > 0.8 → "High-BPM workout energy"
 * - Energy < 0.4 + Valence > 0.5 → "Chill Sunday vibes"
 * - Instrumentalness > 0.5 + genres include jazz → "Sophisticated jazz evening"
 */
export function generateVibeTags(
  artistAudio: ArtistAudioProfile | null,
  genres: string[],
  venueCapacity?: number
): VibeResult {
  const candidates: Array<{ tag: VibeTag; score: number }> = [];
  const genreStr = genres.join(" ").toLowerCase();

  // If we have audio profile, use audio-feature based rules
  if (artistAudio) {
    const { avgEnergy, avgValence, avgTempo, avgDanceability, avgAcousticness, avgInstrumentalness } = artistAudio;

    // High energy + fast tempo = dance party
    if (avgEnergy > 0.8 && avgTempo > 130) {
      candidates.push({ tag: "Dance all night", score: avgEnergy + (avgTempo - 130) / 50 });
    }

    // Acoustic + low energy = intimate storytelling
    if (avgAcousticness > 0.7 && avgEnergy < 0.4) {
      candidates.push({ tag: "Intimate acoustic storytelling", score: avgAcousticness + (1 - avgEnergy) });
    }

    // Ultra high energy + rock/metal genres = mosh pit
    if (avgEnergy > 0.9 && GENRE_PATTERNS.mosh.some(g => genreStr.includes(g))) {
      candidates.push({ tag: "Chaotic mosh energy", score: avgEnergy + 0.5 });
    }

    // High energy + fast tempo + electronic = warehouse rave
    if (avgEnergy > 0.7 && avgTempo > 140 && GENRE_PATTERNS.rave.some(g => genreStr.includes(g))) {
      candidates.push({ tag: "Late-night warehouse rave", score: avgEnergy + (avgTempo - 140) / 30 });
    }

    // Festival mainstage - high energy, mainstream genres, big venues
    if (avgEnergy > 0.75 && avgDanceability > 0.7 && venueCapacity && venueCapacity > 10000) {
      candidates.push({ tag: "Festival mainstage energy", score: avgEnergy + avgDanceability });
    }

    // Low valence + indie/folk = emotional crying
    if (avgValence < 0.3 && (GENRE_PATTERNS.sad.some(g => genreStr.includes(g)) || GENRE_PATTERNS.acoustic.some(g => genreStr.includes(g)))) {
      candidates.push({ tag: "Sit-down, cry-in-your-feels", score: (1 - avgValence) + 0.5 });
    }

    // High danceability = workout energy
    if (avgDanceability > 0.8 && avgTempo > 120) {
      candidates.push({ tag: "High-BPM workout energy", score: avgDanceability + avgEnergy });
    }

    // Low energy + positive valence = chill vibes
    if (avgEnergy < 0.4 && avgValence > 0.5) {
      candidates.push({ tag: "Chill Sunday vibes", score: (1 - avgEnergy) + avgValence });
    }

    // Instrumental + jazz genres = sophisticated evening
    if (avgInstrumentalness > 0.5 && GENRE_PATTERNS.jazz.some(g => genreStr.includes(g))) {
      candidates.push({ tag: "Sophisticated jazz evening", score: avgInstrumentalness + 0.5 });
    }

    // High energy rock = guitar hero
    if (avgEnergy > 0.7 && GENRE_PATTERNS.rock.some(g => genreStr.includes(g))) {
      candidates.push({ tag: "Guitar hero worship", score: avgEnergy + 0.3 });
    }

    // Emotional range (high variance between tracks suggests emotional journey)
    // For now, use valence as a proxy
    if (avgValence > 0.4 && avgValence < 0.6 && avgEnergy > 0.5 && avgEnergy < 0.8) {
      candidates.push({ tag: "Emotional rollercoaster", score: 0.8 });
    }
  }

  // Fallback: Use genre-based detection
  if (candidates.length === 0) {
    const genreVibes = getVibeFromGenres(genres);
    genreVibes.forEach((tag, index) => {
      candidates.push({ tag, score: 1 - index * 0.1 }); // Decreasing scores for genre matches
    });
  }

  // Small venue bonus for "intimate" and "underground" vibes
  if (venueCapacity && venueCapacity < 500) {
    candidates.push({ tag: "Underground discovery", score: 0.7 });
    // Boost intimate vibes for small venues
    candidates.forEach(c => {
      if (c.tag === "Intimate acoustic storytelling") {
        c.score += 0.3;
      }
    });
  }

  // Sort by score and pick top 2
  candidates.sort((a, b) => b.score - a.score);

  // Default fallback
  const primary: VibeTag = candidates[0]?.tag || "Underground discovery";
  const secondary: VibeTag | undefined = candidates[1]?.tag !== primary ? candidates[1]?.tag : undefined;

  const config = VIBE_CONFIG[primary];

  return {
    primary,
    secondary,
    emoji: config.emoji,
    color: config.color,
    bgColor: config.bgColor,
    borderColor: config.borderColor,
  };
}

/**
 * Get vibe tag config for display
 */
export function getVibeConfig(tag: VibeTag): typeof VIBE_CONFIG[VibeTag] {
  return VIBE_CONFIG[tag];
}

/**
 * Generate a short description for a vibe tag
 */
export function getVibeDescription(tag: VibeTag): string {
  const descriptions: Record<VibeTag, string> = {
    "Dance all night": "High-energy beats to keep you moving",
    "Intimate acoustic storytelling": "Stripped-down, up-close musical moments",
    "Chaotic mosh energy": "Loud, fast, and absolutely unhinged",
    "Late-night warehouse rave": "Underground electronic until sunrise",
    "Festival mainstage energy": "Big production, bigger crowds",
    "Sit-down, cry-in-your-feels": "Bring tissues, you'll need them",
    "Sophisticated jazz evening": "Smooth sounds for refined ears",
    "High-BPM workout energy": "Pure cardio in concert form",
    "Chill Sunday vibes": "Easy listening, good company",
    "Guitar hero worship": "Face-melting riffs and power chords",
    "Emotional rollercoaster": "Highs, lows, and everything between",
    "Underground discovery": "Hidden gems and new favorites",
  };
  return descriptions[tag];
}
