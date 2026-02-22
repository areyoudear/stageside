/**
 * POST /api/embeddings/user/build
 * 
 * Build user taste embedding from onboarding data.
 * Supports both manual and Spotify-based onboarding flows.
 * 
 * Request body:
 * {
 *   onboardingType: 'manual' | 'spotify',
 *   artists?: string[],              // For manual: artist names
 *   sliderValues?: {                 // For manual: preference sliders
 *     energy: number,                // 0-1
 *     crowdSize: number,             // 0-1
 *     exploration: number,           // 0-1
 *     vibes: {
 *       dance: number,
 *       lyrical: number,
 *       spectacle: number,
 *       community: number
 *     }
 *   },
 *   culturalPrefs?: string[],        // e.g., ['local', 'underground']
 *   spotifyTopArtists?: [...],       // For Spotify: top artists array
 *   spotifyRecentlyPlayed?: [...]    // For Spotify: recently played tracks
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   onboardingType: string,
 *   embeddingVersion: number,
 *   artistCount: number,
 *   error?: string
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { OnboardingSliderValues, OnboardingType } from '@/lib/embeddings/types';
import { 
  buildUserEmbedding, 
  ensureAnchorsInitialized,
  SpotifyArtistData,
  SpotifyTrackData 
} from '@/lib/embeddings/user-embedding-builder';

interface BuildEmbeddingRequestBody {
  onboardingType: OnboardingType;
  artists?: string[];
  sliderValues?: OnboardingSliderValues;
  culturalPrefs?: string[];
  spotifyTopArtists?: SpotifyArtistData[];
  spotifyRecentlyPlayed?: SpotifyTrackData[];
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body: BuildEmbeddingRequestBody = await request.json();
    
    // Validate onboarding type
    if (!body.onboardingType || !['manual', 'spotify', 'apple_music'].includes(body.onboardingType)) {
      return NextResponse.json(
        { error: 'Invalid onboardingType. Must be "manual", "spotify", or "apple_music".' },
        { status: 400 }
      );
    }
    
    // Validate based on onboarding type
    if (body.onboardingType === 'manual') {
      if (!body.artists || !Array.isArray(body.artists) || body.artists.length < 3) {
        return NextResponse.json(
          { error: 'At least 3 artists required for manual onboarding' },
          { status: 400 }
        );
      }
      
      // Validate slider values if provided
      if (body.sliderValues) {
        const { energy, crowdSize, vibes } = body.sliderValues;
        
        const isValidSlider = (val: unknown): boolean => 
          typeof val === 'number' && val >= 0 && val <= 1;
        
        if (!isValidSlider(energy) || !isValidSlider(crowdSize)) {
          return NextResponse.json(
            { error: 'Invalid slider values. Energy and crowdSize must be between 0 and 1.' },
            { status: 400 }
          );
        }
        
        if (vibes) {
          const vibeKeys = ['dance', 'lyrical', 'spectacle', 'community'];
          for (const key of vibeKeys) {
            if (vibes[key as keyof typeof vibes] !== undefined && 
                !isValidSlider(vibes[key as keyof typeof vibes])) {
              return NextResponse.json(
                { error: `Invalid vibe value for ${key}. Must be between 0 and 1.` },
                { status: 400 }
              );
            }
          }
        }
      }
    } else if (body.onboardingType === 'spotify') {
      if (!body.spotifyTopArtists || !Array.isArray(body.spotifyTopArtists) || body.spotifyTopArtists.length === 0) {
        return NextResponse.json(
          { error: 'Spotify top artists required for Spotify onboarding' },
          { status: 400 }
        );
      }
    }
    
    // Ensure anchor vectors exist
    await ensureAnchorsInitialized();
    
    // Build the embedding
    const result = await buildUserEmbedding({
      userId: session.user.id,
      onboardingType: body.onboardingType,
      artists: body.artists,
      sliderValues: body.sliderValues,
      culturalPrefs: body.culturalPrefs,
      spotifyTopArtists: body.spotifyTopArtists,
      spotifyRecentlyPlayed: body.spotifyRecentlyPlayed,
    });
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to build embedding' 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      onboardingType: result.onboardingType,
      embeddingVersion: result.embeddingVersion,
      artistCount: result.artistCount,
    });
  } catch (error) {
    console.error('Error in /api/embeddings/user/build:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
