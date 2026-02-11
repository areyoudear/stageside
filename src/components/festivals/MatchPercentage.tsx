"use client";

import { cn } from "@/lib/utils";

interface MatchPercentageProps {
  percentage: number;
  matchedCount: number;
  totalCount: number;
  size?: "sm" | "md" | "lg" | "xl";
  showDetails?: boolean;
  className?: string;
}

export function MatchPercentage({
  percentage,
  matchedCount,
  totalCount,
  size = "md",
  showDetails = true,
  className,
}: MatchPercentageProps) {
  const getMatchLabel = (pct: number) => {
    if (pct >= 80) return "Perfect for you";
    if (pct >= 60) return "Great match";
    if (pct >= 40) return "Solid match";
    if (pct >= 20) return "Some matches";
    return "Explore new artists";
  };

  const getMatchColor = (pct: number) => {
    if (pct >= 80) return "from-green-500 to-emerald-500";
    if (pct >= 60) return "from-green-400 to-teal-500";
    if (pct >= 40) return "from-yellow-500 to-orange-500";
    if (pct >= 20) return "from-orange-400 to-red-400";
    return "from-zinc-500 to-zinc-600";
  };

  const sizes = {
    sm: {
      container: "p-3",
      percentage: "text-2xl",
      label: "text-xs",
      bar: "h-1.5",
    },
    md: {
      container: "p-4",
      percentage: "text-3xl",
      label: "text-sm",
      bar: "h-2",
    },
    lg: {
      container: "p-6",
      percentage: "text-5xl",
      label: "text-base",
      bar: "h-3",
    },
    xl: {
      container: "p-8",
      percentage: "text-6xl",
      label: "text-lg",
      bar: "h-4",
    },
  };

  const sizeStyles = sizes[size];

  return (
    <div
      className={cn(
        "rounded-xl bg-zinc-900/80 border border-zinc-800",
        sizeStyles.container,
        className
      )}
    >
      <div className="text-center">
        <div className="flex items-baseline justify-center gap-1">
          <span
            className={cn(
              "font-bold bg-gradient-to-r bg-clip-text text-transparent",
              getMatchColor(percentage),
              sizeStyles.percentage
            )}
          >
            {percentage}%
          </span>
          <span className="text-zinc-500 text-sm">match</span>
        </div>

        <p className={cn("text-zinc-400 mt-1", sizeStyles.label)}>
          {getMatchLabel(percentage)}
        </p>

        {showDetails && (
          <>
            {/* Progress bar */}
            <div
              className={cn(
                "mt-3 w-full bg-zinc-800 rounded-full overflow-hidden",
                sizeStyles.bar
              )}
            >
              <div
                className={cn(
                  "h-full bg-gradient-to-r rounded-full transition-all duration-500",
                  getMatchColor(percentage)
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Artist count */}
            <p className={cn("text-zinc-500 mt-2", sizeStyles.label)}>
              <span className="text-white font-medium">{matchedCount}</span>{" "}
              artists you'll love out of {totalCount}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Compact inline version for cards
export function MatchBadge({
  percentage,
  className,
}: {
  percentage: number;
  className?: string;
}) {
  const getColor = (pct: number) => {
    if (pct >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (pct >= 60) return "bg-teal-500/20 text-teal-400 border-teal-500/30";
    if (pct >= 40) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-bold border",
        getColor(percentage),
        className
      )}
    >
      {percentage > 0 ? (
        <>
          {percentage >= 80 && "⭐ "}
          {percentage}%
        </>
      ) : (
        "New"
      )}
    </span>
  );
}
