"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Loader2, RefreshCw, Filter, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { LocationSearch, Location } from "@/components/LocationSearch";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { ConnectedServicesPanel } from "@/components/ConnectedServicesPanel";
import type { Concert } from "@/lib/ticketmaster";
import type { MusicServiceType } from "@/lib/music-types";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

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
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState<{
    highMatches: number;
    totalElements: number;
    userTopArtists: string[];
    userTopGenres: string[];
    connectedServices: MusicServiceType[];
  } | null>(null);
  const [showServicesPanel, setShowServicesPanel] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch concerts
  const fetchConcerts = useCallback(async () => {
    if (!location) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        startDate: dateRange.startDate.toISOString().split("T")[0],
        endDate: dateRange.endDate.toISOString().split("T")[0],
      });

      // Use matches endpoint if authenticated for personalized results
      const endpoint = session ? "/api/matches" : "/api/concerts";
      const response = await fetch(`${endpoint}?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch concerts");
      }

      const data = await response.json();
      setConcerts(data.concerts || []);
      setStats({
        highMatches: data.highMatches || 0,
        totalElements: data.totalElements || 0,
        userTopArtists: data.userTopArtists || [],
        userTopGenres: data.userTopGenres || [],
        connectedServices: data.connectedServices || [],
      });
    } catch (err) {
      console.error("Error fetching concerts:", err);
      setError("Failed to load concerts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [location, dateRange, session]);

  // Save/unsave concert handlers
  const handleSaveConcert = async (concertId: string) => {
    try {
      await fetch("/api/saved-concerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concertId }),
      });
    } catch (err) {
      console.error("Error saving concert:", err);
    }
  };

  const handleUnsaveConcert = async (concertId: string) => {
    try {
      await fetch("/api/saved-concerts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concertId }),
      });
    } catch (err) {
      console.error("Error unsaving concert:", err);
    }
  };

  // Show loading while checking auth
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!session) {
    return null; // Will redirect
  }

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

            {/* Mode tabs */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
              <span className="px-4 py-1.5 rounded-md text-sm bg-purple-600 text-white">
                Concerts
              </span>
              <Link
                href="/festivals"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Festivals
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowServicesPanel(!showServicesPanel)}
                className="text-zinc-400 hover:text-white"
              >
                <Settings className="w-4 h-4" />
                <span className="ml-2 hidden sm:inline">Services</span>
              </Button>
              <SpotifyConnectButton size="sm" />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Welcome back, {session.user?.name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-zinc-400">
            Find concerts from artists you love. Set your location and dates to get started.
          </p>
        </div>

        {/* Connected Services Panel */}
        {showServicesPanel && (
          <ConnectedServicesPanel
            className="mb-8"
            onConnectionsChange={() => {
              // Refetch concerts when connections change
              if (location) {
                fetchConcerts();
              }
            }}
          />
        )}

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
                onClick={fetchConcerts}
                disabled={!location || isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 h-10"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

          {/* User's Top Tastes Preview */}
          {stats && stats.userTopArtists.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500 mb-2">
                Matching concerts based on your top artists:
              </p>
              <div className="flex flex-wrap gap-2">
                {stats.userTopArtists.slice(0, 8).map((artist) => (
                  <span
                    key={artist}
                    className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-sm"
                  >
                    {artist}
                  </span>
                ))}
                {stats.userTopArtists.length > 8 && (
                  <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-500 text-sm">
                    +{stats.userTopArtists.length - 8} more
                  </span>
                )}
              </div>
            </div>
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
              Ready to find concerts?
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              Select your location and date range above to discover concerts from
              artists you already love.
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
              Something went wrong
            </h2>
            <p className="text-zinc-500 mb-4">{error}</p>
            <Button onClick={fetchConcerts} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
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
              We couldn&apos;t find any concerts matching your criteria. Try expanding
              your date range or search area.
            </p>
          </div>
        ) : (
          <>
            {/* Results Stats */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  {stats?.highMatches && stats.highMatches > 0 ? (
                    <>
                      <span className="text-green-400">{stats.highMatches}</span> perfect
                      matches found
                    </>
                  ) : (
                    `${concerts.length} concerts found`
                  )}
                </h2>
                <p className="text-sm text-zinc-500">
                  In {location?.name} • {dateRange.label || "Custom dates"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchConcerts}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {/* Concert Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {concerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onSave={handleSaveConcert}
                  onUnsave={handleUnsaveConcert}
                  isAuthenticated={!!session}
                />
              ))}
            </div>
          </>
        )}

        {/* Email Signup (at bottom) */}
        {hasSearched && concerts.length > 0 && (
          <div className="mt-16 py-12 px-8 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="max-w-xl mx-auto text-center">
              <h3 className="text-xl font-semibold text-white mb-2">
                Never miss a concert
              </h3>
              <p className="text-zinc-400 mb-6">
                Get weekly email updates when artists you love announce shows in{" "}
                {location?.name || "your area"}.
              </p>
              <EmailSignupForm
                location={
                  location
                    ? { lat: location.lat, lng: location.lng, city: location.name }
                    : undefined
                }
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
