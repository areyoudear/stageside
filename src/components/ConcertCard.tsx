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
  UserPlus,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, daysUntil, cn } from "@/lib/utils";
import { TicketSourcesDropdown, TicketSourcesInline } from "@/components/TicketSourcesDropdown";
import { AudioPreview } from "@/components/AudioPreview";
import { track } from "@/lib/analytics";
import type { Concert } from "@/lib/ticketmaster";
import type { DeduplicatedConcert, TicketSource } from "@/lib/concert-dedup";
import { 
  generateVibeTags, 
  getVibeDescription, 
  type VibeResult, 
  type ArtistAudioProfile 
} from "@/lib/vibe-tags";

// Vibe types based on genre (legacy, kept for backward compatibility)
type VibeType = "chill" | "energetic" | "intimate" | "festival" | "diverse";

interface FriendInterest {
  id: string;
  name: string;
  status: "interested" | "going";
  tasteCompatibility?: number;
  tasteLabel?: string;
  sharedArtists?: string[];
  imageUrl?: string | null;
}

// Extended concert type that may include deduplication data
type ConcertWithSources = Concert & {
  sources?: TicketSource[];
  artistAudioProfile?: ArtistAudioProfile | null;
  vibeResult?: VibeResult;
};

interface ConcertCardProps {
  concert: Concert | ConcertWithSources;
  onSave?: (concertId: string) => void;
  onUnsave?: (concertId: string) => void;
  onGoing?: (concertId: string) => void;
  onNotGoing?: (concertId: string) => void;
  interestStatus?: "interested" | "going" | null;
  onInterestChange?: (concertId: string, status: "interested" | "going" | null, concert: Concert) => void;
  friendsInterested?: FriendInterest[];
  isAuthenticated?: boolean;
  isDemo?: boolean;
  hasProfile?: boolean;
  // Optional audio profile for enhanced vibe tags
  artistAudioProfile?: ArtistAudioProfile | null;
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
      color: "text-blue-400",
      bgGradient: "from-blue-500/20 via-blue-500/10 to-transparent",
      borderColor: "border-blue-500/30 hover:border-blue-500/60"
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
    color: "text-cyan-400",
    bgGradient: "from-cyan-500/20 via-cyan-500/10 to-transparent",
    borderColor: "border-cyan-500/30 hover:border-cyan-500/60"
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

/**
 * Get contextual urgency message based on concert and user context
 * Replaces generic "Tickets selling fast!" with personalized messages
 */
interface ContextualUrgencyContext {
  venueSize?: string;
  matchScore?: number;
  matchReasons?: string[];
  genres?: string[];
  isLastShow?: boolean;
  friendsGoing?: number;
  savedSimilarCount?: number;
}

function getContextualUrgency(
  daysLeft: number,
  context: ContextualUrgencyContext
): string | null {
  const { venueSize, matchScore, genres, isLastShow, friendsGoing, savedSimilarCount } = context;
  
  // Priority 1: Last show urgency
  if (isLastShow) {
    return "Last show of their tour — no second chances";
  }
  
  // Priority 2: Friends going
  if (friendsGoing && friendsGoing >= 2) {
    return `${friendsGoing} friends going — don't miss out!`;
  }
  
  // Priority 3: High match + small venue
  if (matchScore && matchScore >= 80 && venueSize === "intimate") {
    return "This venue typically sells out for artists matching your taste";
  }
  
  // Priority 4: Saved similar artists
  if (savedSimilarCount && savedSimilarCount >= 2) {
    return `You've saved ${savedSimilarCount} similar artists. This one is actually touring.`;
  }
  
  // Priority 5: Genre rarity (if we could track this)
  if (genres && genres.length > 0) {
    const rareGenres = ["jazz", "classical", "bluegrass", "folk", "metal"];
    const hasRareGenre = genres.some(g => 
      rareGenres.some(r => g.toLowerCase().includes(r))
    );
    if (hasRareGenre) {
      const matchedGenre = genres.find(g => 
        rareGenres.some(r => g.toLowerCase().includes(r))
      );
      return `${matchedGenre} shows are rare in your area`;
    }
  }
  
  // Priority 6: Time-based urgency for good matches
  if (daysLeft <= 7 && matchScore && matchScore >= 70) {
    return "High match, happening soon";
  }
  
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
  
  // No profile - show CTA to connect music service
  if (!hasProfile) {
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
  onGoing,
  onNotGoing,
  isAuthenticated = false,
  isDemo = false,
  hasProfile = true,
  interestStatus,
  onInterestChange,
  friendsInterested = [],
  artistAudioProfile,
}: ConcertCardProps) {
  const [isSaved, setIsSaved] = useState(concert.isSaved || false);
  const [isGoing, setIsGoing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const [showGoingFeedback, setShowGoingFeedback] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [localInterestStatus, setLocalInterestStatus] = useState<"interested" | "going" | null>(interestStatus || null);
  const hoverStartTime = useRef<number | null>(null);
  const hasTrackedTooltip = useRef(false);
  
  // Separate friends by status
  const friendsGoing = friendsInterested.filter(f => f.status === "going");
  const friendsInterestedOnly = friendsInterested.filter(f => f.status === "interested");
  
  const handleInterestClick = (status: "interested" | "going") => {
    const newStatus = localInterestStatus === status ? null : status;
    setLocalInterestStatus(newStatus);
    onInterestChange?.(concert.id, newStatus, concert);
    track("concert_interest_changed", {
      concert_id: concert.id,
      artist: concert.artists.join(", "),
      new_status: newStatus || "removed",
    });
  };

  // Load saved/going state from localStorage on mount
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    if (saved.includes(concert.id)) {
      setIsSaved(true);
    }
    const going = JSON.parse(localStorage.getItem('goingConcerts') || '[]');
    if (going.includes(concert.id)) {
      setIsGoing(true);
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
  
  // Enhanced vibe tags from audio features (when available)
  const concertExt = concert as ConcertWithSources;
  const audioProfile = artistAudioProfile || concertExt.artistAudioProfile || null;
  const enhancedVibeResult = useMemo(() => {
    // Use pre-computed vibe if available on the concert
    if (concertExt.vibeResult) {
      return concertExt.vibeResult;
    }
    // Otherwise compute from audio profile and genres
    return generateVibeTags(audioProfile, concert.genres, undefined);
  }, [audioProfile, concert.genres, concertExt.vibeResult]);
  
  // Check if concert has multiple ticket sources
  const ticketSources: TicketSource[] = concertExt.sources || [];

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

  const handleGoingToggle = () => {
    const artistName = concert.artists.join(", ");
    if (isGoing) {
      track('concert_not_going', {
        concert_id: concert.id,
        artist: artistName,
      });
      onNotGoing?.(concert.id);
      setIsGoing(false);
      // Remove from localStorage
      const going = JSON.parse(localStorage.getItem('goingConcerts') || '[]');
      localStorage.setItem('goingConcerts', JSON.stringify(going.filter((id: string) => id !== concert.id)));
    } else {
      track('concert_going', {
        concert_id: concert.id,
        artist: artistName,
        match_score: concert.matchScore,
      });
      onGoing?.(concert.id);
      setIsGoing(true);
      setShowGoingFeedback(true);
      setTimeout(() => setShowGoingFeedback(false), 2000);
      // Save to localStorage
      const going = JSON.parse(localStorage.getItem('goingConcerts') || '[]');
      if (!going.includes(concert.id)) {
        going.push(concert.id);
        localStorage.setItem('goingConcerts', JSON.stringify(going));
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
          {/* Save Button - min 44px touch target */}
          <button
            onClick={handleSaveToggle}
            className={cn(
              "relative p-3 rounded-full backdrop-blur-md transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center",
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
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-green-500 text-white text-sm font-medium rounded-md whitespace-nowrap animate-fade-in">
                <Check className="w-3 h-3 inline mr-1" />
                Saved!
              </div>
            )}
          </button>

          {/* Going Button - min 44px touch target */}
          <button
            onClick={handleGoingToggle}
            className={cn(
              "relative p-3 rounded-full backdrop-blur-md transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center",
              isGoing 
                ? "bg-green-500/20 hover:bg-green-500/30" 
                : "bg-black/30 hover:bg-black/50"
            )}
            aria-label={isGoing ? "Not going anymore" : "Mark as going"}
            title={isGoing ? "Not going anymore" : "I'm going!"}
          >
            <CheckCircle2
              className={cn(
                "w-5 h-5 transition-all",
                isGoing ? "text-green-400 scale-110" : "text-white/80 hover:text-white"
              )}
            />
            {/* Going feedback toast */}
            {showGoingFeedback && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-green-500 text-white text-sm font-medium rounded-md whitespace-nowrap animate-fade-in">
                <Check className="w-3 h-3 inline mr-1" />
                Going!
              </div>
            )}
          </button>

          {/* Share Button - min 44px touch target */}
          <button
            onClick={handleShare}
            className="p-3 rounded-full backdrop-blur-md bg-black/30 hover:bg-black/50 transition-all duration-300 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Share concert"
          >
            <Share2 className="w-5 h-5 text-white/80 hover:text-white transition-colors" />
          </button>
        </div>

        {/* Enhanced Vibe Tags */}
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[60%]">
          {/* Primary vibe tag with emoji */}
          <div 
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-md cursor-help",
              enhancedVibeResult.bgColor,
              "border",
              enhancedVibeResult.borderColor,
              enhancedVibeResult.color
            )}
            title={getVibeDescription(enhancedVibeResult.primary)}
          >
            <span>{enhancedVibeResult.emoji}</span>
            <span className="truncate max-w-[120px]">{enhancedVibeResult.primary}</span>
          </div>
          
          {/* Secondary vibe tag (if available) */}
          {enhancedVibeResult.secondary && (
            <div 
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium backdrop-blur-md bg-black/30 text-zinc-300 border border-white/10"
              title={getVibeDescription(enhancedVibeResult.secondary)}
            >
              <span className="truncate max-w-[80px]">{enhancedVibeResult.secondary}</span>
            </div>
          )}
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
            <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="text-zinc-300 line-clamp-1">
              {concert.venue.name}
              {concert.distance !== undefined && (
                <span className="text-zinc-500 ml-1">· {concert.distance} mi</span>
              )}
            </span>
          </div>
          {/* Venue size indicator */}
          {concert.venueSize && concert.venueSize !== "medium" && (
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <span className={cn(
                "px-1.5 py-0.5 rounded",
                concert.venueSize === "intimate" && "bg-blue-500/10 text-blue-400",
                concert.venueSize === "large" && "bg-cyan-500/10 text-cyan-400",
                concert.venueSize === "arena" && "bg-orange-500/10 text-orange-400",
                concert.venueSize === "festival" && "bg-pink-500/10 text-pink-400"
              )}>
                {concert.venueSize === "intimate" && "🎤 Intimate"}
                {concert.venueSize === "large" && "🎭 Large Venue"}
                {concert.venueSize === "arena" && "🏟️ Arena"}
                {concert.venueSize === "festival" && "🎪 Festival"}
              </span>
            </div>
          )}
        </div>

        {/* Why You'll Love This - Always visible for good matches */}
        {concert.matchReasons && concert.matchReasons.length > 0 && 
         concert.matchReasons[0] !== "Happening near you" && (
          <div className={cn(
            "p-2.5 rounded-lg overflow-hidden",
            isPerfectMatch 
              ? "bg-green-500/10 border border-green-500/20" 
              : isGreatMatch
              ? "bg-blue-500/10 border border-blue-500/20"
              : "bg-zinc-800/50 border border-zinc-700/30"
          )}>
            <div className="flex items-start gap-2">
              {isPerfectMatch ? (
                <Star className="w-3.5 h-3.5 text-green-400 mt-0.5 flex-shrink-0" />
              ) : isGreatMatch ? (
                <Sparkles className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Music2 className="w-3.5 h-3.5 text-zinc-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs leading-relaxed font-medium",
                  isPerfectMatch ? "text-green-200" : isGreatMatch ? "text-blue-200" : "text-zinc-300"
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
                          tag === "For you" ? "bg-blue-500/20 text-blue-300" :
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

        {/* Audio Preview - Sample the artist's music */}
        {concert.previewUrl && concert.topTrackName && (
          <AudioPreview
            previewUrl={concert.previewUrl}
            trackName={concert.topTrackName}
            artistName={concert.artists[0]}
            highlightStartMs={concert.highlightStartMs}
          />
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

        {/* Friends Interested Section - Enhanced with taste compatibility */}
        {friendsInterested.length > 0 && (
          <div className="space-y-2 py-2 px-3 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-300">
                👥 {friendsInterested.length} friend{friendsInterested.length > 1 ? "s" : ""} interested
              </span>
            </div>
            
            {/* Show top friend with highest taste compatibility */}
            {(() => {
              const topFriend = [...friendsGoing, ...friendsInterestedOnly]
                .sort((a, b) => (b.tasteCompatibility || 0) - (a.tasteCompatibility || 0))[0];
              
              if (topFriend && topFriend.tasteCompatibility && topFriend.tasteCompatibility > 0) {
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                      {topFriend.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium text-white truncate">{topFriend.name}</span>
                        <span className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-semibold",
                          topFriend.tasteCompatibility >= 70 
                            ? "bg-green-500/20 text-green-400" 
                            : "bg-blue-500/20 text-blue-400"
                        )}>
                          {topFriend.tasteCompatibility}% match
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {topFriend.status === "going" ? "is going" : "interested"}
                        </span>
                      </div>
                      {topFriend.sharedArtists && topFriend.sharedArtists.length > 0 && (
                        <p className="text-[10px] text-zinc-500 truncate">
                          Both love {topFriend.sharedArtists.slice(0, 2).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Simple list for others */}
            {friendsInterested.length > 1 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {[...friendsGoing, ...friendsInterestedOnly]
                  .sort((a, b) => (b.tasteCompatibility || 0) - (a.tasteCompatibility || 0))
                  .slice(1, 4)
                  .map(friend => (
                    <span 
                      key={friend.id}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-400"
                    >
                      {friend.name} {friend.status === "going" ? "✓" : ""}
                    </span>
                  ))}
                {friendsInterested.length > 4 && (
                  <span className="text-[10px] text-zinc-500">
                    +{friendsInterested.length - 4} more
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Interest Buttons (Interested / Going) - min 44px height for touch */}
        {isAuthenticated && onInterestChange && (
          <div className="flex gap-2">
            <button
              onClick={() => handleInterestClick("interested")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-lg text-sm font-medium transition-all min-h-[44px]",
                localInterestStatus === "interested"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <Star className={cn("w-4 h-4", localInterestStatus === "interested" && "fill-amber-400")} />
              Interested
            </button>
            <button
              onClick={() => handleInterestClick("going")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-lg text-sm font-medium transition-all min-h-[44px]",
                localInterestStatus === "going"
                  ? "bg-green-500/20 text-green-400 border border-green-500/40"
                  : "bg-zinc-800/50 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <CheckCircle2 className={cn("w-4 h-4", localInterestStatus === "going" && "fill-green-400")} />
              Going
            </button>
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
        
        {/* Multiple Ticket Sources (from deduplication) */}
        {ticketSources.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs text-zinc-500 w-full">Compare prices:</span>
            {ticketSources.map((source, idx) => (
              <a 
                key={`${source.source}-${idx}`}
                href={source.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('ticket_source_clicked', {
                  concert_id: concert.id,
                  source: source.source,
                  price: source.price?.min,
                })}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                  "bg-zinc-800/70 hover:bg-zinc-700 border border-zinc-700/50 hover:border-zinc-600",
                  source.source === "ticketmaster" && "hover:border-blue-500/50",
                  source.source === "seatgeek" && "hover:border-green-500/50",
                  source.source === "bandsintown" && "hover:border-pink-500/50"
                )}
              >
                <span className={cn(
                  "capitalize",
                  source.source === "ticketmaster" && "text-blue-400",
                  source.source === "seatgeek" && "text-green-400",
                  source.source === "bandsintown" && "text-pink-400"
                )}>
                  {source.source}
                </span>
                {source.price && (
                  <span className="text-zinc-300">
                    ${source.price.min}
                  </span>
                )}
                <ExternalLink className="w-3 h-3 text-zinc-500" />
              </a>
            ))}
          </div>
        )}

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
