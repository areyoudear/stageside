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
  Sparkles,
  Star,
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

// Map genres to vibes with colors
function getVibe(genres: string[]): { 
  type: VibeType; 
  label: string; 
  icon: typeof Zap; 
  color: string;
  bgGradient: string;
  borderColor: string;
} {
  const genreString = genres.join(" ").toLowerCase();

  if (genreString.match(/jazz|acoustic|classical|soul|r&b|ambient|folk|lounge/)) {
    return { 
      type: "chill", 
      label: "Chill", 
      icon: Music2, 
      color: "text-sky-400",
      bgGradient: "from-sky-500/20 via-sky-500/10 to-transparent",
      borderColor: "border-sky-500/30 hover:border-sky-500/60"
    };
  }
  if (genreString.match(/edm|electronic|dance|house|techno|dubstep|trance/)) {
    return { 
      type: "energetic", 
      label: "High Energy", 
      icon: Zap, 
      color: "text-yellow-400",
      bgGradient: "from-yellow-500/20 via-yellow-500/10 to-transparent",
      borderColor: "border-yellow-500/30 hover:border-yellow-500/60"
    };
  }
  if (genreString.match(/indie|singer|songwriter|acoustic|alternative/)) {
    return { 
      type: "intimate", 
      label: "Intimate", 
      icon: Users, 
      color: "text-violet-400",
      bgGradient: "from-violet-500/20 via-violet-500/10 to-transparent",
      borderColor: "border-violet-500/30 hover:border-violet-500/60"
    };
  }
  if (genreString.match(/rock|metal|punk|hip-hop|rap|pop|latin/)) {
    return { 
      type: "festival", 
      label: "Big Show", 
      icon: Flame, 
      color: "text-orange-400",
      bgGradient: "from-orange-500/20 via-orange-500/10 to-transparent",
      borderColor: "border-orange-500/30 hover:border-orange-500/60"
    };
  }
  return { 
    type: "diverse", 
    label: "Mixed", 
    icon: Music2, 
    color: "text-fuchsia-400",
    bgGradient: "from-fuchsia-500/20 via-fuchsia-500/10 to-transparent",
    borderColor: "border-fuchsia-500/30 hover:border-fuchsia-500/60"
  };
}

// Get urgency level with more emotion
function getUrgency(daysLeft: number): { show: boolean; label: string; color: string; emoji: string } | null {
  if (daysLeft <= 0) return null;
  if (daysLeft === 1) return { show: true, label: "Tomorrow!", color: "bg-red-500 text-white", emoji: "🔥" };
  if (daysLeft <= 3) return { show: true, label: `${daysLeft} days`, color: "bg-orange-500 text-white", emoji: "⚡" };
  if (daysLeft <= 7) return { show: true, label: "This week", color: "bg-amber-500/90 text-white", emoji: "📅" };
  return null;
}

// Match score ring component
function MatchScoreRing({ score, isPerfect }: { score: number; isPerfect: boolean }) {
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative w-14 h-14 flex items-center justify-center">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 44 44">
        {/* Background ring */}
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-zinc-800"
        />
        {/* Progress ring */}
        <circle
          cx="22"
          cy="22"
          r="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-700",
            isPerfect ? "text-green-400" : score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-orange-400"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn(
          "text-sm font-bold",
          isPerfect ? "text-green-400" : "text-white"
        )}>
          {score}%
        </span>
      </div>
    </div>
  );
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

  // Determine match quality
  const matchScore = concert.matchScore || 0;
  const isPerfectMatch = matchScore >= 95;
  const isGreatMatch = matchScore >= 75;
  const isGoodMatch = matchScore >= 50;

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500",
        "bg-zinc-900/80 backdrop-blur-sm hover:bg-zinc-900",
        isPerfectMatch 
          ? "border-2 border-green-500/50 hover:border-green-400 shadow-lg shadow-green-500/10 hover:shadow-green-500/20"
          : isGreatMatch
          ? `border ${vibe.borderColor}`
          : "border border-zinc-800/80 hover:border-zinc-700"
      )}
    >
      {/* Perfect match shimmer effect */}
      {isPerfectMatch && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-500/10 to-transparent animate-shimmer pointer-events-none" />
      )}

      {/* Genre-colored top accent */}
      <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", vibe.bgGradient.replace('to-transparent', 'to-transparent'))} />

      {/* Image Section */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {!imageError ? (
          <Image
            src={concert.imageUrl}
            alt={concert.name}
            fill
            className="object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={cn("absolute inset-0 bg-gradient-to-br flex items-center justify-center", vibe.bgGradient)}>
            <Music2 className="w-16 h-16 text-white/30" />
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30 group-hover:opacity-40 transition-opacity", vibe.bgGradient)} />

        {/* Urgency badge */}
        {urgency && (
          <div className={cn(
            "absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg",
            urgency.color
          )}>
            <span>{urgency.emoji}</span>
            <span>{urgency.label}</span>
          </div>
        )}

        {/* Save Button */}
        {(isAuthenticated || isDemo) && (
          <button
            onClick={handleSaveToggle}
            className={cn(
              "absolute top-3 left-3 p-2.5 rounded-full backdrop-blur-md transition-all duration-300",
              isSaved 
                ? "bg-red-500/20 hover:bg-red-500/30" 
                : "bg-black/30 hover:bg-black/50"
            )}
            aria-label={isSaved ? "Remove from saved" : "Save concert"}
          >
            <Heart
              className={cn(
                "w-5 h-5 transition-all",
                isSaved ? "fill-red-500 text-red-500 scale-110" : "text-white/80 hover:text-white"
              )}
            />
          </button>
        )}

        {/* Vibe indicator pill */}
        <div className="absolute bottom-3 left-3">
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md",
            "bg-black/40 border border-white/10",
            vibe.color
          )}>
            <vibe.icon className="w-3.5 h-3.5" />
            <span>{vibe.label}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-5 space-y-4">
        {/* Header with match score */}
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-white line-clamp-1 group-hover:text-purple-200 transition-colors">
              {concert.artists.join(", ")}
            </h3>
            {concert.name !== concert.artists.join(", ") && (
              <p className="text-sm text-zinc-500 line-clamp-1 mt-0.5">{concert.name}</p>
            )}
          </div>
          
          {/* Match Score Ring */}
          {matchScore > 0 && (
            <MatchScoreRing score={matchScore} isPerfect={isPerfectMatch} />
          )}
        </div>

        {/* Why You'll Love This - Emotional connection */}
        {concert.matchReasons && concert.matchReasons.length > 0 && (
          <div className={cn(
            "relative p-3 rounded-xl overflow-hidden",
            isPerfectMatch 
              ? "bg-gradient-to-br from-green-500/15 to-emerald-500/10 border border-green-500/20" 
              : "bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/10"
          )}>
            <div className="flex items-start gap-2">
              {isPerfectMatch ? (
                <Star className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-violet-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider mb-1",
                  isPerfectMatch ? "text-green-400" : "text-violet-400"
                )}>
                  {isPerfectMatch ? "Perfect for you" : "Why you'll love this"}
                </p>
                <p className={cn(
                  "text-sm leading-relaxed",
                  isPerfectMatch ? "text-green-200/90" : "text-zinc-300"
                )}>
                  {concert.matchReasons[0]}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="grid grid-cols-1 gap-2">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <span className="font-medium text-white">{formatDate(concert.date)}</span>
              {concert.time && (
                <span className="text-zinc-500 ml-2">
                  {concert.time.slice(0, 5)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="min-w-0">
              <span className="text-zinc-300 line-clamp-1">{concert.venue.name}</span>
              <span className="text-zinc-500 text-xs ml-1">
                {concert.venue.city}{concert.venue.state && `, ${concert.venue.state}`}
              </span>
            </div>
          </div>
        </div>

        {/* Price + Genres Row */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/50">
          {/* Price Range */}
          <div className="flex items-center gap-2">
            {concert.priceRange ? (
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-emerald-400">
                  ${concert.priceRange.min}
                </span>
                <span className="text-xs text-zinc-500">
                  – ${concert.priceRange.max}
                </span>
              </div>
            ) : (
              <span className="text-sm text-zinc-500">Price TBA</span>
            )}
            <TicketSourcesInline concert={concert} />
          </div>

          {/* Genre pills */}
          {concert.genres.length > 0 && (
            <div className="flex gap-1.5">
              {concert.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-full bg-zinc-800/80 text-zinc-400 uppercase tracking-wide"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        {isDemo ? (
          <Button
            className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-white font-medium"
            onClick={() => alert("Connect your music to get real tickets!")}
          >
            <Ticket className="w-4 h-4 mr-2" />
            Get Tickets (Demo)
          </Button>
        ) : (
          <TicketSourcesDropdown 
            concert={concert} 
            isPerfectMatch={isPerfectMatch}
          />
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton with emotion
export function ConcertCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-zinc-900/50 border border-zinc-800/50">
      <div className="relative">
        <div className="aspect-[16/9] bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
        <div className="absolute bottom-3 left-3">
          <div className="h-6 w-20 bg-zinc-800/80 rounded-full animate-pulse" />
        </div>
      </div>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-zinc-800 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-zinc-800/50 rounded animate-pulse w-1/2" />
          </div>
          <div className="w-14 h-14 rounded-full bg-zinc-800 animate-pulse" />
        </div>
        <div className="h-16 bg-zinc-800/30 rounded-xl animate-pulse" />
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded animate-pulse w-32" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded animate-pulse w-40" />
          </div>
        </div>
        <div className="h-11 bg-zinc-800 rounded-lg animate-pulse w-full" />
      </CardContent>
    </Card>
  );
}
