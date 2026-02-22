/**
 * Taste Compatibility Scoring
 * 
 * Calculates music taste compatibility between users based on:
 * - Shared artists (weighted by rank)
 * - Shared genres
 * - Audio profile similarity (if available)
 */

import { createAdminClient } from "@/lib/supabase";
import type { MusicServiceType } from "@/lib/music-types";

// Types
export interface TasteCompatibility {
  score: number; // 0-100
  sharedArtists: string[];
  sharedGenres: string[];
  audioSimilarity: number; // 0-1, based on audio profiles
  label: TasteLabel;
  explanation: string;
}

export type TasteLabel = 
  | "Soul twins" 
  | "Very similar" 
  | "Similar vibes" 
  | "Some overlap" 
  | "Different tastes";

interface UserArtist {
  artist_name: string;
  aggregated_score: number;
  genres: string[];
}

interface UserAudioProfile {
  avg_danceability?: number;
  avg_energy?: number;
  avg_valence?: number;
  avg_tempo?: number;
  avg_acousticness?: number;
}

/**
 * Get label based on compatibility score
 */
function getCompatibilityLabel(score: number): TasteLabel {
  if (score >= 85) return "Soul twins";
  if (score >= 70) return "Very similar";
  if (score >= 50) return "Similar vibes";
  if (score >= 25) return "Some overlap";
  return "Different tastes";
}

/**
 * Generate explanation based on shared content
 */
function generateExplanation(
  sharedArtists: string[],
  sharedGenres: string[],
  score: number
): string {
  if (score >= 85) {
    if (sharedArtists.length >= 3) {
      return `You both love ${sharedArtists.slice(0, 3).join(", ")}`;
    }
    return "Your music taste is remarkably similar!";
  }
  
  if (score >= 70) {
    if (sharedArtists.length >= 2) {
      return `${sharedArtists.slice(0, 2).join(" and ")} fans unite`;
    }
    if (sharedGenres.length >= 2) {
      return `Both into ${sharedGenres.slice(0, 2).join(" and ")}`;
    }
  }
  
  if (score >= 50) {
    if (sharedGenres.length > 0) {
      return `Both enjoy ${sharedGenres[0]}`;
    }
    if (sharedArtists.length > 0) {
      return `Both listen to ${sharedArtists[0]}`;
    }
  }
  
  if (score >= 25) {
    return "Some musical common ground";
  }
  
  return "Different music worlds — discover something new!";
}

/**
 * Calculate artist overlap score
 * Higher weight for artists that are ranked highly by both users
 */
function calculateArtistOverlap(
  user1Artists: UserArtist[],
  user2Artists: UserArtist[]
): { score: number; sharedArtists: string[] } {
  const user2ArtistMap = new Map<string, number>();
  user2Artists.forEach((artist, index) => {
    const normalizedName = artist.artist_name.toLowerCase();
    user2ArtistMap.set(normalizedName, index);
  });

  const sharedArtists: string[] = [];
  let overlapScore = 0;

  user1Artists.forEach((artist, index1) => {
    const normalizedName = artist.artist_name.toLowerCase();
    const index2 = user2ArtistMap.get(normalizedName);
    
    if (index2 !== undefined) {
      sharedArtists.push(artist.artist_name);
      
      // Weight by position in both lists (earlier = better)
      // Max contribution per artist is ~4 points (if #1 for both)
      const rank1Weight = Math.max(0, 1 - (index1 / 100));
      const rank2Weight = Math.max(0, 1 - (index2 / 100));
      const combinedWeight = (rank1Weight + rank2Weight) / 2;
      
      overlapScore += 4 * combinedWeight;
    }
  });

  // Normalize to 0-50 range (artists contribute up to 50% of total score)
  const normalizedScore = Math.min(50, overlapScore);
  
  return { score: normalizedScore, sharedArtists };
}

/**
 * Calculate genre overlap score
 */
function calculateGenreOverlap(
  user1Artists: UserArtist[],
  user2Artists: UserArtist[]
): { score: number; sharedGenres: string[] } {
  // Extract genre frequencies for both users
  const getGenreFreq = (artists: UserArtist[]): Map<string, number> => {
    const freq = new Map<string, number>();
    artists.forEach((artist, index) => {
      const weight = Math.max(0.1, 1 - (index / 100)); // Higher ranked = more weight
      artist.genres.forEach(genre => {
        const normalized = genre.toLowerCase();
        freq.set(normalized, (freq.get(normalized) || 0) + weight);
      });
    });
    return freq;
  };

  const user1Genres = getGenreFreq(user1Artists);
  const user2Genres = getGenreFreq(user2Artists);

  const sharedGenres: string[] = [];
  let overlapScore = 0;

  // Find overlapping genres weighted by importance to each user
  user1Genres.forEach((weight1, genre) => {
    const weight2 = user2Genres.get(genre);
    if (weight2) {
      sharedGenres.push(genre);
      overlapScore += Math.min(weight1, weight2);
    }
  });

  // Normalize to 0-30 range (genres contribute up to 30% of total score)
  const maxPossible = Math.max(
    Array.from(user1Genres.values()).reduce((a, b) => a + b, 0),
    Array.from(user2Genres.values()).reduce((a, b) => a + b, 0)
  );
  
  const normalizedScore = maxPossible > 0 
    ? (overlapScore / maxPossible) * 30 
    : 0;

  // Sort genres by combined importance
  sharedGenres.sort((a, b) => {
    const aScore = (user1Genres.get(a) || 0) + (user2Genres.get(b) || 0);
    const bScore = (user1Genres.get(b) || 0) + (user2Genres.get(b) || 0);
    return bScore - aScore;
  });

  return { score: normalizedScore, sharedGenres: sharedGenres.slice(0, 10) };
}

/**
 * Calculate audio profile similarity (if available)
 */
function calculateAudioSimilarity(
  profile1: UserAudioProfile | null,
  profile2: UserAudioProfile | null
): number {
  if (!profile1 || !profile2) return 0;

  const features = [
    'avg_danceability',
    'avg_energy', 
    'avg_valence',
    'avg_acousticness'
  ] as const;

  let totalDiff = 0;
  let validFeatures = 0;

  features.forEach(feature => {
    const val1 = profile1[feature];
    const val2 = profile2[feature];
    if (val1 !== undefined && val2 !== undefined) {
      totalDiff += Math.abs(val1 - val2);
      validFeatures++;
    }
  });

  // Handle tempo separately (different scale)
  if (profile1.avg_tempo && profile2.avg_tempo) {
    // Normalize tempo difference (max expected diff ~100 BPM)
    const tempoDiff = Math.abs(profile1.avg_tempo - profile2.avg_tempo) / 100;
    totalDiff += Math.min(1, tempoDiff);
    validFeatures++;
  }

  if (validFeatures === 0) return 0;

  // Convert average difference to similarity (0-1)
  const avgDiff = totalDiff / validFeatures;
  return Math.max(0, 1 - avgDiff);
}

/**
 * Get user's top artists from database
 */
async function getUserArtists(userId: string): Promise<UserArtist[]> {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient
    .from("user_artists")
    .select("artist_name, aggregated_score, genres")
    .eq("user_id", userId)
    .order("aggregated_score", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Error fetching user artists:", error);
    return [];
  }

  return data || [];
}

/**
 * Get user's audio profile from database (if available)
 */
async function getUserAudioProfile(userId: string): Promise<UserAudioProfile | null> {
  const adminClient = createAdminClient();
  
  // Check if the table exists and has data for this user
  const { data, error } = await adminClient
    .from("user_audio_profiles")
    .select("avg_danceability, avg_energy, avg_valence, avg_tempo, avg_acousticness")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    // Table might not exist yet, that's ok
    if (!error.message.includes("does not exist")) {
      console.error("Error fetching audio profile:", error);
    }
    return null;
  }

  return data;
}

/**
 * Calculate taste compatibility between two users
 */
export async function calculateTasteCompatibility(
  userId1: string,
  userId2: string
): Promise<TasteCompatibility> {
  // Fetch artists for both users in parallel
  const [user1Artists, user2Artists, user1Audio, user2Audio] = await Promise.all([
    getUserArtists(userId1),
    getUserArtists(userId2),
    getUserAudioProfile(userId1),
    getUserAudioProfile(userId2),
  ]);

  // Handle case where one or both users have no data
  if (user1Artists.length === 0 || user2Artists.length === 0) {
    return {
      score: 0,
      sharedArtists: [],
      sharedGenres: [],
      audioSimilarity: 0,
      label: "Different tastes",
      explanation: "Not enough music data to compare",
    };
  }

  // Calculate component scores
  const artistOverlap = calculateArtistOverlap(user1Artists, user2Artists);
  const genreOverlap = calculateGenreOverlap(user1Artists, user2Artists);
  const audioSimilarity = calculateAudioSimilarity(user1Audio, user2Audio);

  // Combine scores (artists: 50%, genres: 30%, audio: 20%)
  // If no audio data, redistribute: artists 60%, genres 40%
  let finalScore: number;
  if (audioSimilarity > 0) {
    finalScore = artistOverlap.score + genreOverlap.score + (audioSimilarity * 20);
  } else {
    // Redistribute when no audio data
    const redistArtist = artistOverlap.score * 1.2;
    const redistGenre = genreOverlap.score * 1.33;
    finalScore = Math.min(100, redistArtist + redistGenre);
  }

  // Ensure score is in valid range
  finalScore = Math.round(Math.max(0, Math.min(100, finalScore)));

  const label = getCompatibilityLabel(finalScore);
  const explanation = generateExplanation(
    artistOverlap.sharedArtists,
    genreOverlap.sharedGenres,
    finalScore
  );

  return {
    score: finalScore,
    sharedArtists: artistOverlap.sharedArtists,
    sharedGenres: genreOverlap.sharedGenres,
    audioSimilarity,
    label,
    explanation,
  };
}

/**
 * Get taste compatibility for multiple friends at once (batch)
 * More efficient than calling calculateTasteCompatibility multiple times
 */
export async function calculateBatchTasteCompatibility(
  userId: string,
  friendIds: string[]
): Promise<Map<string, TasteCompatibility>> {
  const results = new Map<string, TasteCompatibility>();
  
  if (friendIds.length === 0) return results;

  const adminClient = createAdminClient();

  // Fetch current user's artists once
  const userArtists = await getUserArtists(userId);
  const userAudio = await getUserAudioProfile(userId);

  // Fetch all friends' artists in one query
  const { data: allFriendArtists, error } = await adminClient
    .from("user_artists")
    .select("user_id, artist_name, aggregated_score, genres")
    .in("user_id", friendIds)
    .order("aggregated_score", { ascending: false });

  if (error) {
    console.error("Error fetching friend artists:", error);
    return results;
  }

  // Group by user
  const friendArtistsMap = new Map<string, UserArtist[]>();
  friendIds.forEach(id => friendArtistsMap.set(id, []));
  
  allFriendArtists?.forEach(artist => {
    const existing = friendArtistsMap.get(artist.user_id) || [];
    if (existing.length < 100) { // Limit to top 100
      existing.push(artist);
      friendArtistsMap.set(artist.user_id, existing);
    }
  });

  // Calculate compatibility for each friend
  for (const friendId of friendIds) {
    const friendArtists = friendArtistsMap.get(friendId) || [];
    
    if (userArtists.length === 0 || friendArtists.length === 0) {
      results.set(friendId, {
        score: 0,
        sharedArtists: [],
        sharedGenres: [],
        audioSimilarity: 0,
        label: "Different tastes",
        explanation: "Not enough music data to compare",
      });
      continue;
    }

    const artistOverlap = calculateArtistOverlap(userArtists, friendArtists);
    const genreOverlap = calculateGenreOverlap(userArtists, friendArtists);
    
    // Skip audio for batch (too slow to fetch all)
    const finalScore = Math.round(
      Math.min(100, artistOverlap.score * 1.2 + genreOverlap.score * 1.33)
    );

    const label = getCompatibilityLabel(finalScore);
    const explanation = generateExplanation(
      artistOverlap.sharedArtists,
      genreOverlap.sharedGenres,
      finalScore
    );

    results.set(friendId, {
      score: finalScore,
      sharedArtists: artistOverlap.sharedArtists,
      sharedGenres: genreOverlap.sharedGenres,
      audioSimilarity: 0, // Skipped for batch
      label,
      explanation,
    });
  }

  return results;
}

/**
 * Get a simplified taste compatibility badge
 */
export function getTasteCompatibilityBadge(score: number): {
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
} {
  if (score >= 85) {
    return {
      emoji: "🎭",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/40",
    };
  }
  if (score >= 70) {
    return {
      emoji: "🎵",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/40",
    };
  }
  if (score >= 50) {
    return {
      emoji: "🎶",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/40",
    };
  }
  if (score >= 25) {
    return {
      emoji: "🎧",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/40",
    };
  }
  return {
    emoji: "🌈",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/40",
  };
}
