"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Plus, Check, Music, Star, Sparkles, Heart, Play, Pause, Volume2, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { FestivalArtistMatch } from "@/lib/festival-types";

interface ArtistCardProps {
  artist: FestivalArtistMatch;
  isInAgenda?: boolean;
  onToggleAgenda?: (artistId: string) => void;
  showScheduleInfo?: boolean;
  showMatchScore?: boolean;
  compact?: boolean;
  interestStatus?: "interested" | "going" | null;
  onInterestChange?: (artistId: string, status: "interested" | "going" | null) => void;
  previewUrl?: string;
  spotifyUrl?: string;
}

export function ArtistCard({
  artist,
  isInAgenda = false,
  onToggleAgenda,
  showScheduleInfo = false,
  showMatchScore = true,
  compact = false,
  interestStatus = null,
  onInterestChange,
  previewUrl,
  spotifyUrl,
}: ArtistCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [localInterestStatus, setLocalInterestStatus] = useState(interestStatus);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Handle audio preview
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!previewUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(previewUrl);
      audioRef.current.volume = 0.5;
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleInterestClick = (e: React.MouseEvent, status: "interested" | "going") => {
    e.stopPropagation();
    const newStatus = localInterestStatus === status ? null : status;
    setLocalInterestStatus(newStatus);
    onInterestChange?.(artist.id, newStatus);
  };

  const getMatchBorderColor = () => {
    if (artist.matchScore >= 80) return "border-green-500/50 hover:border-green-500";
    if (artist.matchScore >= 50) return "border-yellow-500/30 hover:border-yellow-500/60";
    if (artist.matchScore > 0) return "border-orange-500/30 hover:border-orange-500/60";
    return "border-zinc-800 hover:border-zinc-700";
  };

  const getMatchIcon = () => {
    if (artist.matchType === "perfect" || artist.matchScore >= 80) {
      return <Star className="w-3 h-3 fill-green-400 text-green-400" />;
    }
    if (artist.matchType === "genre" || artist.matchType === "discovery" || artist.matchScore > 0) {
      return <Sparkles className="w-3 h-3 text-yellow-400" />;
    }
    return null;
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-400 text-green-400";
    if (score >= 50) return "from-yellow-500 to-orange-400 text-yellow-400";
    if (score >= 30) return "from-orange-500 to-red-400 text-orange-400";
    return "from-zinc-500 to-zinc-400 text-zinc-400";
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500/20 border-green-500/40";
    if (score >= 50) return "bg-yellow-500/20 border-yellow-500/40";
    if (score >= 30) return "bg-orange-500/20 border-orange-500/40";
    return "bg-zinc-500/20 border-zinc-500/40";
  };

  // Generate gradient based on artist name for consistent fallback colors
  const getArtistGradient = (name: string) => {
    const hash = name.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
    const gradients = [
      "from-violet-600 via-purple-500 to-fuchsia-500",
      "from-cyan-600 via-blue-500 to-indigo-500",
      "from-emerald-600 via-teal-500 to-cyan-500",
      "from-orange-600 via-red-500 to-pink-500",
      "from-pink-600 via-rose-500 to-red-500",
      "from-indigo-600 via-violet-500 to-purple-500",
      "from-amber-600 via-orange-500 to-red-500",
      "from-teal-600 via-emerald-500 to-green-500",
    ];
    return gradients[Math.abs(hash) % gradients.length];
  };

  // Get initials for fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border transition-all",
          getMatchBorderColor(),
          isInAgenda && "bg-green-500/10"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
          {!imageError && artist.image_url ? (
            <Image
              src={artist.image_url}
              alt={artist.artist_name}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={cn(
              "w-full h-full bg-gradient-to-br flex items-center justify-center",
              getArtistGradient(artist.artist_name)
            )}>
              <span className="text-white/90 font-bold text-xs">
                {getInitials(artist.artist_name)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white text-sm truncate">
            {artist.artist_name}
          </p>
          {artist.matchReason && (
            <p className="text-xs text-zinc-500 flex items-center gap-1 truncate">
              {getMatchIcon()}
              {artist.matchReason}
            </p>
          )}
        </div>

        {/* Match Score */}
        {showMatchScore && artist.matchScore > 0 && (
          <div
            className={cn(
              "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-bold border",
              getMatchScoreBg(artist.matchScore)
            )}
          >
            <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", getMatchScoreColor(artist.matchScore))}>
              {artist.matchScore}%
            </span>
          </div>
        )}

        {/* Interest button */}
        {onInterestChange && (
          <button
            onClick={(e) => handleInterestClick(e, "interested")}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-full transition-all",
              localInterestStatus === "interested"
                ? "bg-violet-500/80 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-violet-500/60 hover:text-white"
            )}
            title={localInterestStatus === "interested" ? "Remove interest" : "Interested"}
          >
            <Heart className={cn("w-3 h-3", localInterestStatus === "interested" && "fill-white")} />
          </button>
        )}

        {/* Preview button */}
        {previewUrl && (
          <button
            onClick={togglePreview}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-full transition-colors",
              isPlaying 
                ? "bg-green-500/80 text-white" 
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
            )}
            title={isPlaying ? "Pause" : "Play preview"}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Add to agenda button */}
        {onToggleAgenda && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAgenda(artist.id);
            }}
            className={cn(
              "flex-shrink-0 p-1.5 rounded-full transition-all",
              isInAgenda
                ? "bg-green-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-cyan-600 hover:text-white"
            )}
            title={isInAgenda ? "Remove from schedule" : "Add to schedule"}
          >
            {isInAgenda ? (
              <Check className="w-3 h-3" />
            ) : (
              <Plus className="w-3 h-3" />
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "group overflow-hidden bg-zinc-900/50 border-2 transition-all duration-300",
        getMatchBorderColor(),
        isInAgenda && "ring-2 ring-green-500/30"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden">
        {!imageError && artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.artist_name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br flex flex-col items-center justify-center",
            getArtistGradient(artist.artist_name)
          )}>
            <span className="text-white/90 font-bold text-3xl mb-1">
              {getInitials(artist.artist_name)}
            </span>
            <span className="text-white/50 text-xs px-2 text-center truncate max-w-full">
              {artist.artist_name}
            </span>
          </div>
        )}

        {/* Match score badge */}
        {showMatchScore && artist.matchScore > 0 && (
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold border backdrop-blur-sm",
                getMatchScoreBg(artist.matchScore)
              )}
            >
              {getMatchIcon()}
              <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", getMatchScoreColor(artist.matchScore))}>
                {artist.matchScore}%
              </span>
            </span>
          </div>
        )}

        {/* Match type indicator (shown when no score) */}
        {artist.matchType !== "none" && (!showMatchScore || artist.matchScore === 0) && (
          <div className="absolute top-2 left-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                artist.matchType === "perfect"
                  ? "bg-green-500/90 text-white"
                  : "bg-yellow-500/90 text-black"
              )}
            >
              {getMatchIcon()}
              {artist.matchType === "perfect" ? "Perfect" : "Discovery"}
            </span>
          </div>
        )}

        {/* Preview + Spotify buttons - top right - show preview always if available */}
        <div className={cn(
          "absolute top-2 right-2 flex gap-1.5 transition-opacity",
          previewUrl ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          {previewUrl && (
            <button
              onClick={togglePreview}
              className={cn(
                "p-2 rounded-full backdrop-blur-md transition-all",
                isPlaying 
                  ? "bg-green-500/80 text-white" 
                  : "bg-black/60 text-white hover:bg-black/80"
              )}
              title={isPlaying ? "Pause preview" : "Play 30s preview"}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
          )}
          {spotifyUrl && (
            <a
              href={spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-[#1DB954] transition-all"
              title="Open in Spotify"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Interest button - bottom left - always visible */}
        {onInterestChange && (
          <button
            onClick={(e) => handleInterestClick(e, "interested")}
            className={cn(
              "absolute bottom-2 left-2 p-2 rounded-full backdrop-blur-md transition-all",
              localInterestStatus === "interested"
                ? "bg-violet-500/80 text-white"
                : "bg-black/60 text-white hover:bg-violet-500/60"
            )}
            title={localInterestStatus === "interested" ? "Remove interest" : "Interested"}
          >
            <Heart className={cn("w-4 h-4", localInterestStatus === "interested" && "fill-white")} />
          </button>
        )}

        {/* Add to agenda button - bottom right */}
        {onToggleAgenda && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleAgenda(artist.id);
            }}
            className={cn(
              "absolute bottom-2 right-2 p-2 rounded-full transition-all",
              isInAgenda
                ? "bg-green-500 text-white"
                : "bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 hover:bg-cyan-600"
            )}
            title={isInAgenda ? "Remove from schedule" : "Add to my schedule"}
          >
            {isInAgenda ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs">
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span>Playing</span>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <h4 className="font-semibold text-white truncate">{artist.artist_name}</h4>

        {/* Match reason with score context */}
        {artist.matchReason && (
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            {getMatchIcon()}
            <span className="truncate">{artist.matchReason}</span>
          </p>
        )}

        {/* Schedule info */}
        {showScheduleInfo && (artist.day || artist.stage) && (
          <div className="mt-2 pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              {artist.day && <span className="text-blue-400">{artist.day}</span>}
              {artist.day && artist.start_time && " • "}
              {artist.start_time && (
                <span className="text-pink-400">{artist.start_time}</span>
              )}
              {artist.stage && (
                <>
                  {" "}
                  @ <span className="text-zinc-400">{artist.stage}</span>
                </>
              )}
            </p>
          </div>
        )}

        {/* Genres */}
        {artist.genres && artist.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {artist.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 text-[10px]"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ArtistCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg border border-zinc-800">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 animate-pulse" />
        <div className="flex-1">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-24" />
          <div className="h-3 bg-zinc-800 rounded animate-pulse w-16 mt-1" />
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden bg-zinc-900/50 border-zinc-800">
      <div className="aspect-square bg-zinc-800 animate-pulse" />
      <CardContent className="p-3">
        <div className="h-5 bg-zinc-800 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-zinc-800 rounded animate-pulse w-1/2 mt-2" />
      </CardContent>
    </Card>
  );
}
