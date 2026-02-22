"use client";

import { cn } from "@/lib/utils";
import { Music, Sparkles, Heart, Users } from "lucide-react";

interface TasteCompatibilityBadgeProps {
  score: number;
  label?: string;
  sharedArtists?: string[];
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  showDetails?: boolean;
  className?: string;
}

/**
 * Get emoji and styling based on compatibility score
 */
function getCompatibilityStyle(score: number) {
  if (score >= 85) {
    return {
      emoji: "🎭",
      label: "Soul twins",
      color: "text-purple-400",
      bgColor: "bg-purple-500/20",
      borderColor: "border-purple-500/40",
      gradient: "from-purple-500/20 to-pink-500/20",
    };
  }
  if (score >= 70) {
    return {
      emoji: "🎵",
      label: "Very similar",
      color: "text-green-400",
      bgColor: "bg-green-500/20",
      borderColor: "border-green-500/40",
      gradient: "from-green-500/20 to-emerald-500/20",
    };
  }
  if (score >= 50) {
    return {
      emoji: "🎶",
      label: "Similar vibes",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500/40",
      gradient: "from-blue-500/20 to-cyan-500/20",
    };
  }
  if (score >= 25) {
    return {
      emoji: "🎧",
      label: "Some overlap",
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/20",
      borderColor: "border-yellow-500/40",
      gradient: "from-yellow-500/20 to-orange-500/20",
    };
  }
  return {
    emoji: "🌈",
    label: "Different tastes",
    color: "text-zinc-400",
    bgColor: "bg-zinc-500/20",
    borderColor: "border-zinc-500/40",
    gradient: "from-zinc-500/20 to-zinc-600/20",
  };
}

export function TasteCompatibilityBadge({
  score,
  label,
  sharedArtists,
  size = "md",
  showLabel = false,
  showDetails = false,
  className,
}: TasteCompatibilityBadgeProps) {
  const style = getCompatibilityStyle(score);
  const displayLabel = label || style.label;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
    lg: "text-sm px-3 py-1.5",
  };

  return (
    <div className={cn("inline-flex flex-col gap-1", className)}>
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full font-semibold",
          style.bgColor,
          style.color,
          `border ${style.borderColor}`,
          sizeClasses[size]
        )}
      >
        <span>{style.emoji}</span>
        <span>{score}%</span>
        {showLabel && (
          <span className="opacity-80">· {displayLabel}</span>
        )}
      </div>

      {showDetails && sharedArtists && sharedArtists.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <Music className="w-3 h-3" />
          <span>Both love {sharedArtists.slice(0, 2).join(", ")}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Compact version for inline use
 */
export function TasteMatchPill({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  const style = getCompatibilityStyle(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
        style.bgColor,
        style.color,
        className
      )}
    >
      {score}% match
    </span>
  );
}

/**
 * Large card version for friend profile pages
 */
export function TasteCompatibilityCard({
  score,
  sharedArtists = [],
  sharedGenres = [],
  explanation,
  friendName,
}: {
  score: number;
  sharedArtists?: string[];
  sharedGenres?: string[];
  explanation?: string;
  friendName: string;
}) {
  const style = getCompatibilityStyle(score);

  return (
    <div
      className={cn(
        "rounded-xl p-4 border",
        style.bgColor,
        style.borderColor,
        `bg-gradient-to-r ${style.gradient}`
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{style.emoji}</span>
          <div>
            <h3 className={cn("font-bold text-lg", style.color)}>
              {score}% Taste Match
            </h3>
            <p className="text-sm text-zinc-400">{style.label}</p>
          </div>
        </div>
        <Users className={cn("w-6 h-6", style.color)} />
      </div>

      {explanation && (
        <p className="text-sm text-zinc-300 mb-3">{explanation}</p>
      )}

      {sharedArtists.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
            Shared Favorites
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sharedArtists.slice(0, 5).map((artist) => (
              <span
                key={artist}
                className="text-xs px-2 py-1 rounded-full bg-zinc-800/50 text-zinc-300"
              >
                {artist}
              </span>
            ))}
            {sharedArtists.length > 5 && (
              <span className="text-xs text-zinc-500">
                +{sharedArtists.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {sharedGenres.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
            Common Genres
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sharedGenres.slice(0, 4).map((genre) => (
              <span
                key={genre}
                className="text-xs px-2 py-0.5 rounded bg-zinc-800/30 text-zinc-400"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
