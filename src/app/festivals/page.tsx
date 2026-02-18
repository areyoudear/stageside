"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Music, Search, Loader2, MapPin, Calendar, Filter, Users, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import {
  FestivalCard,
  FestivalCardSkeleton,
} from "@/components/festivals";
import type { FestivalWithMatch } from "@/lib/festival-types";

const GENRE_FILTERS = [
  "All",
  "Rock",
  "Electronic",
  "Hip-Hop",
  "Indie",
  "Pop",
  "Jazz",
  "Country",
  "Metal",
];

export default function FestivalsPage() {
  const { data: session, status } = useSession();
  const [festivals, setFestivals] = useState<FestivalWithMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [personalized, setPersonalized] = useState(false);

  useEffect(() => {
    fetchFestivals();
  }, [session]);

  const fetchFestivals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/festivals?upcoming=true&limit=30");
      const data = await response.json();
      setFestivals(data.festivals || []);
      setPersonalized(data.personalized || false);
    } catch (error) {
      console.error("Error fetching festivals:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter festivals
  const filteredFestivals = festivals.filter((festival) => {
    const matchesSearch =
      searchQuery === "" ||
      festival.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      festival.location.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre =
      selectedGenre === "All" ||
      festival.genres.some((g) =>
        g.toLowerCase().includes(selectedGenre.toLowerCase())
      );

    return matchesSearch && matchesGenre;
  });

  // Group festivals
  const popularFestivals = filteredFestivals
    .filter((f) => f.capacity === "massive" || f.capacity === "large")
    .slice(0, 6);
  const upcomingFestivals = filteredFestivals.slice(0, 12);
  const topMatches = personalized
    ? [...filteredFestivals]
        .sort((a, b) => b.matchPercentage - a.matchPercentage)
        .slice(0, 6)
    : [];

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

            {/* Mode tabs */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Concerts
              </Link>
              <span className="px-4 py-1.5 rounded-md text-sm bg-cyan-600 text-white">
                Festivals
              </span>
              <Link
                href="/saved"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
              <Link
                href="/friends"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Friends</span>
              </Link>
            </div>

            <SpotifyConnectButton size="sm" showName={false} />
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            🎪 Festival Planner
          </h1>
          <p className="text-zinc-400 max-w-2xl">
            Find festivals that match your music taste and build your perfect schedule.
          </p>
        </div>

        {/* Connect prompt if not logged in */}
        {status === "unauthenticated" && (
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-cyan-500/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">
                  Get personalized matches
                </h3>
                <p className="text-sm text-zinc-400">
                  Connect Spotify to see which festivals match your music taste
                </p>
              </div>
              <SpotifyConnectButton />
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search festivals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Genre filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {GENRE_FILTERS.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedGenre === genre
                      ? "bg-cyan-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading ? (
          // Loading state
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <FestivalCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredFestivals.length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <Music className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No festivals found
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto">
              {searchQuery || selectedGenre !== "All"
                ? "Try adjusting your search or filters"
                : "Check back later for upcoming festivals"}
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Top matches (if personalized) */}
            {personalized && topMatches.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    ⭐ Your Top Matches
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topMatches.map((festival) => (
                    <FestivalCard
                      key={festival.id}
                      festival={festival}
                      showMatchDetails
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Popular festivals */}
            {popularFestivals.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">
                    🔥 Popular Festivals
                  </h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {popularFestivals.map((festival) => (
                    <FestivalCard
                      key={festival.id}
                      festival={festival}
                      showMatchDetails={personalized}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* All upcoming */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  📅 Upcoming Festivals
                </h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcomingFestivals.map((festival) => (
                  <FestivalCard
                    key={festival.id}
                    festival={festival}
                    showMatchDetails={personalized}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
