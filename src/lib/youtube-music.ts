/**
 * YouTube Music Integration via YouTube Data API v3
 *
 * LIMITATIONS:
 * - YouTube Music doesn't have an official API
 * - We use YouTube Data API as a workaround
 * - Can only access liked videos, subscribed channels
 * - Artist extraction from video titles is imprecise
 *
 * Requirements:
 * - Google Cloud Console project
 * - YouTube Data API v3 enabled
 * - OAuth 2.0 credentials
 *
 * Docs: https://developers.google.com/youtube/v3
 */

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

// Music category ID in YouTube
const MUSIC_CATEGORY_ID = "10";

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  categoryId: string;
  description: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
    high?: { url: string };
  };
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default?: { url: string };
    medium?: { url: string };
  };
}

export interface ExtractedArtist {
  name: string;
  source: "video_title" | "channel" | "description";
  confidence: "high" | "medium" | "low";
}

/**
 * Fetch user's liked videos
 */
export async function getLikedVideos(
  accessToken: string,
  maxResults: number = 50
): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];
  let pageToken: string | undefined;

  while (videos.length < maxResults) {
    const params = new URLSearchParams({
      part: "snippet,contentDetails",
      myRating: "like",
      maxResults: Math.min(50, maxResults - videos.length).toString(),
    });

    if (pageToken) {
      params.append("pageToken", pageToken);
    }

    const response = await fetch(`${YOUTUBE_API_BASE}/videos?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("YouTube API error:", error);
      throw new Error(`Failed to fetch liked videos: ${response.status}`);
    }

    const data = await response.json();

    for (const item of data.items || []) {
      videos.push({
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        categoryId: item.snippet.categoryId || "",
        description: item.snippet.description || "",
        thumbnails: item.snippet.thumbnails,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return videos;
}

/**
 * Fetch user's subscribed channels
 */
export async function getSubscribedChannels(
  accessToken: string,
  maxResults: number = 50
): Promise<YouTubeChannel[]> {
  const channels: YouTubeChannel[] = [];
  let pageToken: string | undefined;

  while (channels.length < maxResults) {
    const params = new URLSearchParams({
      part: "snippet",
      mine: "true",
      maxResults: Math.min(50, maxResults - channels.length).toString(),
    });

    if (pageToken) {
      params.append("pageToken", pageToken);
    }

    const response = await fetch(`${YOUTUBE_API_BASE}/subscriptions?${params}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("YouTube API error:", error);
      throw new Error(`Failed to fetch subscriptions: ${response.status}`);
    }

    const data = await response.json();

    for (const item of data.items || []) {
      channels.push({
        id: item.snippet.resourceId.channelId,
        title: item.snippet.title,
        description: item.snippet.description || "",
        thumbnails: item.snippet.thumbnails,
      });
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }

  return channels;
}

/**
 * Check if a video is in the Music category
 */
export function isMusicVideo(video: YouTubeVideo): boolean {
  if (video.categoryId === MUSIC_CATEGORY_ID) return true;

  // Check title for music-related keywords
  const musicKeywords = [
    "official video",
    "official music video",
    "official audio",
    "lyrics",
    "lyric video",
    "music video",
    "mv",
    "audio",
    "ft.",
    "feat.",
  ];

  const titleLower = video.title.toLowerCase();
  return musicKeywords.some((keyword) => titleLower.includes(keyword));
}

/**
 * Extract artist name from video title
 *
 * Common patterns:
 * - "Artist - Song Title (Official Video)"
 * - "Artist ft. Artist2 - Song Title"
 * - "Artist | Song Title"
 * - "Song Title by Artist"
 */
export function extractArtistFromTitle(title: string): ExtractedArtist | null {
  // Clean up common suffixes
  const cleanTitle = title
    .replace(/\(official\s*(music\s*)?video\)/gi, "")
    .replace(/\(official\s*audio\)/gi, "")
    .replace(/\(lyric\s*video\)/gi, "")
    .replace(/\(lyrics?\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?remix.*?\)/gi, "")
    .replace(/\(.*?version.*?\)/gi, "")
    .replace(/\(.*?cover.*?\)/gi, "")
    .trim();

  // Pattern: "Artist - Song"
  const dashMatch = cleanTitle.match(/^([^-|]+)\s*[-|]\s*.+/);
  if (dashMatch) {
    const artist = dashMatch[1].trim();
    // Handle "ft." or "feat."
    const featMatch = artist.match(/^(.+?)\s*(ft\.?|feat\.?)\s*.+/i);
    if (featMatch) {
      return {
        name: featMatch[1].trim(),
        source: "video_title",
        confidence: "high",
      };
    }
    if (artist.length > 1 && artist.length < 50) {
      return {
        name: artist,
        source: "video_title",
        confidence: "high",
      };
    }
  }

  // Pattern: "Song by Artist"
  const byMatch = cleanTitle.match(/^.+\s+by\s+([^(|]+)/i);
  if (byMatch) {
    return {
      name: byMatch[1].trim(),
      source: "video_title",
      confidence: "medium",
    };
  }

  return null;
}

/**
 * Check if a channel appears to be a music artist channel
 */
export function isMusicArtistChannel(channel: YouTubeChannel): boolean {
  const description = channel.description.toLowerCase();
  const title = channel.title.toLowerCase();

  // Common indicators of artist channels
  const artistIndicators = [
    "official",
    "music",
    "artist",
    "singer",
    "band",
    "records",
    "vevo",
    "subscribe for new music",
    "booking",
    "tour",
    "album",
  ];

  const hasIndicator = artistIndicators.some(
    (indicator) =>
      description.includes(indicator) ||
      title.includes(indicator) ||
      title.includes("vevo")
  );

  // Exclude obvious non-artist channels
  const excludePatterns = [
    "topic",
    "radio",
    "playlist",
    "compilation",
    "best of",
    "top 100",
    "hits",
    "mix",
  ];

  const shouldExclude = excludePatterns.some(
    (pattern) =>
      title.includes(pattern) || description.includes(pattern)
  );

  return hasIndicator && !shouldExclude;
}

/**
 * Extract artist name from channel
 */
export function extractArtistFromChannel(channel: YouTubeChannel): ExtractedArtist | null {
  let name = channel.title;

  // Remove common suffixes
  name = name
    .replace(/\s*-\s*Topic$/i, "")
    .replace(/VEVO$/i, "")
    .replace(/\s+Official$/i, "")
    .replace(/\s+Music$/i, "")
    .trim();

  if (name.length > 1 && name.length < 50) {
    return {
      name,
      source: "channel",
      confidence: isMusicArtistChannel(channel) ? "high" : "low",
    };
  }

  return null;
}

/**
 * Deduplicate and normalize artist names
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Get comprehensive user music profile from YouTube
 */
export async function getUserMusicProfile(accessToken: string) {
  try {
    const [likedVideos, subscribedChannels] = await Promise.all([
      getLikedVideos(accessToken, 100),
      getSubscribedChannels(accessToken, 100),
    ]);

    // Filter for music videos
    const musicVideos = likedVideos.filter(isMusicVideo);

    // Extract artists from video titles
    const artistMap = new Map<
      string,
      { name: string; score: number; confidence: string }
    >();

    musicVideos.forEach((video, index) => {
      const extracted = extractArtistFromTitle(video.title);
      if (extracted) {
        const key = normalizeArtistName(extracted.name);
        if (key.length > 0) {
          const weight =
            extracted.confidence === "high"
              ? 10
              : extracted.confidence === "medium"
              ? 5
              : 2;
          const recencyBonus = Math.max(1, 10 - Math.floor(index / 10));

          if (artistMap.has(key)) {
            const existing = artistMap.get(key)!;
            existing.score += weight * recencyBonus;
          } else {
            artistMap.set(key, {
              name: extracted.name,
              score: weight * recencyBonus,
              confidence: extracted.confidence,
            });
          }
        }
      }

      // Also extract from channel name
      if (video.channelTitle) {
        const channelName = video.channelTitle
          .replace(/VEVO$/i, "")
          .replace(/\s+Official$/i, "")
          .replace(/\s+-\s+Topic$/i, "")
          .trim();

        if (channelName.length > 1 && channelName.length < 50) {
          const key = normalizeArtistName(channelName);
          if (key.length > 0) {
            if (artistMap.has(key)) {
              artistMap.get(key)!.score += 3;
            } else {
              artistMap.set(key, {
                name: channelName,
                score: 3,
                confidence: "medium",
              });
            }
          }
        }
      }
    });

    // Add artists from subscribed channels
    subscribedChannels.forEach((channel) => {
      if (isMusicArtistChannel(channel)) {
        const extracted = extractArtistFromChannel(channel);
        if (extracted) {
          const key = normalizeArtistName(extracted.name);
          if (key.length > 0) {
            const weight = extracted.confidence === "high" ? 20 : 8;

            if (artistMap.has(key)) {
              artistMap.get(key)!.score += weight;
            } else {
              artistMap.set(key, {
                name: extracted.name,
                score: weight,
                confidence: extracted.confidence,
              });
            }
          }
        }
      }
    });

    // Sort by score and convert to artist list
    const topArtists = Array.from(artistMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((a) => ({
        id: "",
        name: a.name,
        genres: [] as string[], // YouTube doesn't provide genre data
        popularity: a.score,
      }));

    // Extract unique artist names
    const artistNames = topArtists.map((a) => a.name);

    // Recent artists from most recent music videos
    const recentArtistNames = musicVideos
      .slice(0, 20)
      .map((v) => extractArtistFromTitle(v.title)?.name)
      .filter((name): name is string => !!name);

    return {
      topArtists,
      topGenres: [] as string[], // YouTube doesn't provide genre data
      recentArtistNames: Array.from(new Set(recentArtistNames)),
      artistNames,
      stats: {
        likedMusicVideos: musicVideos.length,
        totalLikedVideos: likedVideos.length,
        subscribedMusicChannels: subscribedChannels.filter(isMusicArtistChannel).length,
        totalSubscriptions: subscribedChannels.length,
      },
    };
  } catch (error) {
    console.error("Error fetching YouTube Music profile:", error);
    throw error;
  }
}

/**
 * YouTube OAuth scopes required
 */
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");
