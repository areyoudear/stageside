/**
 * Match Explanation Generation
 * 
 * Uses LLM to generate "Why this matches you" explanations.
 * - NEVER used for ranking (ranking is deterministic vector math only)
 * - Only used for display after matching is complete
 * - Aggressively cached to minimize API calls
 */

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase";

// Lazy-initialized Anthropic client to avoid build-time errors
let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

type MatchType = "event" | "buddy" | "artist";

interface ExplanationContext {
  similarity?: number;
  tier?: string;
  lineup?: string[];
  genres?: string[];
  tasteSimilarity?: number;
  eventOverlap?: number;
  sharedEvents?: number;
  sourceArtist?: string | null;
}

// Cache TTL in seconds (24 hours)
const CACHE_TTL = 86400;

/**
 * Generate a cache key for explanations
 */
function getCacheKey(userId: string, targetId: string, matchType: MatchType): string {
  return `explanation:${matchType}:${userId}:${targetId}`;
}

/**
 * Get cached explanation if available
 */
export async function getCachedExplanation(
  userId: string,
  targetId: string,
  matchType: MatchType
): Promise<string | null> {
  const supabase = createAdminClient();
  const cacheKey = getCacheKey(userId, targetId, matchType);

  const { data } = await supabase
    .from("explanation_cache")
    .select("explanation, created_at")
    .eq("cache_key", cacheKey)
    .single();

  if (!data) return null;

  // Check if expired
  const createdAt = new Date(data.created_at);
  const now = new Date();
  const ageSeconds = (now.getTime() - createdAt.getTime()) / 1000;

  if (ageSeconds > CACHE_TTL) {
    // Expired, delete and return null
    await supabase
      .from("explanation_cache")
      .delete()
      .eq("cache_key", cacheKey);
    return null;
  }

  return data.explanation;
}

/**
 * Cache an explanation
 */
async function cacheExplanation(
  userId: string,
  targetId: string,
  matchType: MatchType,
  explanation: string
): Promise<void> {
  const supabase = createAdminClient();
  const cacheKey = getCacheKey(userId, targetId, matchType);

  await supabase
    .from("explanation_cache")
    .upsert({
      cache_key: cacheKey,
      user_id: userId,
      target_id: targetId,
      match_type: matchType,
      explanation,
      created_at: new Date().toISOString(),
    }, {
      onConflict: "cache_key",
    });
}

/**
 * Generate event match explanation
 */
async function generateEventExplanation(
  context: ExplanationContext,
  userTasteDescription: string
): Promise<string> {
  const { similarity = 0, tier = "discovery", lineup = [] } = context;
  
  const prompt = `You are writing a short, punchy explanation for why a concert matches a user's taste. 
Keep it under 30 words. Be specific and avoid generic phrases.

User's taste profile: ${userTasteDescription}
Event lineup: ${lineup.join(", ") || "Various artists"}
Match similarity: ${(similarity * 100).toFixed(0)}%
Match tier: ${tier}

Write a 1-2 sentence explanation that feels personal and exciting. Don't mention percentages.`;

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    return (textBlock.type === "text" ? textBlock.text : "").trim() || 
      "This event aligns with your music taste.";
  } catch (error) {
    console.error("Error generating event explanation:", error);
    return "This event matches your listening preferences.";
  }
}

/**
 * Generate buddy match explanation
 */
async function generateBuddyExplanation(
  context: ExplanationContext
): Promise<string> {
  const { 
    tasteSimilarity = 0, 
    eventOverlap = 0, 
    sharedEvents = 0 
  } = context;

  const prompt = `You are writing a short, friendly explanation for why two music fans would make great concert buddies.
Keep it under 25 words. Be warm and specific.

Taste similarity: ${(tasteSimilarity * 100).toFixed(0)}%
Event overlap: ${(eventOverlap * 100).toFixed(0)}%
Shared saved events: ${sharedEvents}

Write a 1 sentence explanation that makes the connection feel natural and exciting.`;

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 50,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    return (textBlock.type === "text" ? textBlock.text : "").trim() || 
      "You share similar music taste!";
  } catch (error) {
    console.error("Error generating buddy explanation:", error);
    return "Similar music DNA detected!";
  }
}

/**
 * Generate artist match explanation
 */
async function generateArtistExplanation(
  context: ExplanationContext,
  userTasteDescription: string
): Promise<string> {
  const { 
    similarity = 0, 
    genres = [], 
    sourceArtist 
  } = context;

  const sourceContext = sourceArtist 
    ? `Based on their love of ${sourceArtist}` 
    : `Based on their taste profile: ${userTasteDescription}`;

  const prompt = `You are writing a discovery-focused recommendation for a similar artist.
Keep it under 25 words. Make it feel like an exciting find.

${sourceContext}
Artist genres: ${genres.join(", ") || "Various"}
Similarity: ${(similarity * 100).toFixed(0)}%

Write 1 sentence explaining why they'll love this artist. Start with action words like "Explore", "Discover", "You'll love".`;

  try {
    const response = await getAnthropic().messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 50,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content[0];
    return (textBlock.type === "text" ? textBlock.text : "").trim() || 
      "This artist fits your sonic profile.";
  } catch (error) {
    console.error("Error generating artist explanation:", error);
    return "Similar sound to artists you love.";
  }
}

/**
 * Get user's taste description from their profile
 */
async function getUserTasteDescription(userId: string): Promise<string> {
  const supabase = createAdminClient();

  // Get user's top genres from aggregated artists
  const { data: artists } = await supabase
    .from("user_artists")
    .select("genres, artist_name")
    .eq("user_id", userId)
    .order("aggregated_score", { ascending: false })
    .limit(5);

  if (!artists || artists.length === 0) {
    return "eclectic music taste";
  }

  // Extract top genres
  const genreCounts = new Map<string, number>();
  artists.forEach(a => {
    (a.genres || []).forEach((g: string) => {
      genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
    });
  });

  const topGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([genre]) => genre);

  const topArtists = artists.slice(0, 3).map(a => a.artist_name);

  return `${topGenres.join(", ")} fan who loves ${topArtists.join(", ")}`;
}

/**
 * Main explanation generation function
 */
export async function generateMatchExplanation(
  userId: string,
  targetId: string,
  matchType: MatchType,
  context: ExplanationContext
): Promise<string> {
  // Get user's taste description for context
  const userTasteDescription = await getUserTasteDescription(userId);

  let explanation: string;

  switch (matchType) {
    case "event":
      explanation = await generateEventExplanation(context, userTasteDescription);
      break;
    case "buddy":
      explanation = await generateBuddyExplanation(context);
      break;
    case "artist":
      explanation = await generateArtistExplanation(context, userTasteDescription);
      break;
    default:
      explanation = "A great match for you!";
  }

  // Cache the explanation
  await cacheExplanation(userId, targetId, matchType, explanation);

  return explanation;
}

/**
 * Batch generate explanations (for warming cache)
 */
export async function batchGenerateExplanations(
  userId: string,
  targets: Array<{ id: string; type: MatchType; context: ExplanationContext }>
): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  // Check cache first
  const cachedPromises = targets.map(async (target) => {
    const cached = await getCachedExplanation(userId, target.id, target.type);
    return { id: target.id, cached };
  });

  const cached = await Promise.all(cachedPromises);
  const needsGeneration: typeof targets = [];

  cached.forEach(({ id, cached: cachedExplanation }, index) => {
    if (cachedExplanation) {
      results.set(id, cachedExplanation);
    } else {
      needsGeneration.push(targets[index]);
    }
  });

  // Generate missing explanations (rate limited)
  for (const target of needsGeneration.slice(0, 10)) {
    try {
      const explanation = await generateMatchExplanation(
        userId,
        target.id,
        target.type,
        target.context
      );
      results.set(target.id, explanation);
    } catch (error) {
      console.error(`Error generating explanation for ${target.id}:`, error);
      results.set(target.id, "A match based on your taste.");
    }

    // Small delay between generations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
