/**
 * Stageside Matching Algorithm v2
 * 
 * Sophisticated concert-to-user matching with:
 * - Related artist matching via Spotify
 * - Fuzzy string matching for artist names
 * - Genre affinity scoring
 * - Personalized match reasons
 */

// Genre affinity map - genres that often appeal to same listeners
const GENRE_AFFINITIES: Record<string, { related: string[]; strength: number }> = {
  // Rock family
  "rock": { related: ["alternative", "indie rock", "hard rock", "classic rock", "punk rock"], strength: 0.8 },
  "alternative": { related: ["indie", "rock", "indie rock", "alternative rock", "grunge"], strength: 0.85 },
  "indie": { related: ["indie rock", "indie pop", "alternative", "folk", "lo-fi"], strength: 0.85 },
  "indie rock": { related: ["indie", "alternative", "rock", "indie pop", "garage rock"], strength: 0.9 },
  "punk": { related: ["punk rock", "rock", "hardcore", "pop punk", "alternative"], strength: 0.8 },
  "metal": { related: ["hard rock", "rock", "heavy metal", "progressive metal"], strength: 0.75 },
  
  // Electronic family
  "electronic": { related: ["edm", "house", "techno", "dance", "electronica", "synth"], strength: 0.85 },
  "edm": { related: ["electronic", "house", "dance", "dubstep", "trance"], strength: 0.9 },
  "house": { related: ["electronic", "edm", "deep house", "tech house", "dance"], strength: 0.9 },
  "techno": { related: ["electronic", "house", "minimal", "industrial"], strength: 0.85 },
  
  // Hip-hop family
  "hip-hop": { related: ["rap", "hip hop", "trap", "r&b", "urban"], strength: 0.9 },
  "rap": { related: ["hip-hop", "hip hop", "trap", "r&b", "underground hip hop"], strength: 0.95 },
  "trap": { related: ["hip-hop", "rap", "southern hip hop"], strength: 0.85 },
  
  // Pop family
  "pop": { related: ["indie pop", "synth-pop", "dance pop", "electropop", "art pop"], strength: 0.8 },
  "indie pop": { related: ["indie", "pop", "dream pop", "indie rock", "synth-pop"], strength: 0.85 },
  "synth-pop": { related: ["electronic", "pop", "new wave", "synthwave"], strength: 0.85 },
  
  // R&B/Soul family
  "r&b": { related: ["soul", "neo-soul", "hip-hop", "contemporary r&b", "urban"], strength: 0.85 },
  "soul": { related: ["r&b", "neo-soul", "funk", "motown"], strength: 0.9 },
  "neo-soul": { related: ["soul", "r&b", "jazz", "funk"], strength: 0.9 },
  
  // Folk/Acoustic family
  "folk": { related: ["indie folk", "acoustic", "singer-songwriter", "americana", "country"], strength: 0.85 },
  "singer-songwriter": { related: ["folk", "acoustic", "indie", "americana"], strength: 0.85 },
  "acoustic": { related: ["folk", "singer-songwriter", "unplugged"], strength: 0.9 },
  
  // Jazz family
  "jazz": { related: ["smooth jazz", "jazz fusion", "bebop", "blues", "soul"], strength: 0.8 },
  "blues": { related: ["jazz", "soul", "rock", "rhythm and blues"], strength: 0.85 },
  
  // Country family
  "country": { related: ["americana", "folk", "country rock", "bluegrass", "outlaw country"], strength: 0.85 },
  "americana": { related: ["folk", "country", "roots", "alt-country"], strength: 0.9 },
  
  // World/Latin
  "latin": { related: ["reggaeton", "latin pop", "salsa", "bachata", "cumbia"], strength: 0.85 },
  "reggaeton": { related: ["latin", "latin trap", "urban latin", "hip-hop"], strength: 0.9 },
};

// Common artist name variations to handle
const ARTIST_ALIASES: Record<string, string[]> = {
  "kanye west": ["ye", "kanye"],
  "the weeknd": ["weeknd", "the weekend"],
  "post malone": ["posty", "post"],
  "tyler the creator": ["tyler", "tyler, the creator"],
  "childish gambino": ["donald glover"],
  "bon iver": ["bon iver", "boniver"],
  "a$ap rocky": ["asap rocky", "aap rocky"],
  "joey badass": ["joey bada$$", "joey badass"],
  "twenty one pilots": ["21 pilots", "twentyone pilots"],
  "blink-182": ["blink 182", "blink182"],
  "n.e.r.d": ["nerd", "n*e*r*d"],
};

/**
 * Normalize artist name for comparison
 */
function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, "'")
    .replace(/[^a-z0-9\s']/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate string similarity using Levenshtein distance
 */
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

/**
 * Check if two artist names match (handles aliases and fuzzy matching)
 */
function artistNamesMatch(name1: string, name2: string): { matches: boolean; confidence: number } {
  const n1 = normalizeArtistName(name1);
  const n2 = normalizeArtistName(name2);
  
  // Exact match
  if (n1 === n2) {
    return { matches: true, confidence: 1.0 };
  }
  
  // Check aliases
  const aliases1 = ARTIST_ALIASES[n1] || [];
  const aliases2 = ARTIST_ALIASES[n2] || [];
  
  if (aliases1.includes(n2) || aliases2.includes(n1)) {
    return { matches: true, confidence: 0.95 };
  }
  
  // Check if one contains the other (e.g., "Taylor Swift" in "Taylor Swift ft. Ed Sheeran")
  if (n1.length >= 5 && n2.includes(n1)) {
    return { matches: true, confidence: 0.9 };
  }
  if (n2.length >= 5 && n1.includes(n2)) {
    return { matches: true, confidence: 0.9 };
  }
  
  // Fuzzy match for typos/variations
  const similarity = stringSimilarity(n1, n2);
  if (similarity >= 0.85) {
    return { matches: true, confidence: similarity };
  }
  
  return { matches: false, confidence: 0 };
}

/**
 * Check genre match with affinity scoring
 */
function genreMatch(
  concertGenres: string[],
  userGenres: string[]
): { score: number; matchedGenres: string[]; type: "direct" | "affinity" | "none" } {
  const normalizedConcert = concertGenres.map(g => g.toLowerCase());
  const normalizedUser = userGenres.map(g => g.toLowerCase());
  
  // Check direct matches first
  const directMatches: string[] = [];
  for (const cg of normalizedConcert) {
    for (const ug of normalizedUser) {
      if (cg === ug || cg.includes(ug) || ug.includes(cg)) {
        directMatches.push(cg);
      }
    }
  }
  
  if (directMatches.length > 0) {
    const score = Math.min(40, 20 + directMatches.length * 10);
    return { score, matchedGenres: directMatches, type: "direct" };
  }
  
  // Check affinity matches
  for (const ug of normalizedUser) {
    const affinity = GENRE_AFFINITIES[ug];
    if (affinity) {
      for (const cg of normalizedConcert) {
        const isRelated = affinity.related.some(r => 
          cg.includes(r) || r.includes(cg)
        );
        if (isRelated) {
          return { 
            score: Math.round(25 * affinity.strength), 
            matchedGenres: [cg], 
            type: "affinity" 
          };
        }
      }
    }
  }
  
  return { score: 0, matchedGenres: [], type: "none" };
}

export interface MatchResult {
  score: number;
  reasons: string[];
  matchType: "direct-artist" | "related-artist" | "recently-played" | "genre" | "discovery";
  confidence: number;
}

export interface UserProfile {
  topArtists: Array<{ name: string; rank: number }>;
  relatedArtists?: Array<{ name: string; relatedTo: string }>;
  recentlyPlayed?: string[];
  topGenres: string[];
}

/**
 * Calculate comprehensive match score
 */
export function calculateMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  userProfile: UserProfile
): MatchResult {
  let bestScore = 0;
  let bestReasons: string[] = [];
  let matchType: MatchResult["matchType"] = "discovery";
  let confidence = 0;

  const { topArtists, relatedArtists = [], recentlyPlayed = [], topGenres } = userProfile;

  // 1. Check direct artist matches (highest priority: 80-150 points)
  for (const concertArtist of concertArtists) {
    for (const userArtist of topArtists) {
      const { matches, confidence: matchConfidence } = artistNamesMatch(
        concertArtist,
        userArtist.name
      );
      
      if (matches) {
        // Score based on artist rank (top 10 = highest)
        const rankBonus = Math.max(0, 50 - userArtist.rank * 3);
        const score = Math.round(100 * matchConfidence) + rankBonus;
        
        if (score > bestScore) {
          bestScore = score;
          confidence = matchConfidence;
          matchType = "direct-artist";
          
          if (userArtist.rank <= 5) {
            bestReasons = [`One of your top 5 artists`];
          } else if (userArtist.rank <= 20) {
            bestReasons = [`You love ${userArtist.name}`];
          } else {
            bestReasons = [`Based on your taste in ${userArtist.name}`];
          }
        }
      }
    }
  }

  // If direct match found with high confidence, return early
  if (bestScore >= 100 && confidence >= 0.9) {
    return { score: bestScore, reasons: bestReasons, matchType, confidence };
  }

  // 2. Check related artists (60-80 points)
  if (bestScore < 80) {
    for (const concertArtist of concertArtists) {
      for (const related of relatedArtists) {
        const { matches, confidence: matchConfidence } = artistNamesMatch(
          concertArtist,
          related.name
        );
        
        if (matches) {
          const score = Math.round(70 * matchConfidence);
          if (score > bestScore) {
            bestScore = score;
            confidence = matchConfidence;
            matchType = "related-artist";
            bestReasons = [`Similar to ${related.relatedTo} you listen to`];
          }
        }
      }
    }
  }

  // 3. Check recently played (50-65 points)
  if (bestScore < 60 && recentlyPlayed.length > 0) {
    for (const concertArtist of concertArtists) {
      for (const recentArtist of recentlyPlayed) {
        const { matches, confidence: matchConfidence } = artistNamesMatch(
          concertArtist,
          recentArtist
        );
        
        if (matches) {
          const score = Math.round(60 * matchConfidence);
          if (score > bestScore) {
            bestScore = score;
            confidence = matchConfidence;
            matchType = "recently-played";
            bestReasons = [`You recently played ${recentArtist}`];
          }
        }
      }
    }
  }

  // 4. Genre matching (15-40 points)
  if (bestScore < 50) {
    const genreResult = genreMatch(concertGenres, topGenres);
    if (genreResult.score > 0 && genreResult.score > bestScore) {
      bestScore = genreResult.score;
      matchType = "genre";
      confidence = genreResult.type === "direct" ? 0.7 : 0.5;
      
      const genre = genreResult.matchedGenres[0];
      if (genreResult.type === "direct") {
        bestReasons = [`Matches your ${genre} taste`];
      } else {
        bestReasons = [`You might like this ${genre} show`];
      }
    }
  }

  // 5. Discovery fallback
  if (bestReasons.length === 0) {
    bestReasons = ["Happening near you"];
    matchType = "discovery";
    confidence = 0;
  }

  return { score: bestScore, reasons: bestReasons, matchType, confidence };
}

/**
 * Format match score for display (normalized 0-100)
 */
export function formatMatchScore(score: number): number {
  // Normalize to 0-100 range
  // 100+ points = 90-100 (top artist)
  // 60-99 points = 70-89 (related/recent)
  // 30-59 points = 50-69 (genre)
  // 0-29 points = 0-49 (discovery)
  
  if (score >= 100) return Math.min(100, 85 + Math.floor(score / 10));
  if (score >= 60) return 65 + Math.floor((score - 60) / 3);
  if (score >= 30) return 45 + Math.floor((score - 30) / 2);
  return Math.floor(score * 1.5);
}

/**
 * Generate descriptive vibe/mood tags based on match
 */
export function generateVibeTags(
  matchType: MatchResult["matchType"],
  genres: string[]
): string[] {
  const tags: string[] = [];
  
  // Add match-type based tag
  switch (matchType) {
    case "direct-artist":
      tags.push("Must-see");
      break;
    case "related-artist":
      tags.push("For you");
      break;
    case "recently-played":
      tags.push("Fresh pick");
      break;
    case "genre":
      tags.push("Your vibe");
      break;
  }
  
  // Add genre-based mood tags
  const genreLower = genres.map(g => g.toLowerCase()).join(" ");
  
  if (genreLower.includes("chill") || genreLower.includes("ambient") || genreLower.includes("lo-fi")) {
    tags.push("Chill");
  }
  if (genreLower.includes("dance") || genreLower.includes("house") || genreLower.includes("edm")) {
    tags.push("High energy");
  }
  if (genreLower.includes("indie") || genreLower.includes("alternative")) {
    tags.push("Intimate");
  }
  if (genreLower.includes("metal") || genreLower.includes("punk") || genreLower.includes("rock")) {
    tags.push("Loud");
  }
  if (genreLower.includes("jazz") || genreLower.includes("classical") || genreLower.includes("acoustic")) {
    tags.push("Sophisticated");
  }
  
  return tags.slice(0, 2); // Max 2 tags
}
