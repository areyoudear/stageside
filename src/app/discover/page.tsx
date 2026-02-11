"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Music, Filter, Sparkles, ArrowRight, MapPin, Users, Zap, Music2, Flame, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationSearch, Location } from "@/components/LocationSearch";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { ArtistPicker } from "@/components/ArtistPicker";
import { cn } from "@/lib/utils";
import type { Concert } from "@/lib/ticketmaster";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

// Vibe filter types
type VibeFilter = "all" | "chill" | "energetic" | "intimate" | "festival";

const VIBE_FILTERS: { value: VibeFilter; label: string; icon: typeof Music2; genres: string[] }[] = [
  { value: "all", label: "All Vibes", icon: Music, genres: [] },
  { value: "chill", label: "Chill", icon: Music2, genres: ["jazz", "acoustic", "classical", "soul", "r&b", "ambient", "folk", "lounge"] },
  { value: "energetic", label: "High Energy", icon: Zap, genres: ["edm", "electronic", "dance", "house", "techno", "dubstep", "trance"] },
  { value: "intimate", label: "Intimate", icon: Users, genres: ["indie", "singer", "songwriter", "acoustic", "folk", "blues"] },
  { value: "festival", label: "Big Shows", icon: Flame, genres: ["rock", "metal", "punk", "hip-hop", "rap", "pop", "alternative"] },
];

export default function DiscoverPage() {
  // State
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(),
    endDate: (() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 3);
      return d;
    })(),
    label: "Next 3 Months",
  });
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>("all");

  const hasEnoughArtists = selectedArtists.length >= 3;
  const canSearch = hasEnoughArtists && location;

  // Filter concerts by vibe
  const filteredConcerts = useMemo(() => {
    if (vibeFilter === "all") return concerts;
    
    const filterConfig = VIBE_FILTERS.find(f => f.value === vibeFilter);
    if (!filterConfig) return concerts;

    return concerts.filter(concert => {
      const concertGenres = concert.genres.join(" ").toLowerCase();
      return filterConfig.genres.some(g => concertGenres.includes(g));
    });
  }, [concerts, vibeFilter]);

  // Fetch concerts matched to user's selected artists
  const fetchConcerts = useCallback(async () => {
    if (!location || selectedArtists.length < 3) return;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        startDate: dateRange.startDate.toISOString().split("T")[0],
        endDate: dateRange.endDate.toISOString().split("T")[0],
        artists: selectedArtists.map((a) => a.name).join(","),
        genres: Array.from(new Set(selectedArtists.flatMap((a) => a.genres))).join(","),
      });

      const response = await fetch(`/api/concerts/matched?${params.toString()}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setConcerts([]);
      } else {
        setConcerts(data.concerts || []);
      }
    } catch (err) {
      console.error("Error fetching concerts:", err);
      setError("Failed to load concerts. Please try again.");
      setConcerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [location, dateRange, selectedArtists]);

  // Save handler (local only for now)
  const handleSaveConcert = async (concertId: string) => {
    setConcerts((prev) =>
      prev.map((c) => (c.id === concertId ? { ...c, isSaved: true } : c))
    );
  };

  const handleUnsaveConcert = async (concertId: string) => {
    setConcerts((prev) =>
      prev.map((c) => (c.id === concertId ? { ...c, isSaved: false } : c))
    );
  };

  const highMatches = filteredConcerts.filter((c) => (c.matchScore || 0) >= 50).length;
  const perfectMatches = filteredConcerts.filter((c) => (c.matchScore || 0) >= 100).length;

  // Extract genres from selected artists for display
  const selectedGenres = Array.from(new Set(selectedArtists.flatMap((a) => a.genres))).slice(0, 6);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>

            <Link href="/">
              <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
                <Sparkles className="w-4 h-4 mr-2" />
                Connect Spotify
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-purple-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Quick Match</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Find concerts you'll love
          </h1>
          <p className="text-zinc-400">
            Pick your favorite artists and we'll find matching concerts near you.
          </p>
        </div>

        {/* Artist Picker Card */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                Your Artists
              </h2>
              <p className="text-sm text-zinc-500">
                Pick at least 3 artists you want to see live
              </p>
            </div>
            {selectedArtists.length >= 3 && (
              <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                ✓ Ready
              </span>
            )}
          </div>

          <ArtistPicker
            selectedArtists={selectedArtists}
            onArtistsChange={setSelectedArtists}
            minArtists={3}
            maxArtists={10}
          />

          {/* Show inferred genres */}
          {selectedGenres.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500 mb-2">Genres we'll match:</p>
              <div className="flex flex-wrap gap-2">
                {selectedGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs border border-purple-500/20"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location & Date Controls */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location
              </label>
              <LocationSearch value={location} onChange={setLocation} />
            </div>

            {/* Date Range */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Date Range
              </label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

            {/* Search Button */}
            <div className="flex items-end">
              <Button
                onClick={fetchConcerts}
                disabled={!canSearch || isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Filter className="w-4 h-4 mr-2" />
                    Find Concerts
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Helper text */}
          {!canSearch && (
            <p className="mt-4 text-sm text-zinc-500">
              {!hasEnoughArtists && "Pick at least 3 artists above. "}
              {!location && "Then choose a location."}
            </p>
          )}
        </div>

        {/* Results Section */}
        {!hasSearched ? (
          // Empty State
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <Music className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Ready when you are
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Pick your favorite artists and location above, then hit "Find Concerts" to see personalized matches.
            </p>
          </div>
        ) : isLoading ? (
          // Loading State
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ConcertCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">😕</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Couldn't load concerts
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-4">{error}</p>
            <Button onClick={fetchConcerts} variant="outline" className="border-zinc-700">
              Try Again
            </Button>
          </div>
        ) : concerts.length === 0 ? (
          // No Results
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎵</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No concerts found
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Try expanding your date range, search area, or add more artists.
            </p>
          </div>
        ) : (
          <>
            {/* Results Header with Stats and Filters */}
            <div className="space-y-4 mb-6">
              {/* Stats Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {perfectMatches > 0 ? (
                      <>
                        <span className="text-green-400">⭐ {perfectMatches} perfect</span>
                        {highMatches - perfectMatches > 0 && (
                          <span className="text-zinc-400"> + {highMatches - perfectMatches} great</span>
                        )}
                        <span className="text-zinc-400"> matches</span>
                      </>
                    ) : highMatches > 0 ? (
                      <>
                        <span className="text-green-400">{highMatches}</span>
                        <span className="text-zinc-400"> great matches found</span>
                      </>
                    ) : (
                      <span className="text-zinc-300">{filteredConcerts.length} concerts found</span>
                    )}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    In {location?.name} • {dateRange.label || "Custom dates"}
                    {vibeFilter !== "all" && (
                      <span className="text-purple-400"> • {VIBE_FILTERS.find(f => f.value === vibeFilter)?.label} filter</span>
                    )}
                  </p>
                </div>

                {/* Quick stats */}
                {concerts.length > 0 && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300">
                      {concerts.length} total
                    </span>
                    {vibeFilter !== "all" && filteredConcerts.length !== concerts.length && (
                      <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300">
                        {filteredConcerts.length} shown
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Vibe Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500 mr-1">Filter by vibe:</span>
                {VIBE_FILTERS.map((filter) => {
                  const Icon = filter.icon;
                  const isActive = vibeFilter === filter.value;
                  const count = filter.value === "all" 
                    ? concerts.length 
                    : concerts.filter(c => {
                        const genres = c.genres.join(" ").toLowerCase();
                        return filter.genres.some(g => genres.includes(g));
                      }).length;
                  
                  return (
                    <button
                      key={filter.value}
                      onClick={() => setVibeFilter(filter.value)}
                      disabled={count === 0 && filter.value !== "all"}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                        isActive
                          ? "bg-purple-500 text-white"
                          : count === 0
                          ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {filter.label}
                      {filter.value !== "all" && (
                        <span className={cn(
                          "ml-1 text-xs",
                          isActive ? "text-purple-200" : "text-zinc-500"
                        )}>
                          ({count})
                        </span>
                      )}
                    </button>
                  );
                })}
                {vibeFilter !== "all" && (
                  <button
                    onClick={() => setVibeFilter("all")}
                    className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                    title="Clear filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Concert Grid */}
            {filteredConcerts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-400">No {VIBE_FILTERS.find(f => f.value === vibeFilter)?.label.toLowerCase()} concerts found.</p>
                <button
                  onClick={() => setVibeFilter("all")}
                  className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
                >
                  Show all concerts instead
                </button>
              </div>
            ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 stagger-children">
              {filteredConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onSave={handleSaveConcert}
                  onUnsave={handleUnsaveConcert}
                  isAuthenticated={false}
                />
              ))}
            </div>
            )}

            {/* CTA at bottom */}
            <div className="mt-16 py-12 px-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/20">
              <div className="max-w-xl mx-auto text-center">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Want even better matches?
                </h3>
                <p className="text-zinc-400 mb-6">
                  Connect Spotify to automatically match concerts to your{" "}
                  <span className="text-white">entire listening history</span> — not just a few artists.
                </p>
                <Link href="/">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600"
                  >
                    Connect Spotify
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
