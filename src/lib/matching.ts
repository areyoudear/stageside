/**
 * Stageside Matching Algorithm V3 - Precision Scoring
 * 
 * Continuous 0-100 scoring with nuanced reasons:
 * - Artist Score: 0-35 (continuous decay based on rank)
 * - Related Artist Score: 0-25 (weighted by similarity strength)
 * - Audio DNA Score: 0-20 (energy/tempo/vibe matching)
 * - Genre Score: 0-10 (genre affinity)
 * - Discovery Bonus: 0-5 (emerging artists in taste profile)
 * - Social Bonus: 0-5 (friends interested/going)
 */

// ============================================
// TYPES
// ============================================

export interface UserAudioProfile {
  avgDanceability: number;      // 0-1
  avgEnergy: number;            // 0-1
  avgValence: number;           // 0-1: Musical positivity
  avgTempo: number;             // BPM (typically 60-180)
  avgAcousticness: number;      // 0-1
  avgInstrumentalness: number;  // 0-1
  avgLiveness: number;          // 0-1
  avgSpeechiness: number;       // 0-1
  energyRange: [number, number];
  tempoRange: [number, number];
}

export interface ArtistAudioProfile {
  artistId: string;
  artistName: string;
  avgEnergy: number;
  avgValence: number;
  avgTempo: number;
  avgDanceability: number;
  avgAcousticness: number;
  topTrackPreviewUrl?: string;
  topTrackName?: string;
}

export interface UserProfile {
  topArtists: Array<{ name: string; rank: number; genres?: string[] }>;
  relatedArtists?: Array<{ name: string; relatedTo: string; similarity?: number }>;
  recentlyPlayed?: string[];
  topGenres: string[];
}

export interface SocialSignals {
  friendsInterested: number;
  friendsGoing: number;
  friendNames?: string[];  // For personalized reasons
}

export interface ScoreBreakdown {
  artistScore: number;      // 0-35
  relatedScore: number;     // 0-25
  audioScore: number;       // 0-20
  genreScore: number;       // 0-10
  discoveryBonus: number;   // 0-5
  socialBonus: number;      // 0-5
}

export type MatchType = "must-see" | "for-you" | "vibe-match" | "discovery";

export interface PreciseMatchResult {
  score: number;              // 0-100, continuous
  confidence: number;         // 0-1, how confident in the match
  matchType: MatchType;
  reasons: string[];          // Nuanced human-readable reasons
  breakdown: ScoreBreakdown;
  matchedArtist?: string;     // Which artist triggered the match
  matchedArtistRank?: number; // User's rank for that artist
}

// ============================================
// GENRE AFFINITIES
// ============================================

const GENRE_AFFINITIES: Record<string, { related: string[]; strength: number }> = {
  // Rock family
  "rock": { related: ["alternative", "indie rock", "hard rock", "classic rock", "punk rock", "grunge"], strength: 0.8 },
  "alternative": { related: ["indie", "rock", "indie rock", "alternative rock", "grunge", "post-punk"], strength: 0.85 },
  "indie": { related: ["indie rock", "indie pop", "alternative", "folk", "lo-fi", "dream pop"], strength: 0.85 },
  "indie rock": { related: ["indie", "alternative", "rock", "indie pop", "garage rock"], strength: 0.9 },
  "punk": { related: ["punk rock", "rock", "hardcore", "pop punk", "alternative", "post-punk"], strength: 0.8 },
  "metal": { related: ["hard rock", "rock", "heavy metal", "progressive metal", "death metal"], strength: 0.75 },
  
  // Electronic family
  "electronic": { related: ["edm", "house", "techno", "dance", "electronica", "synth", "ambient"], strength: 0.85 },
  "edm": { related: ["electronic", "house", "dance", "dubstep", "trance", "progressive house"], strength: 0.9 },
  "house": { related: ["electronic", "edm", "deep house", "tech house", "dance", "disco"], strength: 0.9 },
  "techno": { related: ["electronic", "house", "minimal", "industrial", "tech house"], strength: 0.85 },
  
  // Hip-hop family
  "hip-hop": { related: ["rap", "hip hop", "trap", "r&b", "urban", "boom bap"], strength: 0.9 },
  "rap": { related: ["hip-hop", "hip hop", "trap", "r&b", "underground hip hop"], strength: 0.95 },
  "trap": { related: ["hip-hop", "rap", "southern hip hop", "drill"], strength: 0.85 },
  
  // Pop family
  "pop": { related: ["indie pop", "synth-pop", "dance pop", "electropop", "art pop", "dream pop"], strength: 0.8 },
  "indie pop": { related: ["indie", "pop", "dream pop", "indie rock", "synth-pop"], strength: 0.85 },
  "synth-pop": { related: ["electronic", "pop", "new wave", "synthwave", "electropop"], strength: 0.85 },
  
  // R&B/Soul family
  "r&b": { related: ["soul", "neo-soul", "hip-hop", "contemporary r&b", "urban", "funk"], strength: 0.85 },
  "soul": { related: ["r&b", "neo-soul", "funk", "motown", "gospel"], strength: 0.9 },
  "neo-soul": { related: ["soul", "r&b", "jazz", "funk", "alternative r&b"], strength: 0.9 },
  
  // Folk/Acoustic family
  "folk": { related: ["indie folk", "acoustic", "singer-songwriter", "americana", "country", "bluegrass"], strength: 0.85 },
  "singer-songwriter": { related: ["folk", "acoustic", "indie", "americana", "soft rock"], strength: 0.85 },
  "acoustic": { related: ["folk", "singer-songwriter", "unplugged", "indie folk"], strength: 0.9 },
  
  // Jazz family
  "jazz": { related: ["smooth jazz", "jazz fusion", "bebop", "blues", "soul", "bossa nova"], strength: 0.8 },
  "blues": { related: ["jazz", "soul", "rock", "rhythm and blues", "country blues"], strength: 0.85 },
  
  // Country family
  "country": { related: ["americana", "folk", "country rock", "bluegrass", "outlaw country", "country pop"], strength: 0.85 },
  "americana": { related: ["folk", "country", "roots", "alt-country", "bluegrass"], strength: 0.9 },
  
  // World/Latin
  "latin": { related: ["reggaeton", "latin pop", "salsa", "bachata", "cumbia", "latin trap"], strength: 0.85 },
  "reggaeton": { related: ["latin", "latin trap", "urban latin", "hip-hop", "dancehall"], strength: 0.9 },
};

// Artist name aliases for fuzzy matching
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

// ============================================
// UTILITY FUNCTIONS
// ============================================

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
 * Levenshtein distance for fuzzy matching
 */
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
 * Calculate string similarity (0-1)
 */
function stringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1.0;
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Check if two artist names match (handles aliases and fuzzy matching)
 */
function artistNamesMatch(name1: string, name2: string): { matches: boolean; confidence: number } {
  const n1 = normalizeArtistName(name1);
  const n2 = normalizeArtistName(name2);
  
  if (n1 === n2) return { matches: true, confidence: 1.0 };
  
  // Check aliases
  const aliases1 = ARTIST_ALIASES[n1] || [];
  const aliases2 = ARTIST_ALIASES[n2] || [];
  if (aliases1.includes(n2) || aliases2.includes(n1)) {
    return { matches: true, confidence: 0.95 };
  }
  
  // Check containment
  if (n1.length >= 5 && n2.includes(n1)) return { matches: true, confidence: 0.9 };
  if (n2.length >= 5 && n1.includes(n2)) return { matches: true, confidence: 0.9 };
  
  // Fuzzy match
  const similarity = stringSimilarity(n1, n2);
  if (similarity >= 0.85) return { matches: true, confidence: similarity };
  
  return { matches: false, confidence: 0 };
}

// ============================================
// SCORE COMPONENTS
// ============================================

/**
 * Calculate Artist Score (0-35 points)
 * Uses continuous decay based on rank, not buckets
 */
function calculateArtistScore(
  concertArtists: string[],
  userTopArtists: Array<{ name: string; rank: number }>
): { score: number; matchedArtist?: string; matchedRank?: number; confidence: number } {
  let bestScore = 0;
  let matchedArtist: string | undefined;
  let matchedRank: number | undefined;
  let confidence = 0;

  for (const concertArtist of concertArtists) {
    for (const userArtist of userTopArtists) {
      const match = artistNamesMatch(concertArtist, userArtist.name);
      
      if (match.matches) {
        const rank = userArtist.rank;
        let score: number;
        
        // Continuous scoring based on rank
        // Rank 1-3: 35-34 points (top tier)
        // Rank 4-10: 30-33.5 points (high tier)
        // Rank 11-25: 22-29.5 points (mid tier)
        // Rank 26-50: 15-21.5 points (low tier)
        
        if (rank <= 3) {
          // Top 3: 35, 34.5, 34
          score = 35 - (rank - 1) * 0.5;
        } else if (rank <= 10) {
          // Rank 4-10: 33.5 down to 30
          score = 34 - (rank - 3) * 0.5;
        } else if (rank <= 25) {
          // Rank 11-25: 29.5 down to 22
          score = 30 - (rank - 10) * 0.5;
        } else if (rank <= 50) {
          // Rank 26-50: 21.5 down to 15
          score = 22 - (rank - 25) * 0.26;
        } else {
          // Beyond top 50: minimal score
          score = Math.max(5, 15 - (rank - 50) * 0.2);
        }
        
        // Apply match confidence
        score *= match.confidence;
        
        if (score > bestScore) {
          bestScore = score;
          matchedArtist = concertArtist;
          matchedRank = rank;
          confidence = match.confidence;
        }
      }
    }
  }

  return { 
    score: Math.round(bestScore * 10) / 10, 
    matchedArtist, 
    matchedRank,
    confidence 
  };
}

/**
 * Calculate Related Artist Score (0-25 points)
 * Weighted by similarity strength and the rank of the related artist
 */
function calculateRelatedScore(
  concertArtists: string[],
  relatedArtists: Array<{ name: string; relatedTo: string; similarity?: number }>
): { score: number; matchedArtist?: string; relatedTo?: string } {
  let bestScore = 0;
  let matchedArtist: string | undefined;
  let relatedTo: string | undefined;

  for (const concertArtist of concertArtists) {
    for (const related of relatedArtists) {
      const match = artistNamesMatch(concertArtist, related.name);
      
      if (match.matches) {
        // Base score of 25, modified by similarity (default 0.7 if not provided)
        const similarity = related.similarity || 0.7;
        const score = 25 * similarity * match.confidence;
        
        if (score > bestScore) {
          bestScore = score;
          matchedArtist = concertArtist;
          relatedTo = related.relatedTo;
        }
      }
    }
  }

  return { 
    score: Math.round(bestScore * 10) / 10, 
    matchedArtist, 
    relatedTo 
  };
}

/**
 * Calculate Audio DNA Score (0-20 points)
 * Compares user's audio preferences with artist's audio profile
 */
function calculateAudioScore(
  userAudio: UserAudioProfile | null,
  artistAudio: ArtistAudioProfile | null
): { score: number; insights: string[] } {
  if (!userAudio || !artistAudio) {
    return { score: 0, insights: [] };
  }

  const insights: string[] = [];
  
  // Calculate feature similarities (0-1 scale)
  
  // Energy similarity (35% weight)
  const energyDiff = Math.abs(userAudio.avgEnergy - artistAudio.avgEnergy);
  const energySimilarity = 1 - energyDiff;
  
  // Tempo similarity (25% weight) - within ±20 BPM is perfect
  const tempoDiff = Math.abs(userAudio.avgTempo - artistAudio.avgTempo);
  const tempoSimilarity = tempoDiff <= 20 ? 1 : Math.max(0, 1 - (tempoDiff - 20) / 60);
  
  // Valence similarity (20% weight)
  const valenceDiff = Math.abs(userAudio.avgValence - artistAudio.avgValence);
  const valenceSimilarity = 1 - valenceDiff;
  
  // Danceability similarity (20% weight)
  const danceDiff = Math.abs(userAudio.avgDanceability - artistAudio.avgDanceability);
  const danceSimilarity = 1 - danceDiff;
  
  // Weighted average
  const weightedSimilarity = 
    energySimilarity * 0.35 +
    tempoSimilarity * 0.25 +
    valenceSimilarity * 0.20 +
    danceSimilarity * 0.20;
  
  // Generate insights based on matches
  if (energySimilarity > 0.85) {
    if (artistAudio.avgEnergy > 0.7) {
      insights.push("high-energy");
    } else if (artistAudio.avgEnergy < 0.4) {
      insights.push("chill-vibes");
    }
  }
  
  if (tempoSimilarity > 0.85) {
    insights.push("tempo-match");
  }
  
  if (valenceSimilarity > 0.85) {
    if (artistAudio.avgValence > 0.6) {
      insights.push("feel-good");
    } else if (artistAudio.avgValence < 0.4) {
      insights.push("moody");
    }
  }
  
  if (danceSimilarity > 0.85 && artistAudio.avgDanceability > 0.7) {
    insights.push("dance-floor");
  }
  
  return { 
    score: Math.round(weightedSimilarity * 20 * 10) / 10,
    insights
  };
}

/**
 * Calculate Genre Score (0-10 points)
 * Uses genre affinities for nuanced matching
 */
function calculateGenreScore(
  concertGenres: string[],
  userGenres: string[]
): { score: number; matchedGenres: string[]; matchType: "direct" | "affinity" | "none" } {
  const normalizedConcert = concertGenres.map(g => g.toLowerCase());
  const normalizedUser = userGenres.map(g => g.toLowerCase());
  
  // Check direct matches
  const directMatches: string[] = [];
  for (const cg of normalizedConcert) {
    for (const ug of normalizedUser) {
      if (cg === ug || cg.includes(ug) || ug.includes(cg)) {
        directMatches.push(cg);
      }
    }
  }
  
  if (directMatches.length > 0) {
    // Score based on number of matches and position in user's genre list
    const baseScore = Math.min(10, 6 + directMatches.length * 1.5);
    return { score: baseScore, matchedGenres: directMatches, matchType: "direct" };
  }
  
  // Check affinity matches
  let bestAffinityScore = 0;
  let affinityGenre = "";
  
  for (const ug of normalizedUser.slice(0, 15)) {
    const affinity = GENRE_AFFINITIES[ug];
    if (affinity) {
      for (const cg of normalizedConcert) {
        const isRelated = affinity.related.some(r => 
          cg.includes(r) || r.includes(cg)
        );
        if (isRelated) {
          const score = 7 * affinity.strength;
          if (score > bestAffinityScore) {
            bestAffinityScore = score;
            affinityGenre = cg;
          }
        }
      }
    }
  }
  
  if (bestAffinityScore > 0) {
    return { 
      score: Math.round(bestAffinityScore * 10) / 10, 
      matchedGenres: [affinityGenre], 
      matchType: "affinity" 
    };
  }
  
  return { score: 0, matchedGenres: [], matchType: "none" };
}

/**
 * Calculate Discovery Bonus (0-5 points)
 * Bonus for emerging artists that match user's taste profile
 */
function calculateDiscoveryBonus(
  concertArtists: string[],
  artistAudioProfiles: Map<string, ArtistAudioProfile>,
  userAudio: UserAudioProfile | null,
  userGenres: string[]
): { score: number; isDiscovery: boolean } {
  if (!userAudio) return { score: 0, isDiscovery: false };
  
  // Check if this is a discovery (artist not in user's top artists)
  // but matches their audio profile well
  for (const artist of concertArtists) {
    const artistAudio = artistAudioProfiles.get(normalizeArtistName(artist));
    if (artistAudio) {
      const audioResult = calculateAudioScore(userAudio, artistAudio);
      if (audioResult.score >= 14) { // 70% audio match
        return { score: 5, isDiscovery: true };
      } else if (audioResult.score >= 10) { // 50% audio match
        return { score: 3, isDiscovery: true };
      }
    }
  }
  
  return { score: 0, isDiscovery: false };
}

/**
 * Calculate Social Bonus (0-5 points)
 */
function calculateSocialBonus(
  social: SocialSignals
): { score: number; hasSocialSignal: boolean } {
  const score = Math.min(5, 
    social.friendsGoing * 2 + social.friendsInterested * 1
  );
  return { 
    score: Math.round(score * 10) / 10, 
    hasSocialSignal: score > 0 
  };
}

// ============================================
// REASON GENERATION
// ============================================

/**
 * Generate nuanced, personalized match reasons
 */
function generateMatchReasons(
  breakdown: ScoreBreakdown,
  matchedArtist: string | undefined,
  matchedRank: number | undefined,
  relatedTo: string | undefined,
  audioInsights: string[],
  matchedGenres: string[],
  genreMatchType: "direct" | "affinity" | "none",
  social: SocialSignals,
  isDiscovery: boolean
): string[] {
  const reasons: string[] = [];
  
  // Artist-based reasons (highest priority)
  if (breakdown.artistScore > 0 && matchedArtist && matchedRank) {
    if (matchedRank <= 3) {
      reasons.push(`Your #${matchedRank} most-played artist`);
    } else if (matchedRank <= 10) {
      reasons.push(`One of your top 10 favorites`);
    } else if (matchedRank <= 25) {
      reasons.push(`${matchedArtist} is in heavy rotation for you`);
    } else {
      reasons.push(`You've been listening to ${matchedArtist}`);
    }
    
    // Add audio insight if available
    if (audioInsights.length > 0) {
      const insight = audioInsights[0];
      if (insight === "high-energy") {
        reasons.push("High-energy show matching your workout DNA");
      } else if (insight === "chill-vibes") {
        reasons.push("Perfect chill vibes for your evening playlist energy");
      } else if (insight === "dance-floor") {
        reasons.push("Dance-heavy set matching your groove");
      }
    }
  }
  
  // Related artist reasons
  else if (breakdown.relatedScore > 0 && matchedArtist && relatedTo) {
    reasons.push(`Similar sonic DNA to ${relatedTo}`);
    
    if (audioInsights.includes("tempo-match")) {
      reasons.push("Same tempo range you love");
    } else if (audioInsights.includes("high-energy")) {
      reasons.push("Matching energy levels to your favorites");
    }
  }
  
  // Audio-only match (discovery)
  else if (breakdown.audioScore > 10 && isDiscovery) {
    const insightText = audioInsights.map(i => {
      switch (i) {
        case "high-energy": return "high-energy";
        case "chill-vibes": return "chill";
        case "dance-floor": return "danceable";
        case "tempo-match": return "perfect-tempo";
        case "feel-good": return "feel-good";
        case "moody": return "moody";
        default: return "";
      }
    }).filter(Boolean).join(", ");
    
    if (insightText) {
      reasons.push(`${insightText} vibes matching your listening DNA`);
    }
    reasons.push("This could be your next obsession");
  }
  
  // Genre-based reasons
  else if (breakdown.genreScore > 0 && matchedGenres.length > 0) {
    const genre = matchedGenres[0];
    if (genreMatchType === "direct") {
      reasons.push(`Fits your ${genre} obsession`);
    } else {
      reasons.push(`${genre} vibes you might dig`);
    }
  }
  
  // Social reasons
  if (breakdown.socialBonus > 0) {
    if (social.friendsGoing > 0 && social.friendNames?.length) {
      const name = social.friendNames[0];
      if (social.friendsGoing === 1) {
        reasons.push(`${name} is going`);
      } else {
        reasons.push(`${name} + ${social.friendsGoing - 1} more going`);
      }
    } else if (social.friendsInterested > 0) {
      reasons.push(`${social.friendsInterested} friends interested`);
    }
  }
  
  // Discovery fallback
  if (reasons.length === 0) {
    reasons.push("Discover something new near you");
  }
  
  return reasons.slice(0, 3); // Max 3 reasons
}

/**
 * Determine match type based on score breakdown
 */
function determineMatchType(breakdown: ScoreBreakdown): MatchType {
  if (breakdown.artistScore >= 30) return "must-see";
  if (breakdown.artistScore >= 15 || breakdown.relatedScore >= 15) return "for-you";
  if (breakdown.audioScore >= 10 || breakdown.genreScore >= 5) return "vibe-match";
  return "discovery";
}

// ============================================
// MAIN SCORING FUNCTION
// ============================================

/**
 * Calculate precise match score with continuous 0-100 scoring
 */
export function calculatePreciseMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  userProfile: UserProfile,
  userAudioProfile: UserAudioProfile | null = null,
  artistAudioProfiles: Map<string, ArtistAudioProfile> = new Map(),
  socialSignals: SocialSignals = { friendsInterested: 0, friendsGoing: 0 }
): PreciseMatchResult {
  // Get first artist's audio profile if available
  const primaryArtist = concertArtists[0];
  const artistAudio = primaryArtist 
    ? artistAudioProfiles.get(normalizeArtistName(primaryArtist)) || null
    : null;

  // Calculate all score components
  const artistResult = calculateArtistScore(concertArtists, userProfile.topArtists);
  const relatedResult = calculateRelatedScore(
    concertArtists, 
    userProfile.relatedArtists || []
  );
  const audioResult = calculateAudioScore(userAudioProfile, artistAudio);
  const genreResult = calculateGenreScore(concertGenres, userProfile.topGenres);
  const discoveryResult = calculateDiscoveryBonus(
    concertArtists,
    artistAudioProfiles,
    userAudioProfile,
    userProfile.topGenres
  );
  const socialResult = calculateSocialBonus(socialSignals);
  
  // Build breakdown
  const breakdown: ScoreBreakdown = {
    artistScore: artistResult.score,
    relatedScore: relatedResult.score,
    audioScore: audioResult.score,
    genreScore: genreResult.score,
    discoveryBonus: discoveryResult.score,
    socialBonus: socialResult.score,
  };
  
  // Calculate total score (cap at 100)
  const rawScore = 
    breakdown.artistScore +
    breakdown.relatedScore +
    breakdown.audioScore +
    breakdown.genreScore +
    breakdown.discoveryBonus +
    breakdown.socialBonus;
  
  const score = Math.min(100, Math.round(rawScore));
  
  // Calculate confidence based on data quality
  let confidence = 0;
  if (breakdown.artistScore > 0) confidence = Math.max(confidence, artistResult.confidence);
  if (breakdown.relatedScore > 0) confidence = Math.max(confidence, 0.7);
  if (breakdown.audioScore > 10) confidence = Math.max(confidence, 0.6);
  if (breakdown.genreScore > 5) confidence = Math.max(confidence, 0.5);
  if (confidence === 0) confidence = 0.3; // Base confidence for discoveries
  
  // Determine match type
  const matchType = determineMatchType(breakdown);
  
  // Generate reasons
  const reasons = generateMatchReasons(
    breakdown,
    artistResult.matchedArtist,
    artistResult.matchedRank,
    relatedResult.relatedTo,
    audioResult.insights,
    genreResult.matchedGenres,
    genreResult.matchType,
    socialSignals,
    discoveryResult.isDiscovery
  );
  
  return {
    score,
    confidence,
    matchType,
    reasons,
    breakdown,
    matchedArtist: artistResult.matchedArtist,
    matchedArtistRank: artistResult.matchedRank,
  };
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

export interface MatchResult {
  score: number;
  reasons: string[];
  matchType: "direct-artist" | "related-artist" | "recently-played" | "genre" | "discovery";
  confidence: number;
}

/**
 * Legacy function for backward compatibility
 * Wraps the new precise scoring system
 */
export function calculateMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  userProfile: UserProfile
): MatchResult {
  const result = calculatePreciseMatchScore(
    concertArtists,
    concertGenres,
    userProfile,
    null, // No audio profile in legacy mode
    new Map(), // No artist audio profiles
    { friendsInterested: 0, friendsGoing: 0 }
  );
  
  // Map new match types to legacy types
  const legacyMatchType = (() => {
    if (result.matchType === "must-see") return "direct-artist" as const;
    if (result.matchType === "for-you") {
      return result.breakdown.artistScore > 0 
        ? "direct-artist" as const 
        : "related-artist" as const;
    }
    if (result.matchType === "vibe-match") return "genre" as const;
    return "discovery" as const;
  })();
  
  return {
    score: result.score,
    reasons: result.reasons,
    matchType: legacyMatchType,
    confidence: result.confidence,
  };
}

/**
 * Format match score for display
 * Now just returns the score directly since it's already 0-100
 */
export function formatMatchScore(score: number): number {
  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Generate vibe tags based on match type and genres
 */
export function generateVibeTags(
  matchType: MatchResult["matchType"] | MatchType,
  genres: string[]
): string[] {
  const tags: string[] = [];
  
  // Match type tag
  switch (matchType) {
    case "direct-artist":
    case "must-see":
      tags.push("Must-see");
      break;
    case "related-artist":
    case "for-you":
      tags.push("For you");
      break;
    case "recently-played":
      tags.push("Fresh pick");
      break;
    case "genre":
    case "vibe-match":
      tags.push("Your vibe");
      break;
    case "discovery":
      tags.push("Discover");
      break;
  }
  
  // Genre-based vibe tags
  const genreLower = genres.map(g => g.toLowerCase()).join(" ");
  
  if (genreLower.includes("chill") || genreLower.includes("ambient") || genreLower.includes("lo-fi")) {
    tags.push("Chill");
  } else if (genreLower.includes("dance") || genreLower.includes("house") || genreLower.includes("edm")) {
    tags.push("High energy");
  } else if (genreLower.includes("indie") || genreLower.includes("folk") || genreLower.includes("acoustic")) {
    tags.push("Intimate");
  } else if (genreLower.includes("metal") || genreLower.includes("punk") || genreLower.includes("hardcore")) {
    tags.push("Loud");
  } else if (genreLower.includes("jazz") || genreLower.includes("classical") || genreLower.includes("blues")) {
    tags.push("Sophisticated");
  } else if (genreLower.includes("hip-hop") || genreLower.includes("rap") || genreLower.includes("trap")) {
    tags.push("Urban");
  } else if (genreLower.includes("pop") || genreLower.includes("rock")) {
    tags.push("Mainstream");
  }
  
  return tags.slice(0, 2);
}
