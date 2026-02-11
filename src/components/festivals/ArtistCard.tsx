"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Check, Music, Star, Sparkles, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FestivalArtistMatch } from "@/lib/festival-types";

interface ArtistCardProps {
  artist: FestivalArtistMatch;
  isInAgenda?: boolean;
  onToggleAgenda?: (artistId: string) => void;
  showScheduleInfo?: boolean;
  compact?: boolean;
}

export function ArtistCard({
  artist,
  isInAgenda = false,
  onToggleAgenda,
  showScheduleInfo = false,
  compact = false,
}: ArtistCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getMatchBorderColor = () => {
    switch (artist.matchType) {
      case "perfect":
        return "border-green-500/50 hover:border-green-500";
      case "genre":
      case "discovery":
        return "border-yellow-500/30 hover:border-yellow-500/60";
      default:
        return "border-zinc-800 hover:border-zinc-700";
    }
  };

  const getMatchIcon = () => {
    switch (artist.matchType) {
      case "perfect":
        return <Star className="w-3 h-3 fill-green-400 text-green-400" />;
      case "genre":
      case "discovery":
        return <Sparkles className="w-3 h-3 text-yellow-400" />;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer",
          getMatchBorderColor(),
          isInAgenda && "bg-green-500/10"
        )}
        onClick={() => onToggleAgenda?.(artist.id)}
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
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
              <Music className="w-4 h-4 text-white/50" />
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

        {/* Action */}
        <div className="flex-shrink-0">
          {isInAgenda ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : isHovered ? (
            <Plus className="w-4 h-4 text-zinc-400" />
          ) : null}
        </div>
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
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <Music className="w-12 h-12 text-white/30" />
          </div>
        )}

        {/* Match indicator overlay */}
        {artist.matchType !== "none" && (
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

        {/* Add to agenda button */}
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
                : "bg-black/60 backdrop-blur-sm text-white hover:bg-black/80"
            )}
          >
            {isInAgenda ? (
              <Check className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Play preview button (placeholder) */}
        {isHovered && !isInAgenda && (
          <button className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            </div>
          </button>
        )}
      </div>

      <CardContent className="p-3">
        <h4 className="font-semibold text-white truncate">{artist.artist_name}</h4>

        {/* Match reason */}
        {artist.matchReason && (
          <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
            {getMatchIcon()}
            {artist.matchReason}
          </p>
        )}

        {/* Schedule info */}
        {showScheduleInfo && (artist.day || artist.stage) && (
          <div className="mt-2 pt-2 border-t border-zinc-800">
            <p className="text-xs text-zinc-500">
              {artist.day && <span className="text-purple-400">{artist.day}</span>}
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
