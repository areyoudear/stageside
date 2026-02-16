"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Music, Filter, Sparkles, ArrowRight, Info, AlertCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { DEMO_TOP_ARTISTS, DEMO_TOP_GENRES, DEMO_DEFAULT_LOCATION } from "@/lib/demo-data";
import { MusicServiceLogos } from "@/components/MusicServiceLogos";
import type { Concert } from "@/lib/ticketmaster";

export default function DemoPage() {
  // State - Default to Los Angeles
  const [location] = useState(DEMO_DEFAULT_LOCATION);
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
  const [isLoading, setIsLoading] = useState(true); // Start loading immediately
  const [error, setError] = useState<string | null>(null);
  const [minMatchScore, setMinMatchScore] = useState(0);

  // Fetch REAL concerts from API, matched against demo profile
  const fetchConcerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
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

  // Auto-fetch concerts on mount
  useEffect(() => {
    fetchConcerts();
  }, [fetchConcerts]);

  // Demo save handler (shows toast instead of actual save)
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

  // Filter concerts by minimum match score
  const filteredConcerts = useMemo(() => {
    if (minMatchScore === 0) return concerts;
    return concerts.filter((c) => (c.matchScore || 0) >= minMatchScore);
  }, [concerts, minMatchScore]);

  const highMatches = filteredConcerts.filter((c) => (c.matchScore || 0) >= 80).length;
  const perfectMatches = filteredConcerts.filter((c) => (c.matchScore || 0) >= 95).length;

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

            {/* Demo badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-300 font-medium">Demo Mode</span>
            </div>

            <Link href="/signup">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Demo Banner */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-cyan-400" />
              <span className="text-zinc-300">
                See how Stageside matches concerts to your taste. Connect your music for{" "}
                <span className="text-white font-medium">personalized results</span>.
              </span>
            </div>
            <Link
              href="/signup"
              className="text-sm text-cyan-400 hover:text-cyan-300 font-medium"
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
            This is what Stageside looks like 🎵
          </h1>
          <p className="text-zinc-400">
            Based on a sample indie music taste. Your results will be personalized to{" "}
            <span className="text-white">your</span> listening history.
          </p>
        </div>

        {/* Demo Profile Card */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                Sample Music Profile
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-xs font-medium">
                  DEMO
                </span>
              </h2>
              <p className="text-sm text-zinc-500">
                If this were your taste, here&apos;s what we&apos;d find for you
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Works with</span>
              <MusicServiceLogos size="sm" />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-zinc-500 mb-2">Top Artists</p>
              <div className="flex flex-wrap gap-2">
                {DEMO_TOP_ARTISTS.slice(0, 8).map((artist) => (
                  <span
                    key={artist.name}
                    className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-sm font-medium"
                  >
                    {artist.name}
                  </span>
                ))}
                <span className="px-3 py-1.5 rounded-full bg-zinc-800/50 text-zinc-500 text-sm">
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
                    className="px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-300 text-sm border border-cyan-500/20"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Search Controls - Simplified, location is preset */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location - Display only (preset to LA) */}
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Location
              </label>
              <div className="flex items-center gap-2 h-10 px-4 rounded-lg bg-zinc-800 border border-zinc-700">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-medium">{location.name}</span>
              </div>
            </div>

            {/* Date Range */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Date Range
              </label>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>

            {/* Refresh Button */}
            <div className="flex items-end">
              <Button
                onClick={() => fetchConcerts()}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 h-10"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Filter className="w-4 h-4 mr-2" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Match Score Filter - Only show after loading */}
          {!isLoading && concerts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <label className="text-sm font-medium text-zinc-300">
                    Min Match
                  </label>
                </div>
                <div className="flex-1 flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minMatchScore}
                    onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cyan-500
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-4
                      [&::-moz-range-thumb]:h-4
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-cyan-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <span className={`text-lg font-bold ${
                      minMatchScore >= 80 ? "text-emerald-400" : 
                      minMatchScore >= 50 ? "text-amber-400" : 
                      "text-zinc-400"
                    }`}>
                      {minMatchScore}%
                    </span>
                    {minMatchScore > 0 && (
                      <button
                        onClick={() => setMinMatchScore(0)}
                        className="text-xs text-zinc-500 hover:text-zinc-300"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {minMatchScore > 0 && (
                <p className="text-xs text-zinc-500 mt-2">
                  Showing {filteredConcerts.length} of {concerts.length} concerts with {minMatchScore}%+ match
                </p>
              )}
            </div>
          )}
        </div>

        {/* Results Section */}
        {isLoading ? (
          // Loading State
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Finding your perfect matches...</h2>
                <p className="text-sm text-zinc-500">In {location.name} • {dateRange.label}</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ConcertCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : error ? (
          // Error State
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Couldn&apos;t load concerts
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
              Try expanding your date range.
            </p>
          </div>
        ) : filteredConcerts.length === 0 ? (
          // Filter removed all results
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No concerts match your filter
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-4">
              No concerts have a {minMatchScore}%+ match. Try lowering the minimum.
            </p>
            <Button onClick={() => setMinMatchScore(0)} variant="outline">
              Reset Filter
            </Button>
          </div>
        ) : (
          <>
            {/* Results Stats */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {minMatchScore > 0 ? (
                    <>
                      <span className="text-cyan-400">{filteredConcerts.length}</span> concerts
                      {" "}with {minMatchScore}%+ match
                    </>
                  ) : perfectMatches > 0 ? (
                    <>
                      <span className="text-emerald-400">{perfectMatches} perfect</span> and{" "}
                      <span className="text-cyan-400">{highMatches - perfectMatches} great</span> matches found!
                    </>
                  ) : highMatches > 0 ? (
                    <>
                      <span className="text-emerald-400">{highMatches}</span> great matches found
                    </>
                  ) : (
                    `${concerts.length} concerts found`
                  )}
                </h2>
                <p className="text-sm text-zinc-500">
                  In {location.name} • {dateRange.label || "Custom dates"}
                </p>
              </div>
            </div>

            {/* Explainer for demo */}
            <div className="mb-6 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <p className="text-sm text-zinc-400">
                <span className="text-white font-medium">See how this works?</span> Phoebe Bridgers is #1, so her show is a 100% match. 
                Lucy Dacus and Julien Baker (from Boygenius) get high scores because they&apos;re related. 
                Artists like Wednesday and Alvvays appear because they match the indie/dream pop vibe.{" "}
                <span className="text-cyan-400">Your results would reflect YOUR taste.</span>
              </p>
            </div>

            {/* Concert Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

            {/* CTA at bottom */}
            <div className="mt-16 py-12 px-8 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-2xl border border-cyan-500/20">
              <div className="max-w-xl mx-auto text-center">
                <Sparkles className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  Ready to see YOUR concerts?
                </h3>
                <p className="text-zinc-400 mb-6">
                  Connect your{" "}
                  <span className="text-white">Spotify, Apple Music, or YouTube Music</span>{" "}
                  to get personalized matches based on your actual listening history.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90"
                    >
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span>Works with</span>
                    <MusicServiceLogos size="sm" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
