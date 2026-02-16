"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import { Music, Sparkles, ArrowRight, AlertCircle, MapPin, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { DEMO_TOP_ARTISTS, DEMO_TOP_GENRES, DEMO_DEFAULT_LOCATION } from "@/lib/demo-data";
import { MusicServiceLogos } from "@/components/MusicServiceLogos";
import type { Concert } from "@/lib/ticketmaster";

export default function DemoPage() {
  // Fixed demo settings - no user editing
  const location = DEMO_DEFAULT_LOCATION;
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    return { startDate: start, endDate: end };
  }, []);
  
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch concerts on mount - no user interaction needed
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

  useEffect(() => {
    fetchConcerts();
  }, [fetchConcerts]);

  // Demo interactions - just visual, encourage signup for real actions
  const handleSaveConcert = async () => {
    // Don't actually save - prompt to sign up
  };

  const handleUnsaveConcert = async () => {
    // Don't actually unsave
  };

  const perfectMatches = concerts.filter((c) => (c.matchScore || 0) >= 90).length;
  const greatMatches = concerts.filter((c) => (c.matchScore || 0) >= 70).length;

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

            <Link href="/signup">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90">
                Get Your Matches
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero section explaining the demo */}
      <div className="bg-gradient-to-r from-cyan-900/40 to-purple-900/40 border-b border-cyan-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-amber-300 font-medium">Demo Mode</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              This is how Stageside works
            </h1>
            <p className="text-zinc-300 mb-4">
              Below are real concerts in <span className="text-white font-medium">Los Angeles</span>, 
              matched against a sample indie music taste. See how each concert gets a match score 
              based on the artists and genres?
            </p>
            <p className="text-zinc-400 text-sm">
              <span className="text-cyan-400">Your results will be personalized</span> to your actual 
              Spotify, Apple Music, or YouTube Music listening history.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Profile - Compact */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-zinc-400">Sample taste:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-medium">
                    DEMO
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DEMO_TOP_ARTISTS.slice(0, 5).map((artist) => (
                    <span
                      key={artist.name}
                      className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs"
                    >
                      {artist.name}
                    </span>
                  ))}
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800/50 text-zinc-500 text-xs">
                    +{DEMO_TOP_ARTISTS.length - 5} more
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>{location.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Next 3 months</span>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {isLoading ? (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Finding matches...</h2>
                <p className="text-sm text-zinc-500">Analyzing concerts against the sample taste</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <ConcertCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Couldn&apos;t load concerts
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-4">{error}</p>
            <Button onClick={() => fetchConcerts()} variant="outline" className="border-zinc-700">
              Try Again
            </Button>
          </div>
        ) : concerts.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🎵</span>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">No concerts found</h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Try again in a moment.
            </p>
          </div>
        ) : (
          <>
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {perfectMatches > 0 ? (
                    <>
                      <span className="text-emerald-400">{perfectMatches} perfect</span>
                      {greatMatches - perfectMatches > 0 && (
                        <> and <span className="text-cyan-400">{greatMatches - perfectMatches} great</span></>
                      )}
                      {" "}matches!
                    </>
                  ) : greatMatches > 0 ? (
                    <>
                      <span className="text-cyan-400">{greatMatches}</span> great matches found
                    </>
                  ) : (
                    `${concerts.length} concerts found`
                  )}
                </h2>
                <p className="text-sm text-zinc-500">
                  Based on the sample indie/alternative taste
                </p>
              </div>
              <Link href="/signup">
                <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                  Get Your Matches
                </Button>
              </Link>
            </div>

            {/* How matching works - inline explainer */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20">
              <p className="text-sm text-zinc-300">
                <span className="text-white font-medium">How it works:</span>{" "}
                Phoebe Bridgers is the #1 artist in this sample, so her shows are 100% matches. 
                Lucy Dacus and Julien Baker score high because they&apos;re in Boygenius together. 
                Artists like Alvvays appear because they match the dream pop genre.{" "}
                <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium">
                  Connect your music →
                </Link>
              </p>
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

            {/* Bottom CTA */}
            <div className="mt-16 py-12 px-8 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-2xl border border-cyan-500/20">
              <div className="max-w-2xl mx-auto text-center">
                <h3 className="text-2xl font-bold text-white mb-3">
                  Ready to find YOUR concerts?
                </h3>
                <p className="text-zinc-400 mb-6">
                  Connect your music service and we&apos;ll show you concerts matched to 
                  your actual listening history — not a sample profile.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link href="/signup">
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-90 px-8"
                    >
                      Get Started Free
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-zinc-500">
                  <span>Works with</span>
                  <MusicServiceLogos size="sm" />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
