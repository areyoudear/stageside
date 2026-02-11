"use client";

import { useState, useMemo, useEffect } from "react";
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
  HelpCircle,
  Share2,
  Check,
  Bell,
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

// Match score component with explainer tooltip
function MatchScoreWithTooltip({ score, isPerfect }: { score: number; isPerfect: boolean }) {
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="relative group">
      {/* Score Ring */}
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
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
            "text-xs font-bold",
            isPerfect ? "text-green-400" : "text-white"
          )}>
            {score}%
          </span>
        </div>
      </div>
      
      {/* Explainer tooltip */}
      <div className="absolute top-0 right-0 -mr-1 -mt-1">
        <div className="relative">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-600 cursor-help" />
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl border border-zinc-700">
            <p className="font-medium text-white mb-1">Match Score</p>
            <p>This % is based on how closely this concert matches the artists you selected. Connect Spotify for better accuracy.</p>
          </div>
        </div>
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
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    if (saved.includes(concert.id)) {
      setIsSaved(true);
    }
  }, [concert.id]);

  const daysLeft = daysUntil(concert.date);
  const vibe = useMemo(() => getVibe(concert.genres), [concert.genres]);
  const urgency = useMemo(() => getUrgency(daysLeft), [daysLeft]);

  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(concert.id);
      setIsSaved(false);
    } else {
      onSave?.(concert.id);
      setIsSaved(true);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: concert.artists.join(", "),
      text: `Check out ${concert.artists.join(", ")} at ${concert.venue.name}!`,
      url: concert.ticketUrl || window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url);
      alert('Link copied to clipboard!');
    }
  };

  // Determine match quality
  const matchScore = concert.matchScore || 0;
  const isPerfectMatch = matchScore >= 95;
  const isGreatMatch = matchScore >= 75;

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
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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

        {/* Save & Share Buttons */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {/* Save Button */}
          <button
            onClick={handleSaveToggle}
            className={cn(
              "relative p-2.5 rounded-full backdrop-blur-md transition-all duration-300",
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
            {/* Saved feedback toast */}
            {showSavedFeedback && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-md whitespace-nowrap animate-fade-in">
                <Check className="w-3 h-3 inline mr-1" />
                Saved!
              </div>
            )}
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="p-2.5 rounded-full backdrop-blur-md bg-black/30 hover:bg-black/50 transition-all duration-300"
            aria-label="Share concert"
          >
            <Share2 className="w-5 h-5 text-white/80 hover:text-white transition-colors" />
          </button>
        </div>

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

      {/* Content Section - Reduced density */}
      <CardContent className="p-4 space-y-3">
        {/* Header with match score */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base text-white line-clamp-2 group-hover:text-purple-200 transition-colors leading-tight">
              {concert.artists.join(", ")}
            </h3>
          </div>
          
          {/* Match Score with Tooltip */}
          {matchScore > 0 && (
            <MatchScoreWithTooltip score={matchScore} isPerfect={isPerfectMatch} />
          )}
        </div>

        {/* Event Details - Compact */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span className="font-medium text-white">{formatDate(concert.date)}</span>
            {concert.time && (
              <span className="text-zinc-500 text-xs">
                {concert.time.slice(0, 5)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            <span className="text-zinc-300 line-clamp-1">{concert.venue.name}</span>
          </div>
        </div>

        {/* Why You'll Love This - HIDDEN BY DEFAULT, shows on hover */}
        {concert.matchReasons && concert.matchReasons.length > 0 && isHovered && (
          <div className={cn(
            "p-2.5 rounded-lg overflow-hidden animate-fade-in",
            isPerfectMatch 
              ? "bg-green-500/10 border border-green-500/20" 
              : "bg-violet-500/10 border border-violet-500/10"
          )}>
            <div className="flex items-start gap-2">
              {isPerfectMatch ? (
                <Star className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
              )}
              <p className={cn(
                "text-xs leading-relaxed",
                isPerfectMatch ? "text-green-200/90" : "text-zinc-300"
              )}>
                {concert.matchReasons[0]}
              </p>
            </div>
          </div>
        )}

        {/* Genre tags - Only show on hover */}
        {concert.genres.length > 0 && isHovered && (
          <div className="flex flex-wrap gap-1.5 animate-fade-in">
            {concert.genres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-zinc-800/80 text-zinc-400 uppercase tracking-wide"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Price + CTA Row */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
          {/* Price */}
          <div className="flex items-center gap-2">
            {concert.priceRange ? (
              <span className="text-sm font-bold text-green-400">
                From ${concert.priceRange.min}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Price TBA</span>
                <button className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Set alert
                </button>
              </div>
            )}
            <TicketSourcesInline concert={concert} />
          </div>
        </div>

        {/* Action Button - Standardized CTAs */}
        {isDemo ? (
          <Button
            className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 text-white font-medium"
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

// Loading skeleton
export function ConcertCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-zinc-900/50 border border-zinc-800/50">
      <div className="relative">
        <div className="aspect-[16/9] bg-gradient-to-br from-zinc-800 to-zinc-900 animate-pulse" />
        <div className="absolute bottom-3 left-3">
          <div className="h-6 w-20 bg-zinc-800/80 rounded-full animate-pulse" />
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-zinc-800 rounded animate-pulse w-3/4" />
          </div>
          <div className="w-12 h-12 rounded-full bg-zinc-800 animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded animate-pulse w-32" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded animate-pulse w-40" />
          </div>
        </div>
        <div className="h-10 bg-zinc-800 rounded-lg animate-pulse w-full" />
      </CardContent>
    </Card>
  );
}
