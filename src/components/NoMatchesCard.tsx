"use client";

import { useState } from "react";
import { MapPin, Calendar, ArrowRight, Sparkles, Music } from "lucide-react";
import type { Concert } from "@/lib/ticketmaster";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

interface NoMatchesCardProps {
  selectedArtists: Artist[];
  location: { name: string; lat: number; lng: number } | null;
  dateRange: { startDate: Date; endDate: Date; label?: string };
  popularConcerts?: Concert[];
  isLoadingPopular?: boolean;
  onConcertSave?: (concertId: string) => void;
  onConcertUnsave?: (concertId: string) => void;
}

export function NoMatchesCard({
  selectedArtists,
  location,
  dateRange,
  popularConcerts = [],
  isLoadingPopular = false,
  onConcertSave,
  onConcertUnsave,
}: NoMatchesCardProps) {
  return (
    <div className="space-y-8">
      {/* No Matches Message */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-zinc-900 to-zinc-900 border border-zinc-800 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Music className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No matches found</h3>
          <p className="text-zinc-400 max-w-md mx-auto">
            We couldn&apos;t find concerts for{" "}
            {selectedArtists.length > 0 ? (
              <span className="text-blue-400">
                {selectedArtists.slice(0, 3).map((a) => a.name).join(", ")}
                {selectedArtists.length > 3 && ` and ${selectedArtists.length - 3} more`}
              </span>
            ) : (
              "your selected artists"
            )}{" "}
            {location ? `near ${location.name}` : ""} during this time period.
          </p>
          <p className="text-zinc-500 text-sm mt-4">
            Try expanding your search radius or date range, or check back later for new announcements.
          </p>
        </div>
      </div>

      {/* Popular Concerts Section */}
      {(popularConcerts.length > 0 || isLoadingPopular) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">
              Popular concerts in {location?.name || "your area"}
            </h3>
          </div>
          <p className="text-zinc-500 text-sm mb-6">
            While we couldn&apos;t find your specific artists, check out these trending shows nearby:
          </p>

          {isLoadingPopular ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 animate-pulse">
                  <div className="w-full h-32 bg-zinc-800 rounded-lg mb-3" />
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularConcerts.slice(0, 6).map((concert) => (
                <PopularConcertCard
                  key={concert.id}
                  concert={concert}
                  onSave={onConcertSave}
                  onUnsave={onConcertUnsave}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PopularConcertCard({
  concert,
  onSave,
  onUnsave,
}: {
  concert: Concert;
  onSave?: (id: string) => void;
  onUnsave?: (id: string) => void;
}) {
  const [isSaved, setIsSaved] = useState(concert.isSaved || false);

  const handleSaveToggle = () => {
    if (isSaved) {
      onUnsave?.(concert.id);
      setIsSaved(false);
    } else {
      onSave?.(concert.id);
      setIsSaved(true);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <a
      href={concert.ticketUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-500/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-amber-500/5"
    >
      <div className="relative h-32 overflow-hidden">
        <img
          src={concert.imageUrl}
          alt={concert.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
        
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(concert.date)}
        </div>

        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-xs text-amber-400 font-medium">
          Trending
        </div>
      </div>

      <div className="p-4">
        <h4 className="font-medium text-white truncate group-hover:text-amber-400 transition-colors">
          {concert.artists[0] || concert.name}
        </h4>
        <p className="text-sm text-zinc-500 truncate flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3" />
          {concert.venue.name}
        </p>
        
        {concert.priceRange && (
          <p className="text-sm text-zinc-400 mt-2">
            From ${concert.priceRange.min}
          </p>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
          <span className="text-xs text-zinc-500 flex items-center gap-1 group-hover:text-amber-400 transition-colors">
            Get tickets <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </a>
  );
}
