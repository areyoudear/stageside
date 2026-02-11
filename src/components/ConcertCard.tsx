"use client";

import { useState } from "react";
import Image from "next/image";
import { Calendar, MapPin, Heart, ExternalLink, Ticket } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, daysUntil, generateAffiliateLink } from "@/lib/utils";
import type { Concert } from "@/lib/ticketmaster";

interface ConcertCardProps {
  concert: Concert;
  onSave?: (concertId: string) => void;
  onUnsave?: (concertId: string) => void;
  isAuthenticated?: boolean;
  isDemo?: boolean;
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
  const affiliateLink = generateAffiliateLink(concert.ticketUrl);

  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(concert.id);
    } else {
      onSave?.(concert.id);
    }
    setIsSaved(!isSaved);
  };

  return (
    <Card className="group overflow-hidden bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 transition-all duration-300">
      {/* Image Section */}
      <div className="relative aspect-[16/9] overflow-hidden">
        {!imageError ? (
          <Image
            src={concert.imageUrl}
            alt={concert.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center">
            <span className="text-4xl">🎵</span>
          </div>
        )}

        {/* Match Score Badge */}
        {concert.matchScore !== undefined && concert.matchScore > 0 && (
          <div className="absolute top-3 left-3">
            <Badge
              variant={concert.matchScore >= 100 ? "spotify" : "success"}
              className="text-xs font-bold"
            >
              {concert.matchScore >= 100 ? "Perfect Match" : `${concert.matchScore}% Match`}
            </Badge>
          </div>
        )}

        {/* Days Until Badge */}
        {daysLeft <= 7 && daysLeft > 0 && (
          <div className="absolute top-3 right-3">
            <Badge variant="destructive" className="text-xs">
              {daysLeft === 1 ? "Tomorrow!" : `${daysLeft} days`}
            </Badge>
          </div>
        )}

        {/* Save Button */}
        {(isAuthenticated || isDemo) && (
          <button
            onClick={isDemo ? handleSaveToggle : handleSaveToggle}
            className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
            aria-label={isSaved ? "Remove from saved" : "Save concert"}
          >
            <Heart
              className={`w-5 h-5 ${
                isSaved ? "fill-red-500 text-red-500" : "text-white"
              }`}
            />
          </button>
        )}
      </div>

      {/* Content Section */}
      <CardContent className="p-4 space-y-3">
        {/* Artist Name */}
        <div>
          <h3 className="font-bold text-lg text-white line-clamp-1">
            {concert.artists.join(", ")}
          </h3>
          {concert.name !== concert.artists.join(", ") && (
            <p className="text-sm text-zinc-400 line-clamp-1">{concert.name}</p>
          )}
        </div>

        {/* Match Reason */}
        {concert.matchReasons && concert.matchReasons.length > 0 && (
          <p className="text-sm text-green-400 flex items-center gap-1">
            <span className="text-base">✨</span>
            {concert.matchReasons[0]}
          </p>
        )}

        {/* Event Details */}
        <div className="space-y-2 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span>{formatDate(concert.date)}</span>
            {concert.time && (
              <span className="text-zinc-500">
                at {concert.time.slice(0, 5)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="line-clamp-1">
              {concert.venue.name}, {concert.venue.city}
              {concert.venue.state && `, ${concert.venue.state}`}
            </span>
          </div>
        </div>

        {/* Price Range */}
        {concert.priceRange && (
          <div className="flex items-center gap-2 text-sm">
            <Ticket className="w-4 h-4 text-zinc-500" />
            <span className="text-zinc-400">
              ${concert.priceRange.min} - ${concert.priceRange.max}
            </span>
          </div>
        )}

        {/* Genres */}
        {concert.genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {concert.genres.slice(0, 3).map((genre) => (
              <Badge key={genre} variant="outline" className="text-xs text-zinc-400 border-zinc-700">
                {genre}
              </Badge>
            ))}
          </div>
        )}

        {/* Get Tickets Button */}
        {isDemo ? (
          <Button
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 opacity-80"
            onClick={() => alert("Connect Spotify to get real ticket links!")}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Get Tickets (Demo)
          </Button>
        ) : (
          <Button
            asChild
            className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
          >
            <a href={affiliateLink} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Get Tickets
            </a>
          </Button>
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
        <div className="h-6 bg-zinc-800 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-zinc-800 rounded animate-pulse w-1/2" />
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-full" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-2/3" />
        </div>
        <div className="h-10 bg-zinc-800 rounded animate-pulse w-full" />
      </CardContent>
    </Card>
  );
}
