"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Music, Loader2, RefreshCw, Filter, Settings, Sparkles, Users, Bookmark, Heart, Check, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { LocationSearch, Location } from "@/components/LocationSearch";
import { DateRangePicker, DateRange } from "@/components/DateRangePicker";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import type { Concert } from "@/lib/ticketmaster";
import type { MusicServiceType } from "@/lib/music-types";

// Friend interest types
interface FriendInfo {
  id: string;
  name: string;
  username: string;
  imageUrl: string | null;
}

interface FriendsInterests {
  [concertId: string]: {
    interested: FriendInfo[];
    going: FriendInfo[];
  };
}

type StatusFilter = "all" | "interested" | "going" | "friends-interested" | "friends-going";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [stats, setStats] = useState<{
    highMatches: number;
    totalElements: number;
    userTopArtists: string[];
    userTopGenres: string[];
    connectedServices: MusicServiceType[];
    hasProfile: boolean;
  } | null>(null);
  const [minMatchScore, setMinMatchScore] = useState(0);
  
  // Friends & interest state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [userInterests, setUserInterests] = useState<{ interested: string[]; going: string[] }>({ interested: [], going: [] });
  const [friendsInterests, setFriendsInterests] = useState<FriendsInterests>({});
  const [friendsConcertIds, setFriendsConcertIds] = useState<{ interested: string[]; going: string[] }>({ interested: [], going: [] });
  const [friendCount, setFriendCount] = useState(0);

  // Check auth and onboarding status
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    
    // Check if user has completed onboarding
    if (status === "authenticated" && !onboardingChecked) {
      const checkOnboarding = async () => {
        try {
          const res = await fetch("/api/user/onboarding-status");
          if (res.ok) {
            const data = await res.json();
            if (!data.completed) {
              // User hasn't set up their music preferences - redirect to onboarding
              router.push("/onboarding");
              return;
            }
          }
        } catch (error) {
          console.error("Error checking onboarding:", error);
        }
        setOnboardingChecked(true);
      };
      checkOnboarding();
    }
  }, [status, router, onboardingChecked]);

  // Fetch user's interests and friends' interests
  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchInterests = async () => {
      try {
        // Fetch user's own interests
        const userRes = await fetch("/api/concerts/interest");
        if (userRes.ok) {
          const userData = await userRes.json();
          const interested = userData.interests?.filter((i: { status: string }) => i.status === "interested").map((i: { concertId: string }) => i.concertId) || [];
          const going = userData.interests?.filter((i: { status: string }) => i.status === "going").map((i: { concertId: string }) => i.concertId) || [];
          setUserInterests({ interested, going });
        }

        // Fetch friends' interests
        const friendsRes = await fetch("/api/friends/interests");
        if (friendsRes.ok) {
          const data = await friendsRes.json();
          setFriendsInterests(data.interests || {});
          setFriendsConcertIds(data.concertIds || { interested: [], going: [] });
          setFriendCount(data.friendCount || 0);
        }
      } catch (error) {
        console.error("Failed to fetch interests:", error);
      }
    };

    fetchInterests();
  }, [status]);

  // Load saved location from localStorage on mount, or auto-detect
  useEffect(() => {
    const loadLocation = async () => {
      try {
        const savedLocation = localStorage.getItem("stageside_location");
        if (savedLocation) {
          const parsed = JSON.parse(savedLocation);
          setLocation(parsed);
          return;
        }
        
        // No saved location - try to auto-detect
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              
              // Reverse geocode to get city name
              try {
                const response = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                  {
                    headers: {
                      "User-Agent": "Stageside/1.0 (https://getstageside.com)",
                    },
                  }
                );
                const data = await response.json();
                const cityName =
                  data.address?.city ||
                  data.address?.town ||
                  data.address?.municipality ||
                  data.address?.village ||
                  "Current Location";

                const state = data.address?.state;
                const displayName = state ? `${cityName}, ${state}` : cityName;

                const detectedLocation = {
                  name: displayName,
                  lat: latitude,
                  lng: longitude,
                };
                setLocation(detectedLocation);
                localStorage.setItem("stageside_location", JSON.stringify(detectedLocation));
              } catch {
                const detectedLocation = {
                  name: "Current Location",
                  lat: latitude,
                  lng: longitude,
                };
                setLocation(detectedLocation);
                localStorage.setItem("stageside_location", JSON.stringify(detectedLocation));
              }
            },
            (error) => {
              console.log("Geolocation not available or denied:", error.message);
              // Silent fail - user can manually select location
            },
            { enableHighAccuracy: false, timeout: 5000 }
          );
        }
      } catch (e) {
        console.error("Error loading saved location:", e);
      }
    };
    
    loadLocation();
  }, []);

  // Save location to localStorage when it changes
  useEffect(() => {
    if (location) {
      try {
        localStorage.setItem("stageside_location", JSON.stringify(location));
      } catch (e) {
        console.error("Error saving location:", e);
      }
    }
  }, [location]);

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
        radius: radius.toString(),
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
        highMatches: data.highMatches || data.categories?.mustSee || 0,
        totalElements: data.totalElements || 0,
        userTopArtists: data.userTopArtists || [],
        userTopGenres: data.userTopGenres || [],
        connectedServices: data.connectedServices || [],
        hasProfile: data.hasProfile ?? true,
      });
    } catch (err) {
      console.error("Error fetching concerts:", err);
      setError("Failed to load concerts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [location, dateRange, radius, session]);

  // Auto-fetch concerts when location is loaded from storage (on initial mount)
  const [hasAutoFetched, setHasAutoFetched] = useState(false);
  useEffect(() => {
    if (location && !hasAutoFetched && !hasSearched && status === "authenticated") {
      setHasAutoFetched(true);
      fetchConcerts();
    }
  }, [location, hasAutoFetched, hasSearched, status, fetchConcerts]);

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

  // Interest change handler (calls API so friends can see)
  const handleInterestChange = async (
    concertId: string,
    newStatus: "interested" | "going" | null,
    concert: Concert
  ) => {
    // Update local state immediately
    setUserInterests(prev => {
      const newInterested = prev.interested.filter(id => id !== concertId);
      const newGoing = prev.going.filter(id => id !== concertId);
      
      if (newStatus === "interested") {
        newInterested.push(concertId);
      } else if (newStatus === "going") {
        newGoing.push(concertId);
      }
      
      return { interested: newInterested, going: newGoing };
    });

    // Call API to persist
    try {
      if (newStatus) {
        await fetch("/api/concerts/interest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ concertId, status: newStatus, concert }),
        });
      } else {
        await fetch(`/api/concerts/interest?concertId=${concertId}`, {
          method: "DELETE",
        });
      }
    } catch (error) {
      console.error("Failed to save interest:", error);
    }
  };

  // Filter concerts by minimum match score and status
  const filteredConcerts = useMemo(() => {
    let result = concerts;
    
    // Apply match score filter
    if (minMatchScore > 0) {
      result = result.filter((c) => (c.matchScore || 0) >= minMatchScore);
    }
    
    // Apply status filter
    if (statusFilter === "interested") {
      result = result.filter(c => userInterests.interested.includes(c.id));
    } else if (statusFilter === "going") {
      result = result.filter(c => userInterests.going.includes(c.id));
    } else if (statusFilter === "friends-interested") {
      result = result.filter(c => friendsConcertIds.interested.includes(c.id));
    } else if (statusFilter === "friends-going") {
      result = result.filter(c => friendsConcertIds.going.includes(c.id));
    }
    
    return result;
  }, [concerts, minMatchScore, statusFilter, userInterests, friendsConcertIds]);

  // Show loading while checking auth or onboarding status
  if (status === "loading" || (status === "authenticated" && !onboardingChecked)) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
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
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>

            {/* Mode tabs - scrollable on mobile */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1 overflow-x-auto scrollbar-hide max-w-[50vw] sm:max-w-none">
              <span className="px-3 sm:px-4 py-2 rounded-md text-sm bg-cyan-600 text-white whitespace-nowrap min-h-[36px] flex items-center">
                Concerts
              </span>
              <Link
                href="/festivals"
                className="px-3 sm:px-4 py-2 rounded-md text-sm text-zinc-400 hover:text-white transition-colors whitespace-nowrap min-h-[36px] flex items-center"
              >
                Festivals
              </Link>
              <Link
                href="/saved"
                className="px-3 sm:px-4 py-2 rounded-md text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap min-h-[36px]"
              >
                <Bookmark className="w-4 h-4" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
              <Link
                href="/friends"
                className="px-3 sm:px-4 py-2 rounded-md text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap min-h-[36px]"
              >
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Friends</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                  <span className="ml-2 hidden sm:inline">Settings</span>
                </Button>
              </Link>
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

        {/* Search Controls */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location & Radius */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Location & Radius
              </label>
              <LocationSearch 
                value={location} 
                onChange={setLocation}
                radius={radius}
                onRadiusChange={setRadius}
                showRadius={true}
              />
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
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 h-10"
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

          {/* Match Score Filter - Only show after search with profile */}
          {hasSearched && stats?.hasProfile && (
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
                    className="flex-1 h-3 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-6
                      [&::-webkit-slider-thumb]:h-6
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-cyan-500
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:cursor-pointer
                      [&::-moz-range-thumb]:w-6
                      [&::-moz-range-thumb]:h-6
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-cyan-500
                      [&::-moz-range-thumb]:border-0
                      [&::-moz-range-thumb]:cursor-pointer"
                  />
                  <div className="flex items-center gap-2 min-w-[80px]">
                    <span className={`text-lg font-bold ${
                      minMatchScore >= 80 ? "text-green-400" : 
                      minMatchScore >= 50 ? "text-yellow-400" : 
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

          {/* Status Filters (Interested/Going/Friends) - min 44px touch targets */}
          {hasSearched && concerts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-zinc-500 mr-1">Show:</span>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]",
                    statusFilter === "all"
                      ? "bg-cyan-500 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("interested")}
                  disabled={userInterests.interested.length === 0 && concerts.filter(c => userInterests.interested.includes(c.id)).length === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]",
                    statusFilter === "interested"
                      ? "bg-amber-500 text-white"
                      : userInterests.interested.length === 0
                      ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  <Heart className="w-4 h-4" />
                  Interested
                  <span className={cn(
                    "ml-1 text-xs",
                    statusFilter === "interested" ? "text-amber-200" : "text-zinc-500"
                  )}>
                    ({userInterests.interested.length})
                  </span>
                </button>
                <button
                  onClick={() => setStatusFilter("going")}
                  disabled={userInterests.going.length === 0 && concerts.filter(c => userInterests.going.includes(c.id)).length === 0}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]",
                    statusFilter === "going"
                      ? "bg-green-500 text-white"
                      : userInterests.going.length === 0
                      ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                  )}
                >
                  <Check className="w-4 h-4" />
                  Going
                  <span className={cn(
                    "ml-1 text-xs",
                    statusFilter === "going" ? "text-green-200" : "text-zinc-500"
                  )}>
                    ({userInterests.going.length})
                  </span>
                </button>
                {/* Friends filters - only show if have friends */}
                {friendCount > 0 && (
                  <>
                    <div className="w-px h-6 bg-zinc-700 mx-1" />
                    <button
                      onClick={() => setStatusFilter("friends-interested")}
                      disabled={friendsConcertIds.interested.length === 0}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]",
                        statusFilter === "friends-interested"
                          ? "bg-blue-500 text-white"
                          : friendsConcertIds.interested.length === 0
                          ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      )}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Friends Interested
                      <span className={cn(
                        "ml-1 text-xs",
                        statusFilter === "friends-interested" ? "text-blue-200" : "text-zinc-500"
                      )}>
                        ({friendsConcertIds.interested.length})
                      </span>
                    </button>
                    <button
                      onClick={() => setStatusFilter("friends-going")}
                      disabled={friendsConcertIds.going.length === 0}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px]",
                        statusFilter === "friends-going"
                          ? "bg-emerald-500 text-white"
                          : friendsConcertIds.going.length === 0
                          ? "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                      )}
                    >
                      <UserCheck className="w-4 h-4" />
                      Friends Going
                      <span className={cn(
                        "ml-1 text-xs",
                        statusFilter === "friends-going" ? "text-emerald-200" : "text-zinc-500"
                      )}>
                        ({friendsConcertIds.going.length})
                      </span>
                    </button>
                  </>
                )}
                {statusFilter !== "all" && (
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="p-2.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    title="Clear filter"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}

                {/* Spacer and Notification Bell */}
                <div className="flex-1" />
                <NotificationBell
                  location={location}
                  radius={radius}
                  minMatchScore={minMatchScore}
                  statusFilter={statusFilter}
                />
              </div>
            </div>
          )}

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
        ) : filteredConcerts.length === 0 ? (
          // Filter removed all results
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-yellow-500" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No concerts match your filter
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-4">
              No concerts have a {minMatchScore}%+ match. Try lowering the minimum match score.
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
                  ) : stats?.highMatches && stats.highMatches > 0 ? (
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
              {filteredConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  onSave={handleSaveConcert}
                  onUnsave={handleUnsaveConcert}
                  isAuthenticated={!!session}
                  hasProfile={stats?.hasProfile ?? true}
                  onInterestChange={handleInterestChange}
                  interestStatus={
                    userInterests.going.includes(concert.id) ? "going" :
                    userInterests.interested.includes(concert.id) ? "interested" : null
                  }
                  friendsInterested={friendsInterests[concert.id] ? [
                    ...friendsInterests[concert.id].interested.map(f => ({ id: f.id, name: f.name, status: "interested" as const })),
                    ...friendsInterests[concert.id].going.map(f => ({ id: f.id, name: f.name, status: "going" as const })),
                  ] : undefined}
                />
              ))}
            </div>
          </>
        )}

      </div>
    </main>
  );
}
