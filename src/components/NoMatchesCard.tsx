"use client";

import { useState, useRef } from "react";
import { Mail, Bell, Loader2, Check, Music, MapPin, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { track } from "@/lib/analytics";
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
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const hasFocused = useRef(false);

  const handleFocus = () => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      track("email_signup_started", { location: "no_matches" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          location: location ? { lat: location.lat, lng: location.lng, city: location.name } : null,
          preferences: {
            artists: selectedArtists.map((a) => a.name),
            genres: Array.from(new Set(selectedArtists.flatMap((a) => a.genres))),
            dateRange: {
              start: dateRange.startDate.toISOString(),
              end: dateRange.endDate.toISOString(),
            },
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        track("email_signup_completed", {
          location: "no_matches",
          has_location: !!location,
          artist_count: selectedArtists.length,
        });
        hasFocused.current = false;
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Email Signup Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 via-zinc-900 to-zinc-900 border border-cyan-500/20 p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        
        <div className="relative">
          {status === "success" ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">You&apos;re on the list!</h3>
              <p className="text-zinc-400">
                We&apos;ll notify you when{" "}
                {selectedArtists.length > 0 ? (
                  <span className="text-purple-400">
                    {selectedArtists.slice(0, 3).map((a) => a.name).join(", ")}
                    {selectedArtists.length > 3 && ` and ${selectedArtists.length - 3} more`}
                  </span>
                ) : (
                  "your favorite artists"
                )}{" "}
                announce shows{location ? ` near ${location.name}` : ""}.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">No matches yet</h3>
                  <p className="text-zinc-400 text-sm">Get notified when concerts are announced!</p>
                </div>
              </div>

              {/* Selected preferences summary */}
              <div className="flex flex-wrap gap-2 mb-6">
                {selectedArtists.slice(0, 4).map((artist) => (
                  <span
                    key={artist.id}
                    className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-300 text-xs border border-zinc-700"
                  >
                    {artist.name}
                  </span>
                ))}
                {selectedArtists.length > 4 && (
                  <span className="px-2 py-1 rounded-full bg-zinc-800 text-zinc-500 text-xs">
                    +{selectedArtists.length - 4} more
                  </span>
                )}
                {location && (
                  <span className="px-2 py-1 rounded-full bg-zinc-800 text-green-400 text-xs border border-zinc-700 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {location.name}
                  </span>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={handleFocus}
                      placeholder="Enter your email"
                      className="pl-10 bg-zinc-900 border-zinc-700 text-white placeholder:text-zinc-500"
                      disabled={status === "loading"}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={status === "loading" || !email}
                    className="bg-cyan-600 hover:bg-purple-500 text-white font-medium"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subscribing...
                      </>
                    ) : (
                      <>
                        <Bell className="w-4 h-4 mr-2" />
                        Notify Me
                      </>
                    )}
                  </Button>
                </div>
                {status === "error" && <p className="text-sm text-red-400">{errorMessage}</p>}
                <p className="text-xs text-zinc-600">
                  We&apos;ll email you when any of your selected artists announce shows nearby. Unsubscribe anytime.
                </p>
              </form>
            </>
          )}
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

// Simplified concert card for popular concerts section
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
      {/* Image */}
      <div className="relative h-32 overflow-hidden">
        <img
          src={concert.imageUrl}
          alt={concert.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
        
        {/* Date badge */}
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(concert.date)}
        </div>

        {/* Popular badge */}
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-amber-500/20 border border-amber-500/30 text-xs text-amber-400 font-medium">
          Trending
        </div>
      </div>

      {/* Content */}
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
