/**
 * Similar Artists API - Find artists similar to user taste or a given artist
 * 
 * GET /api/matches/artists
 * 
 * Params:
 * - artistId: UUID (optional - find similar to this artist)
 * - artistName: string (optional - find similar to artist by name)
 * - limit: number (default 20)
 * - explain: boolean (optional, generates LLM explanations)
 * 
 * If no artist specified, returns artists similar to user's taste profile.
 * Used for discovery and "because you like X" features.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { getOrCreateUserEmbedding, getEffectiveEmbedding } from "@/lib/embeddings/user-embeddings";
import { getArtistEmbedding, normalizeArtistName } from "@/lib/embeddings/artist-embeddings";
import { cosineSimilarity } from "@/lib/embeddings/embedding-service";
import { EmbeddingVector, ArtistMetadata } from "@/lib/embeddings/types";
import { generateMatchExplanation, getCachedExplanation } from "../_lib/explanations";

interface SimilarArtist {
  id: string;
  name: string;
  spotifyId: string | null;
  genres: string[];
  similarity: number;
  matchReason: string;
  metadata: {
    energyLevel?: string;
    venueTypes?: string[];
    mainstreamLevel?: string;
    danceability?: string;
  };
  explanation?: string;
}

/**
 * Generate a match reason based on artist metadata
 */
function generateMatchReason(
  sourceGenres: string[],
  targetMetadata: ArtistMetadata,
  similarity: number
): string {
  // Find overlapping genres
  const targetGenres = targetMetadata.genres || [];
  const sharedGenres = sourceGenres.filter(g => 
    targetGenres.some(tg => 
      tg.toLowerCase().includes(g.toLowerCase()) ||
      g.toLowerCase().includes(tg.toLowerCase())
    )
  );

  if (similarity >= 0.85) {
    if (sharedGenres.length > 0) {
      return `Perfect ${sharedGenres[0]} match`;
    }
    return "Nearly identical musical DNA";
  }

  if (similarity >= 0.7) {
    if (sharedGenres.length > 0) {
      return `Similar ${sharedGenres.slice(0, 2).join(" & ")} vibes`;
    }
    return "Strong sonic similarity";
  }

  if (similarity >= 0.5) {
    if (targetMetadata.energyLevel === "high") {
      return "Same high-energy spirit";
    }
    if (targetMetadata.venueTypes?.includes("festival")) {
      return "Festival-ready sound";
    }
    return "Complementary sound";
  }

  return "Explore something new";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const artistId = searchParams.get("artistId");
    const artistName = searchParams.get("artistName");
    const limit = parseInt(searchParams.get("limit") || "20");
    const shouldExplain = searchParams.get("explain") === "true";

    const supabase = createAdminClient();

    // Determine source embedding
    let sourceEmbedding: EmbeddingVector;
    let sourceGenres: string[] = [];
    let sourceArtistName: string | null = null;

    if (artistId || artistName) {
      // Find similar to a specific artist
      let artistData: { embedding: number[]; metadata: ArtistMetadata; name: string } | null = null;

      if (artistId) {
        const { data } = await supabase
          .from("artist_embeddings")
          .select("embedding, metadata, name")
          .eq("id", artistId)
          .single();
        artistData = data;
      } else if (artistName) {
        const normalized = normalizeArtistName(artistName);
        const { data } = await supabase
          .from("artist_embeddings")
          .select("embedding, metadata, name")
          .eq("normalized_name", normalized)
          .single();
        artistData = data;
      }

      if (!artistData?.embedding) {
        return NextResponse.json({
          artists: [],
          message: "Artist embedding not found. Try searching by a different artist.",
          sourceType: "artist",
        });
      }

      sourceEmbedding = artistData.embedding as EmbeddingVector;
      sourceGenres = (artistData.metadata as ArtistMetadata)?.genres || [];
      sourceArtistName = artistData.name;

    } else {
      // Find similar to user's taste
      const userTaste = await getOrCreateUserEmbedding(session.user.id);

      if (!userTaste?.coreEmbedding) {
        return NextResponse.json({
          artists: [],
          hasEmbedding: false,
          message: "Complete onboarding to discover similar artists",
          sourceType: "user",
        });
      }

      sourceEmbedding = getEffectiveEmbedding(userTaste) || userTaste.coreEmbedding;

      // Get user's top genres from aggregated artists
      const { data: userArtists } = await supabase
        .from("user_artists")
        .select("genres")
        .eq("user_id", session.user.id)
        .order("aggregated_score", { ascending: false })
        .limit(10);

      // Extract top genres
      const genreCounts = new Map<string, number>();
      (userArtists || []).forEach(ua => {
        (ua.genres || []).forEach((g: string) => {
          genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
        });
      });
      sourceGenres = Array.from(genreCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([genre]) => genre);
    }

    // Fetch all artist embeddings for comparison
    // In production, use pgvector's similarity search for efficiency
    const { data: allArtists, error } = await supabase
      .from("artist_embeddings")
      .select(`
        id,
        name,
        spotify_id,
        embedding,
        metadata
      `)
      .not("embedding", "is", null)
      .limit(1000);

    if (error) {
      console.error("Error fetching artists:", error);
      return NextResponse.json(
        { error: "Failed to fetch artists" },
        { status: 500 }
      );
    }

    // Calculate similarity for each artist
    const similarArtists: SimilarArtist[] = [];

    for (const artist of allArtists || []) {
      // Skip the source artist if searching by artist
      if (sourceArtistName && artist.name.toLowerCase() === sourceArtistName.toLowerCase()) {
        continue;
      }

      if (!artist.embedding) continue;

      const similarity = cosineSimilarity(
        sourceEmbedding,
        artist.embedding as EmbeddingVector
      );

      const metadata = artist.metadata as ArtistMetadata;

      similarArtists.push({
        id: artist.id,
        name: artist.name,
        spotifyId: artist.spotify_id,
        genres: metadata?.genres || [],
        similarity,
        matchReason: generateMatchReason(sourceGenres, metadata, similarity),
        metadata: {
          energyLevel: metadata?.energyLevel,
          venueTypes: metadata?.venueTypes,
          mainstreamLevel: metadata?.mainstreamLevel,
          danceability: metadata?.danceability,
        },
      });
    }

    // Sort by similarity descending
    similarArtists.sort((a, b) => b.similarity - a.similarity);

    // Limit results
    const topArtists = similarArtists.slice(0, limit);

    // Generate explanations if requested
    if (shouldExplain) {
      await Promise.all(
        topArtists.slice(0, 5).map(async (artist) => {
          const cached = await getCachedExplanation(
            session.user.id,
            artist.id,
            "artist"
          );

          if (cached) {
            artist.explanation = cached;
          } else {
            const explanation = await generateMatchExplanation(
              session.user.id,
              artist.id,
              "artist",
              {
                similarity: artist.similarity,
                genres: artist.genres,
                sourceArtist: sourceArtistName,
              }
            );
            artist.explanation = explanation;
          }
        })
      );
    }

    // Group by similarity tier
    const tiers = {
      nearMatch: topArtists.filter(a => a.similarity >= 0.85).length,
      similar: topArtists.filter(a => a.similarity >= 0.7 && a.similarity < 0.85).length,
      related: topArtists.filter(a => a.similarity >= 0.5 && a.similarity < 0.7).length,
      discovery: topArtists.filter(a => a.similarity < 0.5).length,
    };

    return NextResponse.json({
      artists: topArtists,
      total: similarArtists.length,
      returned: topArtists.length,
      tiers,
      sourceType: sourceArtistName ? "artist" : "user",
      sourceArtist: sourceArtistName,
      sourceGenres,
      hasEmbedding: true,
    });

  } catch (error) {
    console.error("Error in /api/matches/artists:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
