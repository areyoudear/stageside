"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Star, 
  Users, 
  Music2, 
  Headphones, 
  Sparkles, 
  UserPlus,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";

export interface ScoreBreakdown {
  artistScore: number;      // 0-35: Direct artist match
  relatedScore: number;     // 0-25: Similar artist match  
  audioScore: number;       // 0-20: Audio DNA (energy, tempo, etc)
  genreScore: number;       // 0-10: Genre affinity
  discoveryBonus: number;   // 0-5: Emerging artist bonus
  socialBonus: number;      // 0-5: Friends interested/going
}

interface MatchBreakdownProps {
  score: number;
  breakdown?: ScoreBreakdown;
  matchedArtist?: string;
  matchedArtistRank?: number;
  reasons?: string[];
  variant?: "badge" | "card" | "tooltip";
  className?: string;
}

// Component labels and max values
const BREAKDOWN_CONFIG = {
  artistScore: {
    label: "Your Artist",
    max: 35,
    icon: Star,
    color: "text-green-400",
    bgColor: "bg-green-500",
    description: (rank?: number) => 
      rank ? `#${rank} in your top artists` : "Direct artist match",
  },
  relatedScore: {
    label: "Similar Artist",
    max: 25,
    icon: Music2,
    color: "text-violet-400",
    bgColor: "bg-violet-500",
    description: () => "Similar sound to artists you love",
  },
  audioScore: {
    label: "Audio DNA",
    max: 20,
    icon: Headphones,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500",
    description: () => "Energy, tempo, & vibe match",
  },
  genreScore: {
    label: "Genre",
    max: 10,
    icon: Music2,
    color: "text-orange-400",
    bgColor: "bg-orange-500",
    description: () => "Genre alignment",
  },
  discoveryBonus: {
    label: "Discovery",
    max: 5,
    icon: Sparkles,
    color: "text-pink-400",
    bgColor: "bg-pink-500",
    description: () => "New artist matching your taste",
  },
  socialBonus: {
    label: "Friends",
    max: 5,
    icon: UserPlus,
    color: "text-blue-400",
    bgColor: "bg-blue-500",
    description: () => "Friends interested or going",
  },
} as const;

// Get color based on score percentage
function getScoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-emerald-400";
  if (score >= 40) return "text-yellow-400";
  if (score >= 20) return "text-orange-400";
  return "text-zinc-400";
}

function getScoreLabel(score: number) {
  if (score >= 90) return "Perfect match";
  if (score >= 75) return "Great match";
  if (score >= 60) return "Good match";
  if (score >= 40) return "Decent match";
  if (score >= 20) return "Some overlap";
  return "Discovery";
}

// Compact badge version - shows score with expandable breakdown
export function MatchBadgeWithBreakdown({
  score,
  breakdown,
  matchedArtist,
  matchedArtistRank,
  reasons,
  className,
}: MatchBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const hasBreakdown = breakdown && Object.values(breakdown).some(v => v > 0);
  const activeComponents = hasBreakdown 
    ? (Object.entries(breakdown) as [keyof ScoreBreakdown, number][])
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className={cn("relative", className)}>
      {/* Main badge - clickable to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-all",
          score >= 80 
            ? "bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30" 
            : score >= 60
            ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
            : score >= 40
            ? "bg-yellow-500/15 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/25"
            : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-zinc-700"
        )}
      >
        {score >= 80 && <Star className="w-3.5 h-3.5 fill-current" />}
        <span>{score}%</span>
        {hasBreakdown && (
          <Info className="w-3 h-3 opacity-60" />
        )}
      </button>

      {/* Expanded breakdown panel */}
      {isExpanded && hasBreakdown && (
        <div className="absolute top-full right-0 mt-2 w-72 p-4 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-30 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={cn("text-lg font-bold", getScoreColor(score))}>
                {score}% Match
              </p>
              <p className="text-xs text-zinc-500">{getScoreLabel(score)}</p>
            </div>
            <button 
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-zinc-800 rounded"
            >
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            </button>
          </div>

          {/* Primary reason */}
          {reasons?.[0] && (
            <div className="mb-4 p-2.5 bg-zinc-800/50 rounded-lg">
              <p className="text-sm text-zinc-200">{reasons[0]}</p>
            </div>
          )}

          {/* Score breakdown bars */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 mb-2">
              Score Breakdown
            </p>
            {activeComponents.map(([key, value]) => {
              const config = BREAKDOWN_CONFIG[key];
              const percentage = (value / config.max) * 100;
              const Icon = config.icon;
              
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <Icon className={cn("w-3.5 h-3.5", config.color)} />
                      <span className="text-zinc-300">{config.label}</span>
                    </div>
                    <span className="text-zinc-500 tabular-nums">
                      +{value.toFixed(0)}/{config.max}
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all", config.bgColor)}
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                  {/* Show extra context for artist matches */}
                  {key === "artistScore" && matchedArtistRank && matchedArtist && (
                    <p className="text-[10px] text-zinc-500 pl-5">
                      {matchedArtist} is #{matchedArtistRank} in your top artists
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Total Score</span>
              <span className={cn("font-bold", getScoreColor(score))}>
                {score}/100
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Card version - for festival/concert detail pages
export function MatchBreakdownCard({
  score,
  breakdown,
  matchedArtist,
  matchedArtistRank,
  reasons,
  className,
}: MatchBreakdownProps) {
  const hasBreakdown = breakdown && Object.values(breakdown).some(v => v > 0);
  const activeComponents = hasBreakdown 
    ? (Object.entries(breakdown) as [keyof ScoreBreakdown, number][])
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className={cn(
      "p-4 rounded-xl bg-zinc-900/80 border border-zinc-800",
      score >= 80 && "border-green-500/30",
      className
    )}>
      {/* Score header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full",
            score >= 80 ? "bg-green-500/20" : 
            score >= 60 ? "bg-emerald-500/20" :
            score >= 40 ? "bg-yellow-500/20" : "bg-zinc-800"
          )}>
            <span className={cn("text-2xl font-bold", getScoreColor(score))}>
              {score}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-white">{getScoreLabel(score)}</p>
            {reasons?.[0] && (
              <p className="text-xs text-zinc-400 mt-0.5">{reasons[0]}</p>
            )}
          </div>
        </div>
      </div>

      {/* Breakdown bars */}
      {hasBreakdown && (
        <div className="space-y-3">
          {activeComponents.slice(0, 4).map(([key, value]) => {
            const config = BREAKDOWN_CONFIG[key];
            const percentage = (value / config.max) * 100;
            const Icon = config.icon;
            
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-4 h-4", config.color)} />
                    <span className="text-sm text-zinc-300">{config.label}</span>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {value.toFixed(0)} pts
                  </span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full", config.bgColor)}
                    style={{ width: `${Math.min(100, percentage)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Compact summary for non-breakdown view */}
      {!hasBreakdown && reasons && reasons.length > 0 && (
        <ul className="space-y-1.5">
          {reasons.slice(0, 3).map((reason, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
              <span className="text-green-400 mt-0.5">•</span>
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Inline tooltip version - for compact spaces
export function MatchTooltip({
  score,
  breakdown,
  matchedArtist,
  matchedArtistRank,
  reasons,
}: MatchBreakdownProps) {
  const hasBreakdown = breakdown && Object.values(breakdown).some(v => v > 0);
  const activeComponents = hasBreakdown 
    ? (Object.entries(breakdown) as [keyof ScoreBreakdown, number][])
        .filter(([_, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
    : [];

  return (
    <div className="w-64 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className={cn("text-lg font-bold", getScoreColor(score))}>
          {score}%
        </span>
        <span className="text-sm text-zinc-400">{getScoreLabel(score)}</span>
      </div>

      {reasons?.[0] && (
        <p className="text-sm text-zinc-300">{reasons[0]}</p>
      )}

      {hasBreakdown && (
        <div className="pt-2 border-t border-zinc-700 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">
            Why this score
          </p>
          {activeComponents.map(([key, value]) => {
            const config = BREAKDOWN_CONFIG[key];
            const Icon = config.icon;
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <Icon className={cn("w-3 h-3", config.color)} />
                <span className="text-zinc-400">{config.label}</span>
                <span className="ml-auto text-zinc-500">+{value.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { MatchBreakdownCard as MatchBreakdown };
