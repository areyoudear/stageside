"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import {
  Calendar,
  MapPin,
  Heart,
  ExternalLink,
  Ticket,
  Zap,
  Music2,
  Users,
  Flame,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, daysUntil, cn } from "@/lib/utils";
import { TicketSourcesDropdown, TicketSourcesInline } from "@/components/TicketSourcesDropdown";
import type { Concert } from "@/lib/ticketmaster";

// Vibe types based on genre
type VibeType = "chill" | "energetic" | "intimate" | "festival" | "diverse";

interface ConcertCardProps {
  concert: Concert;
  onSave?: (concertId: string) => void;
  onUnsave?: (concertId: string) => void;
  isAuthenticated?: boolean;
  isDemo?: boolean;
}

// Map genres to vibes
function getVibe(genres: string[]): { type: VibeType; label: string; icon: typeof Zap; color: string } {
  const genreString = genres.join(" ").toLowerCase();

  if (genreString.match(/jazz|acoustic|classical|soul|r&b|ambient|folk/)) {
    return { type: "chill", label: "Chill Vibes", icon: Music2, color: "text-blue-400 bg-blue-500/20" };
  }
  if (genreString.match(/edm|electronic|dance|house|techno|dubstep/)) {
    return { type: "energetic", label: "High Energy", icon: Zap, color: "text-yellow-400 bg-yellow-500/20" };
  }
  if (genreString.match(/indie|singer|songwriter|acoustic|small/)) {
    return { type: "intimate", label: "Intimate Show", icon: Users, color: "text-purple-400 bg-purple-500/20" };
  }
  if (genreString.match(/rock|metal|punk|hip-hop|rap|pop/)) {
    return { type: "festival", label: "Big Energy", icon: Flame, color: "text-orange-400 bg-orange-500/20" };
  }
  return { type: "diverse", label: "Mixed Vibes", icon: Music2, color: "text-pink-400 bg-pink-500/20" };
}

// Get urgency level
function getUrgency(daysLeft: number): { show: boolean; label: string; color: string } | null {
  if (daysLeft <= 0) return null;
  if (daysLeft === 1) return { show: true, label: "Tomorrow!", color: "bg-red-500 text-white" };
  if (daysLeft <= 3) return { show: true, label: `${daysLeft} days left`, color: "bg-orange-500 text-white" };
  if (daysLeft <= 7) return { show: true, label: "This week", color: "bg-amber-500/80 text-white" };
  return null;
}

export function ConcertCard({
  concert,
  onSave,
  onUnsave,
  isAuthenticated = false,
  isDemo = false,
}: ConcertCardProps) {
  const [isSaved, setIsSaved] = useState(concert.isSaved || false);
  const [imageError, setImageError] = useState(false);

  const daysLeft = daysUntil(concert.date);
  const vibe = useMemo(() => getVibe(concert.genres), [concert.genres]);
  const urgency = useMemo(() => getUrgency(daysLeft), [daysLeft]);

  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(concert.id);
    } else {
      onSave?.(concert.id);
    }
    setIsSaved(!isSaved);
  };

  // Determine match quality for styling
  const matchQuality = concert.matchScore
    ? concert.matchScore >= 100
      ? "perfect"
      : concert.matchScore >= 70
      ? "great"
      : concert.matchScore >= 40
      ? "good"
      : "match"
    : null;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border transition-all duration-300",
        "bg-zinc-900/70 hover:bg-zinc-900",
        matchQuality === "perfect"
          ? "border-green-500/50 hover:border-green-500"
          : matchQuality === "great"
          ? "border-emerald-500/30 hover:border-emerald-500/50"
          : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Perfect match glow effect */}
      {matchQuality === "perfect" && (
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />
      )}

      {/* Image Section */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {!imageError ? (
          <Image
            src={concert.imageUrl}
            alt={concert.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/80 to-pink-600/80 flex items-center justify-center">
            <Music2 className="w-12 h-12 text-white/60" />
          </div>
        )}

        {/* Gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top badges row */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
          {/* Match Score Badge */}
          {concert.matchScore !== undefined && concert.matchScore > 0 && (
            <Badge
              className={cn(
                "font-bold shadow-lg",
                matchQuality === "perfect"
                  ? "bg-green-500 text-white border-green-400"
                  : matchQuality === "great"
                  ? "bg-emerald-500/90 text-white border-emerald-400"
                  : "bg-zinc-800/90 text-green-400 border-zinc-700"
              )}
            >
              {matchQuality === "perfect" ? "⭐ Perfect Match" : `${concert.matchScore}% Match`}
            </Badge>
          )}

          {/* Urgency Badge */}
          {urgency && (
            <Badge className={cn("font-medium shadow-lg animate-pulse", urgency.color)}>
              <Clock className="w-3 h-3 mr-1" />
              {urgency.label}
            </Badge>
          )}
        </div>

        {/* Bottom overlay - Vibe indicator */}
        <div className="absolute bottom-3 left-3 right-12">
          <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", vibe.color)}>
            <vibe.icon className="w-3.5 h-3.5" />
            {vibe.label}
          </div>
        </div>

        {/* Save Button */}
        {(isAuthenticated || isDemo) && (
          <button
            onClick={handleSaveToggle}
            className="absolute bottom-3 right-3 p-2.5 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-all hover:scale-110"
            aria-label={isSaved ? "Remove from saved" : "Save concert"}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-colors",
                isSaved ? "fill-red-500 text-red-500" : "text-white"
              )}
            />
          </button>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4 space-y-3">
        {/* Artist Name */}
        <div>
          <h3 className="font-bold text-lg text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
            {concert.artists.join(", ")}
          </h3>
          {concert.name !== concert.artists.join(", ") && (
            <p className="text-sm text-zinc-400 line-clamp-1">{concert.name}</p>
          )}
        </div>

        {/* Why You'll Love This - Only for matches */}
        {concert.matchReasons && concert.matchReasons.length > 0 && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-lg">✨</span>
            <div>
              <p className="text-xs font-medium text-green-400 uppercase tracking-wide">Why you&apos;ll love this</p>
              <p className="text-sm text-green-300/90">{concert.matchReasons[0]}</p>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-zinc-300">
            <Calendar className="w-4 h-4 flex-shrink-0 text-purple-400" />
            <span className="font-medium">{formatDate(concert.date)}</span>
            {concert.time && (
              <span className="text-zinc-500">
                • {concert.time.slice(0, 5)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <MapPin className="w-4 h-4 flex-shrink-0 text-purple-400" />
            <span className="line-clamp-1">
              {concert.venue.name}
              <span className="text-zinc-500">
                {" "}• {concert.venue.city}
                {concert.venue.state && `, ${concert.venue.state}`}
              </span>
            </span>
          </div>
        </div>

        {/* Price + Genres Row */}
        <div className="flex items-center justify-between pt-1">
          {/* Price Range */}
          <div className="flex items-center gap-2">
            {concert.priceRange ? (
              <div className="flex items-center gap-1.5">
                <Ticket className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-400">
                  ${concert.priceRange.min}
                </span>
                <span className="text-xs text-zinc-500">
                  - ${concert.priceRange.max}
                </span>
              </div>
            ) : (
              <span className="text-sm text-zinc-500">Price TBA</span>
            )}
            {/* Show available sources indicator */}
            <TicketSourcesInline concert={concert} />
          </div>

          {/* Genre pills */}
          {concert.genres.length > 0 && (
            <div className="flex gap-1">
              {concert.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="px-2 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Get Tickets Button */}
        {isDemo ? (
          <Button
            className="w-full mt-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white"
            onClick={() => alert("Connect Spotify to get real ticket links!")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Get Tickets (Demo)
          </Button>
        ) : (
          <div className="mt-1">
            <TicketSourcesDropdown 
              concert={concert} 
              isPerfectMatch={matchQuality === "perfect"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton for ConcertCard
export function ConcertCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-zinc-900/50 border-zinc-800">
      <div className="aspect-[16/9] bg-zinc-800 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <div className="h-6 bg-zinc-800 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
        </div>
        <div className="h-16 bg-zinc-800/50 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-full" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
        </div>
        <div className="h-10 bg-zinc-800 rounded animate-pulse w-full mt-2" />
      </CardContent>
    </Card>
  );
}
