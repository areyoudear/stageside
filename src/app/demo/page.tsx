"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Music, Filter, Sparkles, ArrowRight, Info, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocationSearch, Location } from "@/components/LocationSearch";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { DEMO_TOP_ARTISTS, DEMO_TOP_GENRES } from "@/lib/demo-data";
import type { Concert } from "@/lib/ticketmaster";

export default function DemoPage() {
  // State
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

  // Fetch REAL concerts from API, matched against demo profile
  const fetchConcerts = useCallback(async (overrideLocation?: Location) => {
    const loc = overrideLocation || location;
    if (!loc) return;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: loc.lat.toString(),
        lng: loc.lng.toString(),
        startDate: dateRange.startDate.toISOString().split("T")[0],
        endDate: dateRange.endDate.toISOString().split("T")[0],
      });

      const response = await fetch(`/api/demo-concerts?${params.toString()}`);
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
  }, [location, dateRange]);

  // Quick select a city and immediately search
  const selectCityAndSearch = (city: { name: string; lat: number; lng: number }) => {
    setLocation(city);
    fetchConcerts(city);
  };

  // Demo save handler (shows toast instead of actual save)
  const handleSaveConcert = async (concertId: string) => {
    // In demo mode, just toggle locally
    setConcerts((prev) =>
      prev.map((c) => (c.id === concertId ? { ...c, isSaved: true } : c))
    );
  };

  const handleUnsaveConcert = async (concertId: string) => {
    setConcerts((prev) =>
      prev.map((c) => (c.id === concertId ? { ...c, isSaved: false } : c))
    );
  };

  const highMatches = concerts.filter((c) => (c.matchScore || 0) >= 50).length;

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

            {/* Demo badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">Demo Mode</span>
            </div>

            <Link href="/">
              <Button className="bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600">
                Connect Spotify
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-purple-400" />
              <span className="text-zinc-300">
                This is a demo with sample data. Connect Spotify to see concerts matched to{" "}
                <span className="text-white font-medium">your actual music taste</span>.
              </span>
            </div>
            <Link
              href="/"
              className="text-sm text-purple-400 hover:text-purple-300 font-medium"
            >
              Connect now →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome to Stageside! 🎵
          </h1>
          <p className="text-zinc-400">
            Try the experience with sample music taste. Set a location to see matched concerts.
          </p>
        </div>

        {/* Demo Profile Card */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">
                Demo Music Profile
              </h2>
              <p className="text-sm text-zinc-500">
                Sample artists for demonstration. Your real profile will be personalized!
              </p>
            </div>
            <span className="px-2 py-1 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium">
              SAMPLE DATA
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-500 mb-2">Top Artists</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_TOP_ARTISTS.slice(0, 8).map((artist) => (
                  <span
                    key={artist.name}
                    className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-sm"
                  >
                    {artist.name}
                  </span>
                ))}
                <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-500 text-sm">
                  +{DEMO_TOP_ARTISTS.length - 8} more
                </span>
              </div>
            </div>

            <div>
              <p className="text-sm text-zinc-500 mb-2">Top Genres</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_TOP_GENRES.map((genre) => (
                  <span
                    key={genre}
                    className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-sm border border-purple-500/20"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Search Controls */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
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
                onClick={() => fetchConcerts()}
                disabled={!location || isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 h-10"
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
        </div>

        {/* Results Section */}
        {!hasSearched ? (
          // Empty State
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <Music className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Ready to explore?
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Enter a location above to see how Stageside matches concerts to your music taste.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm text-zinc-500">
              <span>Try:</span>
              <button
                onClick={() =>
                  selectCityAndSearch({ name: "San Francisco, CA", lat: 37.7749, lng: -122.4194 })
                }
                className="text-purple-400 hover:text-purple-300"
              >
                San Francisco
              </button>
              <button
                onClick={() =>
                  selectCityAndSearch({ name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437 })
                }
                className="text-purple-400 hover:text-purple-300"
              >
                Los Angeles
              </button>
              <button
                onClick={() =>
                  selectCityAndSearch({ name: "New York, NY", lat: 40.7128, lng: -74.006 })
                }
                className="text-purple-400 hover:text-purple-300"
              >
                New York
              </button>
            </div>
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
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Couldn't load concerts
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-4">
              {error}
            </p>
            <Button
              onClick={() => fetchConcerts()}
              variant="outline"
              className="border-zinc-700"
            >
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
              Try expanding your date range or search area.
            </p>
          </div>
        ) : (
          <>
            {/* Results Stats */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {highMatches > 0 ? (
                    <>
                      <span className="text-green-400">{highMatches}</span> perfect matches
                      found
                    </>
                  ) : (
                    `${concerts.length} concerts found`
                  )}
                </h2>
                <p className="text-sm text-zinc-500">
                  In {location?.name} • {dateRange.label || "Custom dates"}
                </p>
              </div>
            </div>

            {/* Concert Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {concerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onSave={handleSaveConcert}
                  onUnsave={handleUnsaveConcert}
                  isAuthenticated={false}
                />
              ))}
            </div>

            {/* CTA at bottom */}
            <div className="mt-16 py-12 px-8 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-2xl border border-purple-500/20">
              <div className="max-w-xl mx-auto text-center">
                <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Like what you see?
                </h3>
                <p className="text-zinc-400 mb-6">
                  Connect your Spotify to get personalized matches based on{" "}
                  <span className="text-white">your actual listening history</span>.
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
