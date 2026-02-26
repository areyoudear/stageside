"use client";

import { Music, Users, Sparkles, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

// API response format from /api/friends/[friendId]/overlap
export interface TasteOverlapData {
  sharedArtists: string[];
  sharedGenres: string[];
  overlapPercentage: number;
}

// Extended format with more detail (used internally)
export interface TasteOverlap {
  matchStrength: number; // 0-100
  sharedArtists: string[];
  sharedGenres: string[];
  userTopArtists?: string[];
  friendTopArtists?: string[];
}

// Props can accept either format
export interface TasteOverlapCardProps {
  friendName: string;
  overlap?: TasteOverlap;
  data?: TasteOverlapData;
  className?: string;
  compact?: boolean;
}

/**
 * Displays music taste overlap between the current user and a friend
 * Shows shared artists, genres, and a visual overlap percentage bar
 */
export function TasteOverlapCard({
  friendName,
  overlap,
  data,
  className,
  compact = false,
}: TasteOverlapCardProps) {
  // Normalize the data - accept either format
  const normalizedData = data
    ? {
        matchStrength: data.overlapPercentage,
        sharedArtists: data.sharedArtists,
        sharedGenres: data.sharedGenres,
      }
    : overlap
    ? overlap
    : {
        matchStrength: 0,
        sharedArtists: [],
        sharedGenres: [],
      };

  const { matchStrength, sharedArtists, sharedGenres } = normalizedData;
  const displayedArtists = sharedArtists.slice(0, 5);
  const remainingArtists = sharedArtists.length - 5;

  // Get strength label
  const getStrengthLabel = (strength: number): { label: string; color: string } => {
    if (strength >= 80) return { label: "Amazing match!", color: "text-green-400" };
    if (strength >= 60) return { label: "Great match", color: "text-emerald-400" };
    if (strength >= 40) return { label: "Good overlap", color: "text-yellow-400" };
    if (strength >= 20) return { label: "Some overlap", color: "text-orange-400" };
    return { label: "Different tastes", color: "text-zinc-400" };
  };

  // Gradient colors based on overlap percentage
  const getGradientColors = (percentage: number) => {
    if (percentage >= 75) return "from-emerald-500 to-cyan-500";
    if (percentage >= 50) return "from-violet-500 to-purple-500";
    if (percentage >= 25) return "from-amber-500 to-orange-500";
    return "from-zinc-500 to-zinc-600";
  };

  const gradientColors = getGradientColors(matchStrength);
  const strengthInfo = getStrengthLabel(matchStrength);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            "px-2 py-1 rounded-full text-xs font-semibold text-white bg-gradient-to-r",
            gradientColors
          )}
        >
          {matchStrength}% match
        </div>
        {sharedArtists.length > 0 && (
          <span className="text-xs text-zinc-500 truncate">
            {sharedArtists.slice(0, 2).join(", ")}
            {sharedArtists.length > 2 && ` +${sharedArtists.length - 2}`}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-gradient-to-br from-zinc-900 to-zinc-900/80 rounded-xl border border-zinc-800 p-4 overflow-hidden relative",
        className
      )}
    >
      {/* Background glow effect */}
      <div
        className={cn(
          "absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-20 bg-gradient-to-r",
          gradientColors
        )}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 relative z-10">
        <div
          className={cn(
            "w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center",
            gradientColors
          )}
        >
          <Music2 className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-white">
            Your Music Overlap with {friendName}
          </h3>
          <p className="text-xs text-zinc-500">Based on your listening habits</p>
        </div>
      </div>

      {/* Overlap Percentage Bar */}
      <div className="mb-4 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">Match Strength</span>
          <div className="flex items-center gap-2">
            <span className={cn("text-sm", strengthInfo.color)}>
              {strengthInfo.label}
            </span>
            <span
              className={cn(
                "text-lg font-bold bg-gradient-to-r bg-clip-text text-transparent",
                gradientColors
              )}
            >
              {matchStrength}%
            </span>
          </div>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", gradientColors)}
            style={{ width: `${matchStrength}%` }}
          />
        </div>
      </div>

      {/* Shared Artists */}
      {sharedArtists.length > 0 && (
        <div className="mb-4 relative z-10">
          <h4 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Shared Artists ({sharedArtists.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {displayedArtists.map((artist) => (
              <span
                key={artist}
                className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-white"
              >
                {artist}
              </span>
            ))}
            {remainingArtists > 0 && (
              <span className="px-2.5 py-1 bg-zinc-800/50 border border-zinc-700/50 rounded-full text-xs text-zinc-400">
                +{remainingArtists} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Shared Genres */}
      {sharedGenres.length > 0 && (
        <div className="relative z-10">
          <h4 className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1">
            <Music className="w-3 h-3" />
            Shared Genres
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {sharedGenres.map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 bg-violet-500/20 border border-violet-500/30 rounded text-xs text-violet-300 capitalize"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sharedArtists.length === 0 && sharedGenres.length === 0 && (
        <div className="text-center py-4 relative z-10">
          <p className="text-sm text-zinc-500">
            No overlapping music found yet. Keep listening!
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Badge component for showing match percentage in lists
 */
export function MatchBadge({
  percentage,
  size = "md",
  className,
}: {
  percentage: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const getGradientColors = (pct: number) => {
    if (pct >= 75) return "from-emerald-500 to-cyan-500";
    if (pct >= 50) return "from-violet-500 to-purple-500";
    if (pct >= 25) return "from-amber-500 to-orange-500";
    return "from-zinc-500 to-zinc-600";
  };

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <span
      className={cn(
        "rounded-full font-semibold text-white bg-gradient-to-r inline-flex items-center",
        getGradientColors(percentage),
        sizeClasses[size],
        className
      )}
    >
      {percentage}%
    </span>
  );
}
