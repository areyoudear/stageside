"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { audioManager, AudioState } from "@/lib/audio-manager";

interface AudioPreviewProps {
  previewUrl: string | null;
  trackName: string;
  artistName: string;
  highlightStartMs?: number; // Where to start playing (skip intro)
  compact?: boolean;
  className?: string;
}

/**
 * Audio Preview Component
 * 
 * Plays 30-second Spotify preview clips inline in concert cards.
 * Features:
 * - Play/pause toggle
 * - Progress bar
 * - Auto-seek to highlight (skip boring intro)
 * - Singleton playback (only one plays at a time)
 * - Fade in/out transitions
 */
export function AudioPreview({
  previewUrl,
  trackName,
  artistName,
  highlightStartMs = 0,
  compact = false,
  className,
}: AudioPreviewProps) {
  const [state, setState] = useState<AudioState>("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);
  
  // Track if this component's URL is playing
  const isThisPlaying = state === "playing" && audioManager.isCurrent(previewUrl || "");
  const isThisPaused = state === "paused" && audioManager.isCurrent(previewUrl || "");
  const isThisLoading = state === "loading" && audioManager.isCurrent(previewUrl || "");
  
  // Sync with global audio state
  useEffect(() => {
    if (!previewUrl) return;
    
    // Check initial state
    if (audioManager.isCurrent(previewUrl)) {
      setState(audioManager.getState());
    }
    
    // Listen for state changes via periodic check (simple approach)
    const interval = setInterval(() => {
      if (audioManager.isCurrent(previewUrl)) {
        const currentState = audioManager.getState();
        setState(currentState);
      } else if (state !== "idle") {
        setState("idle");
        setProgress(0);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [previewUrl, state]);
  
  // Handle play/pause
  const handleToggle = useCallback(async () => {
    if (!previewUrl) return;
    
    try {
      if (isThisPlaying) {
        audioManager.pause();
      } else if (isThisPaused) {
        audioManager.resume();
      } else {
        // Start fresh playback
        setState("loading");
        await audioManager.play(previewUrl, highlightStartMs, {
          onStateChange: setState,
          onProgress: (currentTime, dur) => {
            setProgress(currentTime);
            setDuration(dur);
          },
          onEnd: () => {
            setState("idle");
            setProgress(0);
          },
        });
      }
    } catch (error) {
      console.error("Audio playback error:", error);
      setState("error");
    }
  }, [previewUrl, highlightStartMs, isThisPlaying, isThisPaused]);
  
  // Handle progress bar click for seeking
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration || !isThisPlaying) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    audioManager.seek(Math.max(0, Math.min(1, clickPosition)));
  }, [duration, isThisPlaying]);
  
  // Format time as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };
  
  // No preview available
  if (!previewUrl) {
    return null;
  }
  
  // Calculate progress percentage
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  
  // Compact mode: just a play button
  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-full transition-all",
          "bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50",
          "focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
          isThisPlaying && "bg-cyan-500/20 border-cyan-500/40",
          isThisLoading && "animate-pulse",
          className
        )}
        title={`Preview: ${trackName} by ${artistName}`}
        aria-label={isThisPlaying ? "Pause preview" : "Play preview"}
      >
        {isThisLoading ? (
          <div className="w-4 h-4 border-2 border-zinc-400 border-t-cyan-400 rounded-full animate-spin" />
        ) : isThisPlaying ? (
          <Pause className="w-4 h-4 text-cyan-400" />
        ) : (
          <Play className="w-4 h-4 text-zinc-300 ml-0.5" />
        )}
        
        {/* Mini progress ring */}
        {(isThisPlaying || isThisPaused) && progressPercent > 0 && (
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 32 32"
          >
            <circle
              cx="16"
              cy="16"
              r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${progressPercent * 0.88} 88`}
              className="text-cyan-500"
            />
          </svg>
        )}
      </button>
    );
  }
  
  // Full mode with track info and progress bar
  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 p-2.5 rounded-lg transition-all",
        "bg-zinc-800/50 border border-zinc-700/30 hover:border-zinc-600/50",
        (isThisPlaying || isThisPaused) && "bg-zinc-800/80 border-cyan-500/30",
        className
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Play/Pause Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleToggle();
        }}
        className={cn(
          "relative flex items-center justify-center w-10 h-10 rounded-full transition-all flex-shrink-0",
          "bg-zinc-700/80 hover:bg-zinc-600 border border-zinc-600/50",
          "focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
          isThisPlaying && "bg-cyan-500/20 border-cyan-500/50 hover:bg-cyan-500/30",
          isThisLoading && "animate-pulse"
        )}
        aria-label={isThisPlaying ? "Pause preview" : "Play preview"}
      >
        {isThisLoading ? (
          <div className="w-5 h-5 border-2 border-zinc-400 border-t-cyan-400 rounded-full animate-spin" />
        ) : isThisPlaying ? (
          <Pause className="w-5 h-5 text-cyan-400" />
        ) : (
          <Play className="w-5 h-5 text-zinc-200 ml-0.5" />
        )}
      </button>
      
      {/* Track Info & Progress */}
      <div className="flex-1 min-w-0">
        {/* Track Name */}
        <div className="flex items-center gap-2">
          <Music2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          <p className="text-xs font-medium text-zinc-300 truncate" title={trackName}>
            {trackName}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          className={cn(
            "relative h-1.5 mt-1.5 rounded-full overflow-hidden cursor-pointer",
            "bg-zinc-700/80"
          )}
        >
          {/* Progress Fill */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-75",
              isThisPlaying ? "bg-gradient-to-r from-cyan-500 to-cyan-400" : "bg-zinc-500"
            )}
            style={{ width: `${progressPercent}%` }}
          />
          
          {/* Animated glow when playing */}
          {isThisPlaying && (
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/50 blur-sm"
              style={{ width: `${progressPercent}%` }}
            />
          )}
        </div>
        
        {/* Time Display */}
        {(isThisPlaying || isThisPaused) && duration > 0 && (
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {formatTime(progress)}
            </span>
            <span className="text-[10px] text-zinc-500 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        )}
        
        {/* Hint text when idle */}
        {state === "idle" && (
          <p className="text-[10px] text-zinc-500 mt-1">
            Click to preview
          </p>
        )}
      </div>
      
      {/* Playing indicator animation */}
      {isThisPlaying && (
        <div className="flex items-end gap-0.5 h-4 mr-1">
          {[1, 2, 3].map((bar) => (
            <div
              key={bar}
              className="w-1 bg-cyan-400 rounded-full animate-audio-bar"
              style={{
                height: "100%",
                animationDelay: `${bar * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
      
      {/* Tooltip */}
      {showTooltip && state === "idle" && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-[10px] text-zinc-300 whitespace-nowrap z-10 pointer-events-none">
          Preview: {trackName}
        </div>
      )}
    </div>
  );
}

/**
 * Minimal play button for tight spaces (e.g., list items)
 */
export function AudioPreviewButton({
  previewUrl,
  trackName,
  artistName,
  highlightStartMs = 0,
  size = "sm",
  className,
}: Omit<AudioPreviewProps, "compact"> & { size?: "sm" | "md" }) {
  return (
    <AudioPreview
      previewUrl={previewUrl}
      trackName={trackName}
      artistName={artistName}
      highlightStartMs={highlightStartMs}
      compact
      className={cn(
        size === "md" && "w-10 h-10",
        className
      )}
    />
  );
}
