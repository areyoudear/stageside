"use client";

import { useState, useEffect, useCallback } from "react";
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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import {
  MatchPercentage,
  ArtistCard,
  ArtistCardSkeleton,
} from "@/components/festivals";
import { toast } from "sonner";
import type { FestivalWithMatch, FestivalArtistMatch, ScheduleDay } from "@/lib/festival-types";

interface FestivalDetailPageProps {
  params: { id: string };
}

type InterestStatus = "interested" | "going" | null;
type InterestMap = Record<string, InterestStatus>;

export default function FestivalDetailPage({ params }: FestivalDetailPageProps) {
  const { id } = params;
  const { data: session } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalWithMatch | null>(null);
  const [lineup, setLineup] = useState<FestivalArtistMatch[]>([]);
  const [userAgenda, setUserAgenda] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState<"all" | "matches" | "discoveries" | "interested" | "mySchedule">("all");
  const [imageError, setImageError] = useState(false);
  const [interestMap, setInterestMap] = useState<InterestMap>({});
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Load interest status and agenda from localStorage
  useEffect(() => {
    const storedInterest = localStorage.getItem(`festival-interest-${id}`);
    if (storedInterest) {
      try {
        setInterestMap(JSON.parse(storedInterest));
      } catch (e) {
        console.error("Error loading interest map:", e);
      }
    }
    
    const storedAgenda = localStorage.getItem(`festival-agenda-${id}`);
    if (storedAgenda) {
      try {
        const parsed = JSON.parse(storedAgenda);
        if (Array.isArray(parsed)) {
          setUserAgenda(parsed);
        }
      } catch (e) {
        console.error("Error loading agenda:", e);
      }
    }
  }, [id]);

  // Handle interest change
  const handleInterestChange = useCallback((artistId: string, status: InterestStatus) => {
    setInterestMap(prev => {
      const newMap = { ...prev };
      if (status === null) {
        delete newMap[artistId];
      } else {
        newMap[artistId] = status;
      }
      // Persist to localStorage
      localStorage.setItem(`festival-interest-${id}`, JSON.stringify(newMap));
      return newMap;
    });
  }, [id]);

  useEffect(() => {
    fetchFestival();
  }, [id, session]);

  const fetchFestival = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/festivals/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Festival not found");
        } else {
          toast.error("Failed to load festival details");
        }
        router.push("/festivals");
        return;
      }
      const data = await response.json();
      setFestival(data.festival);
      setLineup(data.lineup || []);
      setUserAgenda(data.userAgenda || []);
      
      // Capture debug info if present
      if (data.debug) {
        setDebugInfo(data.debug);
        console.log("[Festival Page] Debug info:", data.debug);
        console.log("[Festival Page] Personalized:", data.personalized);
        console.log("[Festival Page] Perfect matches:", data.festival?.perfectMatches?.length || 0);
      }
    } catch (error) {
      console.error("Error fetching festival:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAgenda = async (artistId: string) => {
    const isInAgenda = userAgenda.includes(artistId);
    const newAgenda = isInAgenda
      ? userAgenda.filter((aid) => aid !== artistId)
      : [...userAgenda, artistId];
    
    // Update local state immediately
    setUserAgenda(newAgenda);
    
    // Save to localStorage (works for all users)
    localStorage.setItem(`festival-agenda-${id}`, JSON.stringify(newAgenda));
    
    // If logged in, also sync with server
    if (session) {
      const method = isInAgenda ? "DELETE" : "POST";
      try {
        await fetch(`/api/festivals/${id}/agenda`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId }),
        });
      } catch (error) {
        console.error("Error syncing agenda with server:", error);
      }
    }
  };

  // Filter lineup
  const filteredLineup = lineup.filter((artist) => {
    if (filter === "all") return true;
    if (filter === "matches") return artist.matchType === "perfect";
    if (filter === "discoveries")
      return artist.matchType === "discovery" || artist.matchType === "genre";
    if (filter === "interested") return interestMap[artist.id] === "interested";
    if (filter === "mySchedule") return userAgenda.includes(artist.id);
    return true;
  });
  
  // Count for filter badges
  const interestedCount = Object.values(interestMap).filter(s => s === "interested").length;
  const scheduleCount = userAgenda.length;

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
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        {/* Navigation skeleton */}
        <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="w-24 h-8 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </nav>

        {/* Hero skeleton */}
        <div className="relative">
          <div className="h-80 bg-zinc-900/50" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/80 to-zinc-950" />
          <div className="absolute bottom-0 left-0 right-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="h-12 bg-zinc-800 rounded animate-pulse w-64 mb-4" />
            <div className="flex gap-4 mb-6">
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-32" />
              <div className="h-4 bg-zinc-800 rounded animate-pulse w-40" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-zinc-800 rounded animate-pulse w-40" />
              <div className="h-10 bg-zinc-800 rounded animate-pulse w-32" />
            </div>
          </div>
        </div>

        {/* Lineup skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-6 bg-zinc-800 rounded animate-pulse w-48 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <ArtistCardSkeleton key={i} />
            ))}
          </div>
        </div>
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
                  <Calendar className="w-4 h-4 text-blue-400" />
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
        {/* Debug Info Banner (only shown when no matches despite having profile) */}
        {debugInfo && debugInfo.userArtistsCount > 0 && festival.perfectMatches.length === 0 && festival.discoveryMatches.length === 0 && (
          <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-200 text-sm font-medium">No matches found</p>
              <p className="text-amber-200/70 text-xs mt-1">
                We couldn&apos;t find any matches between your {debugInfo.userArtistsCount} saved artists and the {debugInfo.lineupCount} artists in this lineup.
                This might be due to artist name variations. Try checking your music profile.
              </p>
            </div>
          </div>
        )}

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
                  interestStatus={interestMap[artist.id] || null}
                  onInterestChange={handleInterestChange}
                  previewUrl={artist.preview_url}
                  spotifyUrl={artist.spotify_url || (artist.spotify_id ? `https://open.spotify.com/artist/${artist.spotify_id}` : undefined)}
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
                  interestStatus={interestMap[artist.id] || null}
                  onInterestChange={handleInterestChange}
                  previewUrl={artist.preview_url}
                  spotifyUrl={artist.spotify_url || (artist.spotify_id ? `https://open.spotify.com/artist/${artist.spotify_id}` : undefined)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Full Lineup */}
        <section>
          {lineup.length === 0 ? (
            /* Empty lineup state */
            <div className="text-center py-16 px-4">
              <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
                <Calendar className="w-10 h-10 text-zinc-700" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-3">
                Lineup Coming Soon!
              </h2>
              <p className="text-zinc-500 max-w-md mx-auto mb-6">
                The official lineup hasn&apos;t been announced yet. Check back closer to the festival date for artist details and personalized recommendations.
              </p>
              {!session && (
                <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/20 rounded-xl p-4 max-w-md mx-auto">
                  <p className="text-sm text-zinc-400 mb-3">
                    Connect Spotify now to get personalized matches when the lineup drops!
                  </p>
                  <SpotifyConnectButton />
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
                <h2 className="text-xl font-semibold text-white">
                  Full Lineup ({lineup.length} artists)
                </h2>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Filter - scrollable on mobile */}
                  <div className="flex bg-zinc-800 rounded-lg p-1 overflow-x-auto">
                    <button
                      onClick={() => setFilter("all")}
                      className={`px-3 py-1.5 rounded text-sm whitespace-nowrap min-w-[44px] ${
                        filter === "all"
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilter("matches")}
                      className={`px-3 py-1.5 rounded text-sm whitespace-nowrap min-w-[44px] ${
                        filter === "matches"
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      Matches
                    </button>
                    <button
                      onClick={() => setFilter("discoveries")}
                      className={`px-3 py-1.5 rounded text-sm whitespace-nowrap min-w-[44px] ${
                        filter === "discoveries"
                          ? "bg-zinc-700 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      Discoveries
                    </button>
                    <button
                      onClick={() => setFilter("interested")}
                      className={`px-3 py-1.5 rounded text-sm whitespace-nowrap min-w-[44px] flex items-center gap-1 ${
                        filter === "interested"
                          ? "bg-violet-600 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      <Heart className="w-3 h-3" />
                      {interestedCount > 0 && <span>({interestedCount})</span>}
                    </button>
                    <button
                      onClick={() => setFilter("mySchedule")}
                      className={`px-3 py-1.5 rounded text-sm whitespace-nowrap min-w-[44px] flex items-center gap-1 ${
                        filter === "mySchedule"
                          ? "bg-green-600 text-white"
                          : "text-zinc-400"
                      }`}
                    >
                      My Schedule
                      {scheduleCount > 0 && <span>({scheduleCount})</span>}
                    </button>
                  </div>

                  {/* View mode */}
                  <div className="flex bg-zinc-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        viewMode === "grid" ? "bg-zinc-700" : ""
                      }`}
                    >
                      <Grid className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-2 rounded min-w-[44px] min-h-[44px] flex items-center justify-center ${
                        viewMode === "list" ? "bg-zinc-700" : ""
                      }`}
                    >
                      <List className="w-4 h-4 text-zinc-400" />
                    </button>
                  </div>
                </div>
              </div>

              {filteredLineup.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-zinc-500">
                    No artists match this filter.{" "}
                    <button
                      onClick={() => setFilter("all")}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      Show all artists
                    </button>
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
                  {filteredLineup.map((artist) => (
                    <ArtistCard
                      key={artist.id}
                      artist={artist}
                      isInAgenda={userAgenda.includes(artist.id)}
                      onToggleAgenda={toggleAgenda}
                      showScheduleInfo
                      interestStatus={interestMap[artist.id] || null}
                      onInterestChange={handleInterestChange}
                      previewUrl={artist.preview_url}
                      spotifyUrl={artist.spotify_url || (artist.spotify_id ? `https://open.spotify.com/artist/${artist.spotify_id}` : undefined)}
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
                      interestStatus={interestMap[artist.id] || null}
                      onInterestChange={handleInterestChange}
                      previewUrl={artist.preview_url}
                      spotifyUrl={artist.spotify_url || (artist.spotify_id ? `https://open.spotify.com/artist/${artist.spotify_id}` : undefined)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>

        {/* Connect prompt for non-logged in users viewing lineup */}
        {lineup.length > 0 && !session && (
          <section className="mt-12 text-center">
            <div className="bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/20 rounded-2xl p-6 max-w-lg mx-auto">
              <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Get Personalized Recommendations
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Connect Spotify to see which artists match your music taste and discover new favorites.
              </p>
              <SpotifyConnectButton />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
