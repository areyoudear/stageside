"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Music, Filter, Sparkles, ArrowRight, MapPin, Users, Zap, Music2, Flame, X, ArrowUpDown, Calendar, DollarSign, Bookmark, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationSearch, Location } from "@/components/LocationSearch";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { ArtistPicker, TrendingArtistChips } from "@/components/ArtistPicker";
import { SpotifyUpsellCard } from "@/components/SpotifyUpsellCard";
import { NoMatchesCard } from "@/components/NoMatchesCard";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Concert } from "@/lib/ticketmaster";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

// Vibe filter types
type VibeFilter = "all" | "chill" | "energetic" | "intimate" | "festival";

// Venue size filter
type VenueSizeFilter = "all" | "intimate" | "medium" | "large" | "arena";

// Distance filter (in miles)
type DistanceFilter = "all" | "5" | "10" | "25" | "50";

// Price filter
type PriceFilter = "all" | "free" | "under50" | "50to100" | "over100";

// Day filter
type DayFilter = "all" | "weekday" | "weekend";

// Sort options
type SortOption = "match" | "date" | "price" | "distance";

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof ArrowUpDown }[] = [
  { value: "match", label: "Best Match", icon: Sparkles },
  { value: "date", label: "Date", icon: Calendar },
  { value: "price", label: "Price", icon: DollarSign },
  { value: "distance", label: "Nearest", icon: MapPin },
];

const VENUE_SIZE_FILTERS: { value: VenueSizeFilter; label: string; description: string }[] = [
  { value: "all", label: "All Sizes", description: "" },
  { value: "intimate", label: "Intimate", description: "Clubs & bars (<1k)" },
  { value: "medium", label: "Medium", description: "Ballrooms (1-5k)" },
  { value: "large", label: "Large", description: "Theaters (5-15k)" },
  { value: "arena", label: "Arena", description: "Arenas (15k+)" },
];

const DISTANCE_FILTERS: { value: DistanceFilter; label: string }[] = [
  { value: "all", label: "Any Distance" },
  { value: "5", label: "< 5 mi" },
  { value: "10", label: "< 10 mi" },
  { value: "25", label: "< 25 mi" },
  { value: "50", label: "< 50 mi" },
];

const PRICE_FILTERS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "Any Price" },
  { value: "free", label: "Free" },
  { value: "under50", label: "Under $50" },
  { value: "50to100", label: "$50 - $100" },
  { value: "over100", label: "$100+" },
];

const DAY_FILTERS: { value: DayFilter; label: string }[] = [
  { value: "all", label: "Any Day" },
  { value: "weekend", label: "Weekends" },
  { value: "weekday", label: "Weekdays" },
];

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
  const [radius, setRadius] = useState(50); // Default 50 miles
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
  const [popularConcerts, setPopularConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>("all");
  const [venueSizeFilter, setVenueSizeFilter] = useState<VenueSizeFilter>("all");
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [dayFilter, setDayFilter] = useState<DayFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("match");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const hasEnoughArtists = selectedArtists.length >= 3;
  const canSearch = hasEnoughArtists && location;

  // Track location changes
  const handleLocationChange = (newLocation: Location | null) => {
    if (newLocation) {
      track('location_set', { 
        city: newLocation.name, 
        method: 'search' 
      });
    }
    setLocation(newLocation);
  };

  // Track date range changes
  const handleDateRangeChange = (newRange: DateRange) => {
    track('date_range_selected', {
      range: newRange.label || 'custom',
      start_date: newRange.startDate.toISOString().split('T')[0],
      end_date: newRange.endDate.toISOString().split('T')[0],
    });
    setDateRange(newRange);
  };

  // Track vibe filter changes
  const handleVibeFilterChange = (newFilter: VibeFilter) => {
    const count = newFilter === "all" 
      ? concerts.length 
      : concerts.filter(c => {
          const filterConfig = VIBE_FILTERS.find(f => f.value === newFilter);
          if (!filterConfig) return false;
          const genres = c.genres.join(" ").toLowerCase();
          return filterConfig.genres.some(g => genres.includes(g));
        }).length;
    
    track('filter_used', {
      filter: newFilter === 'all' ? 'all' : newFilter === 'energetic' ? 'high_energy' : newFilter === 'festival' ? 'big_shows' : newFilter,
      result_count: count,
    });
    setVibeFilter(newFilter);
  };

  // Track sort changes
  const handleSortChange = (newSort: SortOption) => {
    track('sort_changed', {
      sort: newSort === 'match' ? 'best_match' : newSort,
    });
    setSortBy(newSort);
  };

  // Helper to get day type from date
  const getDayType = (dateStr: string): "weekday" | "weekend" => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 5 || day === 6 ? "weekend" : "weekday";
  };

  // Count active filters
  const activeFilterCount = [
    vibeFilter !== "all",
    venueSizeFilter !== "all",
    distanceFilter !== "all",
    priceFilter !== "all",
    dayFilter !== "all",
  ].filter(Boolean).length;

  // Filter and sort concerts
  const filteredAndSortedConcerts = useMemo(() => {
    let result = concerts;
    
    // Apply vibe filter
    if (vibeFilter !== "all") {
      const filterConfig = VIBE_FILTERS.find(f => f.value === vibeFilter);
      if (filterConfig) {
        result = result.filter(concert => {
          const concertGenres = concert.genres.join(" ").toLowerCase();
          return filterConfig.genres.some(g => concertGenres.includes(g));
        });
      }
    }

    // Apply venue size filter
    if (venueSizeFilter !== "all") {
      result = result.filter(concert => concert.venueSize === venueSizeFilter);
    }

    // Apply distance filter
    if (distanceFilter !== "all") {
      const maxDistance = parseInt(distanceFilter);
      result = result.filter(concert => 
        concert.distance !== undefined && concert.distance <= maxDistance
      );
    }

    // Apply price filter
    if (priceFilter !== "all") {
      result = result.filter(concert => {
        const minPrice = concert.priceRange?.min;
        if (minPrice === undefined) return priceFilter === "all"; // Keep if no price data and filter is "all"
        
        switch (priceFilter) {
          case "free":
            return minPrice === 0;
          case "under50":
            return minPrice < 50;
          case "50to100":
            return minPrice >= 50 && minPrice <= 100;
          case "over100":
            return minPrice > 100;
          default:
            return true;
        }
      });
    }

    // Apply day filter
    if (dayFilter !== "all") {
      result = result.filter(concert => getDayType(concert.date) === dayFilter);
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "match":
          return (b.matchScore || 0) - (a.matchScore || 0);
        case "date":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "price": {
          const priceA = a.priceRange?.min ?? Infinity;
          const priceB = b.priceRange?.min ?? Infinity;
          return priceA - priceB;
        }
        case "distance": {
          const distA = a.distance ?? Infinity;
          const distB = b.distance ?? Infinity;
          return distA - distB;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [concerts, vibeFilter, venueSizeFilter, distanceFilter, priceFilter, dayFilter, sortBy]);

  // Check if we should show the upsell (any low matches in results)
  const hasLowMatches = useMemo(() => {
    return concerts.some(c => (c.matchScore || 0) < 40);
  }, [concerts]);

  // Fetch popular concerts in the area (for no-match scenario)
  const fetchPopularConcerts = useCallback(async () => {
    if (!location) return;

    setIsLoadingPopular(true);
    try {
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: radius.toString(),
        startDate: dateRange.startDate.toISOString().split("T")[0],
        endDate: dateRange.endDate.toISOString().split("T")[0],
      });

      const response = await fetch(`/api/demo-concerts?${params.toString()}`);
      const data = await response.json();

      if (data.concerts) {
        // Get top concerts by match score or just first 8
        const topConcerts = data.concerts
          .filter((c: Concert) => (c.matchScore || 0) >= 30)
          .slice(0, 8);
        setPopularConcerts(topConcerts);
      }
    } catch (err) {
      console.error("Error fetching popular concerts:", err);
    } finally {
      setIsLoadingPopular(false);
    }
  }, [location, radius, dateRange]);

  // Fetch concerts matched to user's selected artists
  const fetchConcerts = useCallback(async () => {
    if (!location || selectedArtists.length < 3) return;

    // Track search initiated
    track('find_concerts_clicked', {
      artist_count: selectedArtists.length,
      location: location.name,
      date_range: dateRange.label || 'custom',
      radius,
    });

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setPopularConcerts([]); // Clear previous popular concerts

    const startTime = Date.now();

    try {
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: radius.toString(),
        startDate: dateRange.startDate.toISOString().split("T")[0],
        endDate: dateRange.endDate.toISOString().split("T")[0],
        artists: selectedArtists.map((a) => a.name).join(","),
        genres: Array.from(new Set(selectedArtists.flatMap((a) => a.genres))).join(","),
      });

      const response = await fetch(`/api/concerts/matched?${params.toString()}`);
      const data = await response.json();

      // Track API call
      track('api_call', {
        api: 'ticketmaster',
        response_time_ms: Date.now() - startTime,
        success: !data.error,
        error: data.error,
      });

      if (data.error) {
        setError(data.error);
        setConcerts([]);
        // Fetch popular concerts as fallback
        fetchPopularConcerts();
      } else {
        const loadedConcerts = data.concerts || [];
        setConcerts(loadedConcerts);
        
        // Track results loaded
        const perfectMatches = loadedConcerts.filter((c: Concert) => (c.matchScore || 0) >= 95).length;
        const highMatches = loadedConcerts.filter((c: Concert) => (c.matchScore || 0) >= 75).length;
        
        track('results_loaded', {
          count: loadedConcerts.length,
          perfect_matches: perfectMatches,
          high_matches: highMatches,
          location: location.name,
          radius,
        });

        // If no matches found, fetch popular concerts
        if (loadedConcerts.length === 0) {
          fetchPopularConcerts();
        }
      }
    } catch (err) {
      console.error("Error fetching concerts:", err);
      track('api_call', {
        api: 'ticketmaster',
        response_time_ms: Date.now() - startTime,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      setError("Failed to load concerts. Please try again.");
      setConcerts([]);
      // Fetch popular concerts as fallback
      fetchPopularConcerts();
    } finally {
      setIsLoading(false);
    }
  }, [location, dateRange, selectedArtists, radius, fetchPopularConcerts]);

  // Save handler (local only for now)
  const handleSaveConcert = async (concertId: string) => {
    // Update UI state
    setConcerts((prev) =>
      prev.map((c) => (c.id === concertId ? { ...c, isSaved: true } : c))
    );
    // Persist to localStorage
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    if (!saved.includes(concertId)) {
      localStorage.setItem('savedConcerts', JSON.stringify([...saved, concertId]));
    }
  };

  const handleUnsaveConcert = async (concertId: string) => {
    setConcerts((prev) =>
      prev.map((c) => (c.id === concertId ? { ...c, isSaved: false } : c))
    );
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    localStorage.setItem('savedConcerts', JSON.stringify(saved.filter((id: string) => id !== concertId)));
  };

  const highMatches = filteredAndSortedConcerts.filter((c) => (c.matchScore || 0) >= 50).length;
  const perfectMatches = filteredAndSortedConcerts.filter((c) => (c.matchScore || 0) >= 100).length;

  // Extract genres from selected artists for display
  const selectedGenres = Array.from(new Set(selectedArtists.flatMap((a) => a.genres))).slice(0, 6);

  // Progress indicator (visual dots instead of (3/10))
  const renderProgressDots = () => {
    const total = 10;
    const filled = Math.min(selectedArtists.length, total);
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-all",
              i < filled ? "bg-green-500" : "bg-zinc-700"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/saved" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
              <Link href="/">
                <Button className="bg-green-600 hover:bg-green-500 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Connect Spotify
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header - Removed "Quick Match" label */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Find concerts you&apos;ll love
          </h1>
          <p className="text-zinc-400">
            Pick your favorite artists and we&apos;ll find matching concerts near you.
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
            <div className="flex items-center gap-3">
              {renderProgressDots()}
              {selectedArtists.length >= 3 && (
                <span className="px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                  ✓ Ready
                </span>
              )}
            </div>
          </div>

          <ArtistPicker
            selectedArtists={selectedArtists}
            onArtistsChange={setSelectedArtists}
            minArtists={3}
            maxArtists={10}
          />

          {/* Trending artists - quick add chips */}
          {selectedArtists.length < 10 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <TrendingArtistChips
                onSelect={(artist) => {
                  if (selectedArtists.length < 10 && !selectedArtists.find(a => a.id === artist.id)) {
                    // Note: TrendingArtistChips already tracks trending_artist_clicked
                    // Here we just add the artist - the artist_added tracking happens in ArtistPicker
                    setSelectedArtists([...selectedArtists, artist]);
                  }
                }}
                exclude={selectedArtists.map(a => a.id)}
              />
            </div>
          )}

          {/* Show inferred genres with explainer */}
          {selectedGenres.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-zinc-500">Genres we&apos;ll match:</p>
                <div className="group relative">
                  <HelpCircle className="w-4 h-4 text-zinc-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 shadow-xl border border-zinc-700">
                    We&apos;ll also show concerts from similar artists in these genres
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedGenres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs border border-cyan-500/20"
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
            {/* Location with Radius */}
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Location & Radius
              </label>
              <LocationSearch 
                value={location} 
                onChange={handleLocationChange}
                radius={radius}
                onRadiusChange={setRadius}
                showRadius={true}
              />
            </div>

            {/* Date Range */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Date Range
              </label>
              <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
            </div>

            {/* Search Button - GREEN */}
            <div className="flex items-end">
              <Button
                onClick={fetchConcerts}
                disabled={!canSearch || isLoading}
                className="w-full bg-green-600 hover:bg-green-500 h-10 disabled:opacity-50 disabled:cursor-not-allowed"
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
              Pick your favorite artists and location above, then hit &quot;Find Concerts&quot; to see personalized matches.
            </p>
          </div>
        ) : isLoading ? (
          // Loading State - 3 column grid
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
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
              Couldn&apos;t load concerts
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-4">{error}</p>
            <Button onClick={fetchConcerts} variant="outline" className="border-zinc-700">
              Try Again
            </Button>
          </div>
        ) : concerts.length === 0 ? (
          // No Results - Show email signup CTA and popular concerts
          <NoMatchesCard
            selectedArtists={selectedArtists}
            location={location}
            dateRange={dateRange}
            popularConcerts={popularConcerts}
            isLoadingPopular={isLoadingPopular}
            onConcertSave={handleSaveConcert}
            onConcertUnsave={handleUnsaveConcert}
          />
        ) : (
          <>
            {/* Results Header with Stats, Sort, and Filters */}
            <div className="space-y-4 mb-6">
              {/* Stats and Sort Row */}
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
                      <span className="text-zinc-300">{filteredAndSortedConcerts.length} concerts match your taste</span>
                    )}
                  </h2>
                  <p className="text-sm text-zinc-500">
                    In {location?.name} • {dateRange.label || "Custom dates"}
                    {vibeFilter !== "all" && (
                      <span className="text-purple-400"> • {VIBE_FILTERS.find(f => f.value === vibeFilter)?.label} filter</span>
                    )}
                  </p>
                </div>

                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">Sort by:</span>
                  <div className="flex items-center bg-zinc-800/50 rounded-lg p-1">
                    {SORT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          onClick={() => handleSortChange(option.value)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                            sortBy === option.value
                              ? "bg-green-600 text-white"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
                          )}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                      onClick={() => handleVibeFilterChange(filter.value)}
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

                {/* More Filters Toggle */}
                <button
                  onClick={() => setShowMoreFilters(!showMoreFilters)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ml-2",
                    showMoreFilters || activeFilterCount > 0
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  <Filter className="w-3.5 h-3.5" />
                  More Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-cyan-500 text-white text-xs">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Clear All Filters */}
                {(vibeFilter !== "all" || activeFilterCount > 0) && (
                  <button
                    onClick={() => {
                      setVibeFilter("all");
                      setVenueSizeFilter("all");
                      setDistanceFilter("all");
                      setPriceFilter("all");
                      setDayFilter("all");
                    }}
                    className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                    title="Clear all filters"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Expanded Filter Panel */}
              {showMoreFilters && (
                <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Venue Size */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Venue Size</label>
                    <select
                      value={venueSizeFilter}
                      onChange={(e) => setVenueSizeFilter(e.target.value as VenueSizeFilter)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {VENUE_SIZE_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>
                          {f.label} {f.description && `- ${f.description}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Distance */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Max Distance</label>
                    <select
                      value={distanceFilter}
                      onChange={(e) => setDistanceFilter(e.target.value as DistanceFilter)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {DISTANCE_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Price Range</label>
                    <select
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {PRICE_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Day */}
                  <div>
                    <label className="text-xs font-medium text-zinc-400 mb-2 block">Day of Week</label>
                    <select
                      value={dayFilter}
                      onChange={(e) => setDayFilter(e.target.value as DayFilter)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      {DAY_FILTERS.map((f) => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Concert Grid - 3 columns */}
            {filteredAndSortedConcerts.length === 0 ? (
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
                {filteredAndSortedConcerts.map((concert, index) => (
                  <>
                    <ConcertCard
                      key={concert.id}
                      concert={concert}
                      onSave={handleSaveConcert}
                      onUnsave={handleUnsaveConcert}
                      isAuthenticated={true}
                    />
                    {/* Insert upsell card after every 6th low-match result */}
                    {hasLowMatches && index === 5 && (
                      <SpotifyUpsellCard key="upsell" />
                    )}
                  </>
                ))}
              </div>
            )}

            {/* CTA at bottom */}
            <div className="mt-16 py-12 px-8 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-2xl border border-green-500/20">
              <div className="max-w-xl mx-auto text-center">
                <Sparkles className="w-10 h-10 text-green-400 mx-auto mb-4" />
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
                    className="bg-green-600 hover:bg-green-500"
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
