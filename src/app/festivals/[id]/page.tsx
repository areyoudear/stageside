"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Music,
  ArrowLeft,
  Calendar,
  MapPin,
  ExternalLink,
  Ticket,
  Share2,
  Heart,
  Star,
  Sparkles,
  Loader2,
  Grid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import {
  MatchPercentage,
  ArtistCard,
  ArtistCardSkeleton,
} from "@/components/festivals";
import type { FestivalWithMatch, FestivalArtistMatch, ScheduleDay } from "@/lib/festival-types";

interface FestivalDetailPageProps {
  params: { id: string };
}

export default function FestivalDetailPage({ params }: FestivalDetailPageProps) {
  const { id } = params;
  const { data: session } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalWithMatch | null>(null);
  const [lineup, setLineup] = useState<FestivalArtistMatch[]>([]);
  const [userAgenda, setUserAgenda] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "matches" | "discoveries">("all");
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchFestival();
  }, [id, session]);

  const fetchFestival = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/festivals/${id}`);
      if (!response.ok) {
        router.push("/festivals");
        return;
      }
      const data = await response.json();
      setFestival(data.festival);
      setLineup(data.lineup || []);
      setUserAgenda(data.userAgenda || []);
    } catch (error) {
      console.error("Error fetching festival:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAgenda = async (artistId: string) => {
    if (!session) {
      // Prompt to login
      return;
    }

    const isInAgenda = userAgenda.includes(artistId);
    const method = isInAgenda ? "DELETE" : "POST";

    try {
      const response = await fetch(`/api/festivals/${id}/agenda`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId }),
      });

      if (response.ok) {
        setUserAgenda(
          isInAgenda
            ? userAgenda.filter((id) => id !== artistId)
            : [...userAgenda, artistId]
        );
      }
    } catch (error) {
      console.error("Error updating agenda:", error);
    }
  };

  // Filter lineup
  const filteredLineup = lineup.filter((artist) => {
    if (filter === "all") return true;
    if (filter === "matches") return artist.matchType === "perfect";
    if (filter === "discoveries")
      return artist.matchType === "discovery" || artist.matchType === "genre";
    return true;
  });

  const formatDateRange = (dates: { start: string; end: string }) => {
    const start = new Date(dates.start);
    const end = new Date(dates.end);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    if (start.getMonth() === end.getMonth()) {
      return `${monthNames[start.getMonth()]} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </main>
    );
  }

  if (!festival) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href="/festivals"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Festivals</span>
            </Link>

            <div className="flex items-center gap-2">
              {session && userAgenda.length > 0 && (
                <Link href={`/festivals/${id}/my-agenda`}>
                  <Button variant="outline" size="sm">
                    My Agenda ({userAgenda.length})
                  </Button>
                </Link>
              )}
              <SpotifyConnectButton size="sm" showName={false} />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 h-80 overflow-hidden">
          {!imageError && festival.image_url ? (
            <Image
              src={festival.image_url}
              alt={festival.name}
              fill
              className="object-cover opacity-30"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/30 to-pink-500/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Festival info */}
            <div className="flex-1">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                {festival.name}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-zinc-400 mb-6">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-400" />
                  {formatDateRange(festival.dates)}
                </span>
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-pink-400" />
                  {festival.location.city}
                  {festival.location.state && `, ${festival.location.state}`}
                </span>
              </div>

              {/* Genres */}
              {festival.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {festival.genres.map((genre) => (
                    <span
                      key={genre}
                      className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <Link href={`/festivals/${id}/schedule`}>
                  <Button className="bg-cyan-600 hover:bg-cyan-700">
                    <Grid className="w-4 h-4 mr-2" />
                    Build My Schedule
                  </Button>
                </Link>
                {festival.ticket_url && (
                  <Button variant="outline" asChild>
                    <a
                      href={festival.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Ticket className="w-4 h-4 mr-2" />
                      Get Tickets
                    </a>
                  </Button>
                )}
                {festival.website_url && (
                  <Button variant="ghost" asChild>
                    <a
                      href={festival.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Match percentage */}
            {festival.matchPercentage > 0 && (
              <div className="lg:w-80">
                <MatchPercentage
                  percentage={festival.matchPercentage}
                  matchedCount={festival.matchedArtistCount}
                  totalCount={festival.totalArtistCount}
                  size="lg"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Perfect Matches */}
        {festival.perfectMatches.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-green-400 fill-green-400" />
              Your Perfect Matches ({festival.perfectMatches.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {festival.perfectMatches.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  isInAgenda={userAgenda.includes(artist.id)}
                  onToggleAgenda={toggleAgenda}
                  showScheduleInfo
                />
              ))}
            </div>
          </section>
        )}

        {/* Discovery Matches */}
        {festival.discoveryMatches.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              You Might Discover ({festival.discoveryMatches.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {festival.discoveryMatches.slice(0, 12).map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  isInAgenda={userAgenda.includes(artist.id)}
                  onToggleAgenda={toggleAgenda}
                  showScheduleInfo
                />
              ))}
            </div>
          </section>
        )}

        {/* Full Lineup */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-semibold text-white">
              Full Lineup ({lineup.length} artists)
            </h2>

            <div className="flex items-center gap-2">
              {/* Filter */}
              <div className="flex bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === "all"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("matches")}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === "matches"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400"
                  }`}
                >
                  Matches
                </button>
                <button
                  onClick={() => setFilter("discoveries")}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === "discoveries"
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-400"
                  }`}
                >
                  Discoveries
                </button>
              </div>

              {/* View mode */}
              <div className="flex bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded ${
                    viewMode === "grid" ? "bg-zinc-700" : ""
                  }`}
                >
                  <Grid className="w-4 h-4 text-zinc-400" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded ${
                    viewMode === "list" ? "bg-zinc-700" : ""
                  }`}
                >
                  <List className="w-4 h-4 text-zinc-400" />
                </button>
              </div>
            </div>
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredLineup.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  isInAgenda={userAgenda.includes(artist.id)}
                  onToggleAgenda={toggleAgenda}
                  showScheduleInfo
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLineup.map((artist) => (
                <ArtistCard
                  key={artist.id}
                  artist={artist}
                  isInAgenda={userAgenda.includes(artist.id)}
                  onToggleAgenda={toggleAgenda}
                  showScheduleInfo
                  compact
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
