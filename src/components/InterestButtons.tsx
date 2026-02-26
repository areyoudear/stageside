"use client";

import { useState, useCallback } from "react";
import { Heart, Ticket, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Concert } from "@/lib/ticketmaster";

export type InterestStatus = "interested" | "going" | null;

interface InterestButtonsProps {
  concertId: string;
  concert?: Concert; // For caching with the API
  initialStatus?: InterestStatus;
  onStatusChange?: (status: InterestStatus) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "compact" | "icon-only";
  className?: string;
  disabled?: boolean;
}

export function InterestButtons({
  concertId,
  concert,
  initialStatus = null,
  onStatusChange,
  size = "md",
  variant = "default",
  className,
  disabled = false,
}: InterestButtonsProps) {
  const [status, setStatus] = useState<InterestStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState<"interested" | "going" | null>(null);

  const handleInterestClick = useCallback(async (newStatus: "interested" | "going") => {
    if (disabled || isLoading) return;

    const targetStatus = status === newStatus ? null : newStatus;
    
    // Optimistic update
    setStatus(targetStatus);
    setIsLoading(newStatus);

    try {
      const res = await fetch("/api/concerts/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concertId,
          status: targetStatus,
          // Include concert data for caching
          concertData: concert ? {
            id: concert.id,
            name: concert.name,
            artists: concert.artists,
            venue: concert.venue,
            date: concert.date,
            time: concert.time,
            imageUrl: concert.imageUrl,
            genres: concert.genres,
            ticketUrl: concert.ticketUrl,
          } : undefined,
        }),
      });

      if (!res.ok) {
        // Revert on error
        setStatus(status);
        console.error("Failed to update interest status");
        return;
      }

      // Track the change
      track("concert_interest_changed", {
        concert_id: concertId,
        artist: concert?.artists?.join(", ") || "unknown",
        new_status: targetStatus || "removed",
        previous_status: status || "none",
      });

      onStatusChange?.(targetStatus);
    } catch (error) {
      // Revert on error
      setStatus(status);
      console.error("Error updating interest:", error);
    } finally {
      setIsLoading(null);
    }
  }, [concertId, concert, status, disabled, isLoading, onStatusChange]);

  const sizeClasses = {
    sm: "py-1.5 px-2.5 text-xs gap-1",
    md: "py-2 px-3 text-sm gap-1.5",
    lg: "py-2.5 px-4 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  if (variant === "icon-only") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Interested (Heart) Button */}
        <button
          onClick={() => handleInterestClick("interested")}
          disabled={disabled || isLoading !== null}
          className={cn(
            "relative p-2.5 rounded-full transition-all duration-300",
            status === "interested"
              ? "bg-violet-500/20 hover:bg-violet-500/30"
              : "bg-black/30 hover:bg-black/50 backdrop-blur-md",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={status === "interested" ? "Remove interest" : "Mark as interested"}
          title={status === "interested" ? "Remove interest" : "I'm interested"}
        >
          {isLoading === "interested" ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin text-violet-400")} />
          ) : (
            <Heart
              className={cn(
                iconSizes[size],
                "transition-all",
                status === "interested"
                  ? "fill-violet-500 text-violet-500 scale-110"
                  : "text-white/80 hover:text-white"
              )}
            />
          )}
        </button>

        {/* Going (Ticket) Button */}
        <button
          onClick={() => handleInterestClick("going")}
          disabled={disabled || isLoading !== null}
          className={cn(
            "relative p-2.5 rounded-full transition-all duration-300",
            status === "going"
              ? "bg-green-500/20 hover:bg-green-500/30"
              : "bg-black/30 hover:bg-black/50 backdrop-blur-md",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label={status === "going" ? "Not going anymore" : "Mark as going"}
          title={status === "going" ? "Not going anymore" : "I'm going!"}
        >
          {isLoading === "going" ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin text-green-400")} />
          ) : (
            <Ticket
              className={cn(
                iconSizes[size],
                "transition-all",
                status === "going"
                  ? "text-green-400 scale-110"
                  : "text-white/80 hover:text-white"
              )}
            />
          )}
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        {/* Interested Button */}
        <button
          onClick={() => handleInterestClick("interested")}
          disabled={disabled || isLoading !== null}
          className={cn(
            "inline-flex items-center rounded-full font-medium transition-all",
            sizeClasses[size],
            status === "interested"
              ? "bg-violet-500/20 text-violet-400 border border-violet-500/40 hover:bg-violet-500/30"
              : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading === "interested" ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : (
            <Heart className={cn(iconSizes[size], status === "interested" && "fill-violet-400")} />
          )}
        </button>

        {/* Going Button */}
        <button
          onClick={() => handleInterestClick("going")}
          disabled={disabled || isLoading !== null}
          className={cn(
            "inline-flex items-center rounded-full font-medium transition-all",
            sizeClasses[size],
            status === "going"
              ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
              : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {isLoading === "going" ? (
            <Loader2 className={cn(iconSizes[size], "animate-spin")} />
          ) : (
            <Ticket className={cn(iconSizes[size])} />
          )}
        </button>
      </div>
    );
  }

  // Default variant: Full buttons with labels
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Interested Button */}
      <button
        onClick={() => handleInterestClick("interested")}
        disabled={disabled || isLoading !== null}
        className={cn(
          "flex-1 inline-flex items-center justify-center rounded-lg font-medium transition-all",
          sizeClasses[size],
          status === "interested"
            ? "bg-violet-500/20 text-violet-400 border border-violet-500/40 hover:bg-violet-500/30"
            : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isLoading === "interested" ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin mr-1.5")} />
        ) : (
          <Heart className={cn(iconSizes[size], "mr-1.5", status === "interested" && "fill-violet-400")} />
        )}
        Interested
      </button>

      {/* Going Button */}
      <button
        onClick={() => handleInterestClick("going")}
        disabled={disabled || isLoading !== null}
        className={cn(
          "flex-1 inline-flex items-center justify-center rounded-lg font-medium transition-all",
          sizeClasses[size],
          status === "going"
            ? "bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30"
            : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {isLoading === "going" ? (
          <Loader2 className={cn(iconSizes[size], "animate-spin mr-1.5")} />
        ) : (
          <Ticket className={cn(iconSizes[size], "mr-1.5")} />
        )}
        Going
      </button>
    </div>
  );
}

// Export for easy re-use of types
export type { InterestButtonsProps };
