"use client";

import Image from "next/image";
import Link from "next/link";
import { Calendar, MapPin, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MatchBadge } from "./MatchPercentage";
import type { FestivalWithMatch } from "@/lib/festival-types";
import { useState } from "react";

interface FestivalCardProps {
  festival: FestivalWithMatch;
  showMatchDetails?: boolean;
}

export function FestivalCard({ festival, showMatchDetails = false }: FestivalCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatDateRange = (dates: { start: string; end: string }) => {
    const start = new Date(dates.start);
    const end = new Date(dates.end);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    if (start.getMonth() === end.getMonth()) {
      return `${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  };

  return (
    <Link href={`/festivals/${festival.slug || festival.id}`}>
      <Card className="group overflow-hidden bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300 cursor-pointer h-full">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {!imageError && festival.image_url ? (
            <Image
              src={festival.image_url}
              alt={festival.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-pink-500 flex items-center justify-center">
              <Music className="w-12 h-12 text-white/50" />
            </div>
          )}

          {/* Match Badge */}
          <div className="absolute top-3 left-3">
            <MatchBadge percentage={festival.matchPercentage} />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Festival name on image */}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="font-bold text-lg text-white line-clamp-2">
              {festival.name}
            </h3>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Date & Location */}
          <div className="space-y-2 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0 text-purple-400" />
              <span>{formatDateRange(festival.dates)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0 text-pink-400" />
              <span className="line-clamp-1">
                {festival.location.city}
                {festival.location.state && `, ${festival.location.state}`}
              </span>
            </div>
          </div>

          {/* Genres */}
          {festival.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {festival.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Match Details */}
          {showMatchDetails && festival.matchedArtistCount > 0 && (
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                <span className="text-green-400 font-medium">
                  {festival.matchedArtistCount}
                </span>{" "}
                artists you'll love
              </p>
              {festival.perfectMatches.length > 0 && (
                <p className="text-xs text-zinc-600 mt-1 line-clamp-1">
                  Including{" "}
                  {festival.perfectMatches
                    .slice(0, 2)
                    .map((a) => a.artist_name)
                    .join(", ")}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// Skeleton for loading state
export function FestivalCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-zinc-900/50 border-zinc-800">
      <div className="aspect-[16/10] bg-zinc-800 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
        </div>
        <div className="flex gap-1">
          <div className="h-5 w-16 bg-zinc-800 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-zinc-800 rounded-full animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
