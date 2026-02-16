"use client";

import { useState, useMemo, useEffect, useRef } from "react";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, daysUntil, cn } from "@/lib/utils";
import { TicketSourcesDropdown, TicketSourcesInline } from "@/components/TicketSourcesDropdown";
import { track } from "@/lib/analytics";
import type { Concert } from "@/lib/ticketmaster";

// Vibe types based on genre
type VibeType = "chill" | "energetic" | "intimate" | "festival" | "diverse";

interface ConcertCardProps {
  concert: Concert;
  onSave?: (concertId: string) => void;
  onUnsave?: (concertId: string) => void;
  isAuthenticated?: boolean;
  isDemo?: boolean;
  hasProfile?: boolean;
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

// Get match label based on score
function getMatchLabel(score: number): { label: string; sublabel: string } {
  if (score >= 90) return { label: "Perfect", sublabel: "Your artist" };
  if (score >= 75) return { label: "Great", sublabel: "Similar taste" };
  if (score >= 60) return { label: "Good", sublabel: "You'll like this" };
  if (score >= 40) return { label: "Okay", sublabel: "Worth checking" };
  return { label: "", sublabel: "Near you" };
}

// Match score badge component - always visible, more prominent
function MatchScoreBadge({ score, isPerfect, matchReasons, onTooltipHover, hasProfile = true }: { 
  score: number; 
  isPerfect: boolean; 
  matchReasons?: string[];
  onTooltipHover?: () => void;
  hasProfile?: boolean;
}) {
  const matchLabel = getMatchLabel(score);
  
  // No profile - show CTA
  if (!hasProfile || score === 0) {
    return (
      <a 
        href="/settings" 
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/80 border border-zinc-700 hover:border-cyan-500/50 hover:bg-zinc-700/80 transition-all group"
      >
        <Sparkles className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400" />
        <span className="text-xs font-medium text-zinc-400 group-hover:text-cyan-300">Get match %</span>
      </a>
    );
  }

  // Get the specific reason for this match
  const primaryReason = matchReasons?.[0];
  const hasSpecificReason = primaryReason && primaryReason !== "Happening near you";
  
  return (
    <div className="relative group" onMouseEnter={onTooltipHover}>
      {/* Main badge */}
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full font-bold text-sm transition-all",
        isPerfect 
          ? "bg-green-500/20 border-2 border-green-500/60 text-green-400" 
          : score >= 80 
          ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
          : score >= 60
          ? "bg-yellow-500/15 border border-yellow-500/40 text-yellow-400"
          : "bg-zinc-800 border border-zinc-700 text-zinc-400"
      )}>
        {isPerfect && <Star className="w-3.5 h-3.5 fill-green-400" />}
        <span>{score}%</span>
        {matchLabel.label && (
          <span className={cn(
            "text-[10px] font-semibold uppercase tracking-wide",
            isPerfect ? "text-green-300" : score >= 80 ? "text-emerald-300" : "text-zinc-500"
          )}>
            {matchLabel.label}
          </span>
        )}
      </div>
      
      {/* Explainer tooltip - anchored to right edge to prevent cutoff */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl border border-zinc-700 pointer-events-none">
        <p className="font-medium text-white mb-1">
          {isPerfect ? "🔥 Perfect Match!" : score >= 75 ? "✨ Great Match" : "Match Score"}
        </p>
        <p className="leading-relaxed">
          {hasSpecificReason 
            ? primaryReason
            : "Based on your music preferences."}
        </p>
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
  hasProfile = true,
}: ConcertCardProps) {
  const [isSaved, setIsSaved] = useState(concert.isSaved || false);
  const [imageError, setImageError] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hoverStartTime = useRef<number | null>(null);
  const hasTrackedTooltip = useRef(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    if (saved.includes(concert.id)) {
      setIsSaved(true);
    }
  }, [concert.id]);

  // Track hover interactions
  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverStartTime.current = Date.now();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    // Only track if hovered for more than 500ms (meaningful engagement)
    if (hoverStartTime.current && Date.now() - hoverStartTime.current > 500) {
      track('concert_card_hovered', {
        concert_id: concert.id,
        artist: concert.artists.join(", "),
        match_score: concert.matchScore || 0,
      });
    }
    hoverStartTime.current = null;
  };

  // Track tooltip view
  const handleTooltipHover = () => {
    if (!hasTrackedTooltip.current) {
      hasTrackedTooltip.current = true;
      track('match_tooltip_viewed', { concert_id: concert.id });
    }
  };

  const daysLeft = daysUntil(concert.date);
  const vibe = useMemo(() => getVibe(concert.genres), [concert.genres]);
  const urgency = useMemo(() => getUrgency(daysLeft), [daysLeft]);

  const handleSaveToggle = () => {
    const artistName = concert.artists.join(", ");
    if (isSaved) {
      track('concert_unsaved', {
        concert_id: concert.id,
        artist: artistName,
      });
      onUnsave?.(concert.id);
      setIsSaved(false);
      // Remove from localStorage
      const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
      localStorage.setItem('savedConcerts', JSON.stringify(saved.filter((id: string) => id !== concert.id)));
    } else {
      track('concert_saved', {
        concert_id: concert.id,
        artist: artistName,
        match_score: concert.matchScore,
      });
      onSave?.(concert.id);
      setIsSaved(true);
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 2000);
      // Save to localStorage
      const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
      if (!saved.includes(concert.id)) {
        saved.push(concert.id);
        localStorage.setItem('savedConcerts', JSON.stringify(saved));
      }
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
        track('concert_shared', {
          concert_id: concert.id,
          artist: concert.artists.join(", "),
          method: 'native',
        });
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareData.url);
      track('concert_shared', {
        concert_id: concert.id,
        artist: concert.artists.join(", "),
        method: 'clipboard',
      });
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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

        {/* Match Score Badge - Always visible on image */}
        <div className="absolute bottom-3 right-3">
          <MatchScoreBadge 
            score={matchScore} 
            isPerfect={isPerfectMatch} 
            matchReasons={concert.matchReasons}
            onTooltipHover={handleTooltipHover}
            hasProfile={hasProfile}
          />
        </div>
      </div>

      {/* Content Section - Reduced density */}
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div>
          <h3 className="font-bold text-base text-white line-clamp-2 group-hover:text-cyan-200 transition-colors leading-tight">
            {concert.artists.join(", ")}
          </h3>
        </div>

        {/* Event Details - Compact */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
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

        {/* Why You'll Love This - Always visible for good matches */}
        {concert.matchReasons && concert.matchReasons.length > 0 && 
         concert.matchReasons[0] !== "Happening near you" && (
          <div className={cn(
            "p-2.5 rounded-lg overflow-hidden",
            isPerfectMatch 
              ? "bg-green-500/10 border border-green-500/20" 
              : isGreatMatch
              ? "bg-violet-500/10 border border-violet-500/20"
              : "bg-zinc-800/50 border border-zinc-700/30"
          )}>
            <div className="flex items-start gap-2">
              {isPerfectMatch ? (
                <Star className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              ) : isGreatMatch ? (
                <Sparkles className="w-3.5 h-3.5 text-violet-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Music2 className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs leading-relaxed font-medium",
                  isPerfectMatch ? "text-green-200" : isGreatMatch ? "text-violet-200" : "text-zinc-300"
                )}>
                  {concert.matchReasons[0]}
                </p>
                {/* Show vibe tags if available */}
                {(concert as Concert & { vibeTags?: string[] }).vibeTags && 
                 (concert as Concert & { vibeTags?: string[] }).vibeTags!.length > 0 && (
                  <div className="flex gap-1.5 mt-1.5">
                    {(concert as Concert & { vibeTags?: string[] }).vibeTags!.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wide",
                          tag === "Must-see" ? "bg-green-500/20 text-green-300" :
                          tag === "For you" ? "bg-violet-500/20 text-violet-300" :
                          tag === "Fresh pick" ? "bg-blue-500/20 text-blue-300" :
                          "bg-zinc-700/50 text-zinc-400"
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
              <span className="text-sm text-zinc-500">Price TBA</span>
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
