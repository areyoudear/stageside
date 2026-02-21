"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  Music,
  ArrowRight,
  CheckCircle,
  MapPin,
  Loader2,
  Sparkles,
  Search,
  X,
  User,
} from "lucide-react";

interface MusicService {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
}

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

const MUSIC_SERVICES: Omit<MusicService, "connected">[] = [
  { id: "spotify", name: "Spotify", icon: "/icons/spotify.svg", color: "#1DB954" },
  { id: "apple_music", name: "Apple Music", icon: "/icons/apple-music.svg", color: "#FA243C" },
  { id: "youtube_music", name: "YouTube Music", icon: "/icons/youtube-music.svg", color: "#FF0000" },
  { id: "tidal", name: "Tidal", icon: "/icons/tidal.svg", color: "#000000" },
  { id: "deezer", name: "Deezer", icon: "/icons/deezer.svg", color: "#FF0092" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<MusicService[]>(
    MUSIC_SERVICES.map((s) => ({ ...s, connected: false }))
  );
  const [connecting, setConnecting] = useState<string | null>(null);
  const [location, setLocation] = useState("");
  const [locationResults, setLocationResults] = useState<
    Array<{ city: string; state: string; country: string; lat: number; lng: number }>
  >([]);
  const [selectedLocation, setSelectedLocation] = useState<{
    city: string;
    lat: number;
    lng: number;
  } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Manual artist entry state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [artistSearch, setArtistSearch] = useState("");
  const [artistResults, setArtistResults] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    
    // Check if user already completed onboarding
    if (status === "authenticated") {
      const checkStatus = async () => {
        try {
          const res = await fetch("/api/user/onboarding-status");
          if (res.ok) {
            const data = await res.json();
            // If user already has music preferences, redirect to dashboard
            if (data.completed && (data.hasArtists || data.hasConnections)) {
              router.push("/dashboard");
            }
          }
        } catch (error) {
          console.error("Error checking onboarding status:", error);
        }
      };
      checkStatus();
    }
  }, [status, router]);

  useEffect(() => {
    // Check existing connections
    const fetchConnections = async () => {
      try {
        const res = await fetch("/api/music/connections");
        if (res.ok) {
          const data = await res.json();
          setServices((prev) =>
            prev.map((s) => ({
              ...s,
              connected: data.connections?.some(
                (c: { service: string; is_active: boolean }) =>
                  c.service === s.id && c.is_active
              ),
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
      }
    };

    if (session?.user?.id) {
      fetchConnections();
    }
  }, [session]);

  const handleConnectService = async (serviceId: string) => {
    setConnecting(serviceId);

    // Redirect to OAuth flow
    const callbackUrl = `/onboarding?step=1&connected=${serviceId}`;
    window.location.href = `/api/music/connect/${serviceId}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleLocationSearch = async (query: string) => {
    setLocation(query);

    if (query.length < 2) {
      setLocationResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/location/autocomplete?q=${encodeURIComponent(query)}`
      );
      if (res.ok) {
        const data = await res.json();
        setLocationResults(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error searching location:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (loc: typeof locationResults[0]) => {
    setSelectedLocation({
      city: `${loc.city}, ${loc.state || loc.country}`,
      lat: loc.lat,
      lng: loc.lng,
    });
    setLocation(`${loc.city}, ${loc.state || loc.country}`);
    setLocationResults([]);
  };

  // Debounced artist search
  const handleArtistSearch = useCallback(async (query: string) => {
    setArtistSearch(query);

    if (query.length < 2) {
      setArtistResults([]);
      return;
    }

    setIsSearchingArtists(true);
    try {
      const res = await fetch(`/api/artists/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        // Filter out already selected artists
        const filtered = (data.artists || []).filter(
          (a: Artist) => !selectedArtists.some((s) => s.id === a.id)
        );
        setArtistResults(filtered);
      }
    } catch (error) {
      console.error("Error searching artists:", error);
    } finally {
      setIsSearchingArtists(false);
    }
  }, [selectedArtists]);

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtists((prev) => [...prev, artist]);
    setArtistSearch("");
    setArtistResults([]);
  };

  const handleRemoveArtist = (artistId: string) => {
    setSelectedArtists((prev) => prev.filter((a) => a.id !== artistId));
  };

  const handleSaveArtists = async () => {
    if (selectedArtists.length === 0) return;

    try {
      const res = await fetch("/api/user/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artists: selectedArtists }),
      });

      if (res.ok) {
        setStep(2); // Move to location step
      }
    } catch (error) {
      console.error("Error saving artists:", error);
    }
  };

  const handleComplete = async () => {
    try {
      // Save preferences and mark onboarding complete
      await fetch("/api/user/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          default_location: selectedLocation || null,
          onboarding_completed: true,
        }),
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      // Continue anyway - don't block user from using the app
    }

    router.push("/dashboard");
  };

  const connectedCount = services.filter((s) => s.connected).length;

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Step {step} of 2</span>
          <span className="text-sm text-gray-400">
            {step === 1 ? "Connect Music" : "Set Location"}
          </span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-blue-600 transition-all duration-300"
            style={{ width: `${step * 50}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
        {step === 1 ? (
          <>
            {!showManualEntry ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Music className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Connect your music
                  </h1>
                  <p className="text-gray-400">
                    We&apos;ll use your listening history to find concerts you&apos;ll love
                  </p>
                </div>

                {/* Music Services */}
                <div className="space-y-3 mb-8">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => !service.connected && handleConnectService(service.id)}
                      disabled={service.connected || connecting === service.id}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                        service.connected
                          ? "bg-green-500/20 border-green-500/50"
                          : "bg-white/5 border-white/20 hover:bg-white/10"
                      }`}
                    >
                      <Image
                        src={service.icon}
                        alt={service.name}
                        width={32}
                        height={32}
                        className="rounded"
                      />
                      <span className="flex-1 text-left text-white font-medium">
                        {service.name}
                      </span>
                      {connecting === service.id ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : service.connected ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Continue */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowManualEntry(true)}
                    className="flex-1 text-gray-400 hover:text-white py-3 px-4 rounded-xl font-medium transition-colors"
                  >
                    Enter artists manually
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={connectedCount === 0}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      connectedCount > 0
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-90"
                        : "bg-white/10 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Continue
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                {connectedCount === 0 && (
                  <p className="text-xs text-gray-500 text-center mt-4">
                    Connect a service or enter artists manually to get personalized recommendations
                  </p>
                )}
                
                {/* Skip option */}
                <button
                  onClick={() => setStep(2)}
                  className="w-full text-xs text-gray-600 hover:text-gray-400 mt-4 py-2 transition-colors"
                >
                  Skip for now — I&apos;ll browse all concerts
                </button>
              </>
            ) : (
              <>
                {/* Manual Artist Entry */}
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Add your favorite artists
                  </h1>
                  <p className="text-gray-400">
                    Search and add artists you&apos;d like to see live
                  </p>
                </div>

                {/* Artist Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={artistSearch}
                    onChange={(e) => handleArtistSearch(e.target.value)}
                    placeholder="Search for an artist..."
                    className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  {isSearchingArtists && (
                    <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                  )}

                  {/* Search Results */}
                  {artistResults.length > 0 && (
                    <div className="absolute w-full mt-2 bg-gray-800 rounded-xl border border-white/20 overflow-hidden z-10 max-h-64 overflow-y-auto">
                      {artistResults.map((artist) => (
                        <button
                          key={artist.id}
                          onClick={() => handleSelectArtist(artist)}
                          className="w-full px-4 py-4 text-left hover:bg-white/10 flex items-center gap-3 min-h-[56px] active:bg-white/20"
                        >
                          {artist.imageUrl ? (
                            <Image
                              src={artist.imageUrl}
                              alt={artist.name}
                              width={40}
                              height={40}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{artist.name}</p>
                            {artist.genres.length > 0 && (
                              <p className="text-gray-400 text-sm truncate">
                                {artist.genres.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Artists */}
                {selectedArtists.length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm text-gray-400 mb-2">
                      Selected ({selectedArtists.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedArtists.map((artist) => (
                        <div
                          key={artist.id}
                          className="flex items-center gap-2 bg-white/10 rounded-full pl-1 pr-3 py-1"
                        >
                          {artist.imageUrl ? (
                            <Image
                              src={artist.imageUrl}
                              alt={artist.name}
                              width={24}
                              height={24}
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                              <User className="w-3 h-3 text-gray-400" />
                            </div>
                          )}
                          <span className="text-white text-sm">{artist.name}</span>
                          <button
                            onClick={() => handleRemoveArtist(artist.id)}
                            className="text-gray-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowManualEntry(false)}
                    className="text-gray-400 hover:text-white py-3 px-4 rounded-xl font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSaveArtists}
                    disabled={selectedArtists.length === 0}
                    className={`flex-1 py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${
                      selectedArtists.length > 0
                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:opacity-90"
                        : "bg-white/10 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Continue with {selectedArtists.length} artist{selectedArtists.length !== 1 ? "s" : ""}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-gray-500 text-center mt-4">
                  Add at least one artist to continue
                </p>
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Set your location
              </h1>
              <p className="text-gray-400">
                We&apos;ll show you concerts near this location by default
              </p>
            </div>

            {/* Location Search */}
            <div className="relative mb-8">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationSearch(e.target.value)}
                placeholder="Search for a city..."
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {isSearching && (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
              )}

              {/* Results */}
              {locationResults.length > 0 && (
                <div className="absolute w-full mt-2 bg-gray-800 rounded-xl border border-white/20 overflow-hidden z-10">
                  {locationResults.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {loc.city}, {loc.state || loc.country}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedLocation && (
              <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 mb-8 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-white">{selectedLocation.city}</span>
              </div>
            )}

            {/* Complete */}
            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white py-3 px-4 rounded-xl font-medium transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Start exploring
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
