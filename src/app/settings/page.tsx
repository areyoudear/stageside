"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Music,
  Loader2,
  ArrowLeft,
  Save,
  LogOut,
  User,
  Heart,
  Link2,
  Check,
  AlertCircle,
  Camera,
  X,
  Bell,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtistPicker } from "@/components/ArtistPicker";
import { ConnectedServicesPanel } from "@/components/ConnectedServicesPanel";
import { track } from "@/lib/analytics";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

// Common music genres for quick selection
const POPULAR_GENRES = [
  "Pop",
  "Rock",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Indie",
  "Jazz",
  "Classical",
  "Country",
  "Metal",
  "Folk",
  "Latin",
  "Reggae",
  "Blues",
  "Punk",
  "Soul",
  "Alternative",
  "Dance",
];

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationLocation, setNotificationLocation] = useState("");
  const [notificationLocationCoords, setNotificationLocationCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [notificationRadius, setNotificationRadius] = useState(50);
  const [notificationFrequency, setNotificationFrequency] = useState<"daily" | "weekly" | "instant">("daily");
  const [minMatchScore, setMinMatchScore] = useState(0);
  // Status filter removed - users want notifications for ALL new concerts, not ones they've already marked
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notificationsSaveStatus, setNotificationsSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  // Load existing preferences
  useEffect(() => {
    if (status === "authenticated") {
      loadPreferences();
      loadNotificationPreferences();
    }
  }, [status]);

  // Handle post-connection sync: poll for new artists after service connection
  useEffect(() => {
    const connectedService = searchParams.get("connected");
    if (connectedService && status === "authenticated") {
      // Service just connected - sync runs async in background
      // Poll for new artists after short delays to catch when sync completes
      const delays = [2000, 5000, 10000]; // 2s, 5s, 10s
      
      delays.forEach((delay) => {
        setTimeout(() => {
          loadPreferences();
        }, delay);
      });

      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("connected");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, status]);

  const loadNotificationPreferences = async () => {
    setIsLoadingNotifications(true);
    try {
      const response = await fetch("/api/notifications/filters");
      if (response.ok) {
        const data = await response.json();
        if (data.notification) {
          setNotificationsEnabled(data.notification.enabled);
          setNotificationLocation(data.notification.locationName);
          setNotificationLocationCoords({
            lat: data.notification.locationLat,
            lng: data.notification.locationLng,
          });
          setNotificationRadius(data.notification.radiusMiles);
          setNotificationFrequency(data.notification.frequency);
          setMinMatchScore(data.notification.minMatchScore || 0);
          // statusFilter removed from UI
        }
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const saveNotificationPreferences = async () => {
    if (!notificationLocation || !notificationLocationCoords) {
      alert("Please enter a location first");
      return;
    }

    setIsSavingNotifications(true);
    setNotificationsSaveStatus("idle");

    try {
      const response = await fetch("/api/notifications/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: notificationLocation,
          locationLat: notificationLocationCoords.lat,
          locationLng: notificationLocationCoords.lng,
          radiusMiles: notificationRadius,
          enabled: notificationsEnabled,
          frequency: notificationFrequency,
          minMatchScore: minMatchScore,
        }),
      });

      if (response.ok) {
        setNotificationsSaveStatus("saved");
        track("notification_preferences_saved", {
          enabled: notificationsEnabled,
          frequency: notificationFrequency,
          radius: notificationRadius,
          minMatchScore: minMatchScore,
        });
        setTimeout(() => setNotificationsSaveStatus("idle"), 3000);
      } else {
        setNotificationsSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      setNotificationsSaveStatus("error");
    } finally {
      setIsSavingNotifications(false);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setNotificationLocation(query);
    if (query.length < 3) return;

    // Use browser geolocation API or a geocoding service
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const results = await response.json();
      if (results.length > 0) {
        setNotificationLocationCoords({
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
        });
        setNotificationLocation(results[0].display_name.split(",").slice(0, 2).join(","));
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
    }
  };

  const useCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setNotificationLocationCoords({ lat: latitude, lng: longitude });
          
          // Reverse geocode to get location name
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const result = await response.json();
            const city = result.address?.city || result.address?.town || result.address?.village || "";
            const state = result.address?.state || "";
            setNotificationLocation(`${city}${state ? `, ${state}` : ""}`);
          } catch {
            setNotificationLocation("Current Location");
          }
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Could not get your location. Please enter it manually.");
        }
      );
    }
  };

  const loadPreferences = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/user/artists");
      if (response.ok) {
        const data = await response.json();
        
        // Load artists
        if (data.artists && Array.isArray(data.artists)) {
          const artists = data.artists.map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: a.name as string,
            imageUrl: (a.image_url as string) || (a.imageUrl as string) || null,
            genres: (a.genres as string[]) || [],
          }));
          setSelectedArtists(artists);
        }

        // Load genres (from saved genres, not just artist genres)
        if (data.genres && Array.isArray(data.genres)) {
          setSelectedGenres(data.genres);
        }
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load avatar from database (more reliable than session which may be stale)
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!session?.user?.id) return;
      
      try {
        // Try to get latest avatar from database via API
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.avatar_url) {
            setAvatarUrl(data.avatar_url);
            return;
          }
        }
      } catch (error) {
        console.warn("Could not fetch avatar from API:", error);
      }
      
      // Fall back to session image
      if (session?.user?.image) {
        setAvatarUrl(session.user.image);
      }
    };
    
    fetchAvatar();
  }, [session]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const response = await fetch("/api/user/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64 }),
        });

        if (response.ok) {
          const data = await response.json();
          setAvatarUrl(data.avatarUrl);
          track("avatar_uploaded", {});
        } else {
          const error = await response.json();
          alert(error.error || "Failed to upload avatar");
        }

        setIsUploadingAvatar(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar");
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm("Remove your profile picture?")) return;

    setIsUploadingAvatar(true);
    try {
      const response = await fetch("/api/user/avatar", { method: "DELETE" });
      if (response.ok) {
        setAvatarUrl(null);
        track("avatar_removed", {});
      }
    } catch (error) {
      console.error("Error removing avatar:", error);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleArtistsChange = (artists: Artist[]) => {
    setSelectedArtists(artists);
    setHasChanges(true);
    setSaveStatus("idle");

    // Auto-update genres based on artists
    const artistGenres = Array.from(new Set(artists.flatMap((a) => a.genres)));
    setSelectedGenres((prev) => {
      const combined = Array.from(new Set([...prev, ...artistGenres]));
      return combined;
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) => {
      const updated = prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : [...prev, genre];
      setHasChanges(true);
      setSaveStatus("idle");
      return updated;
    });
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/user/artists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          artists: selectedArtists,
          genres: selectedGenres,
        }),
      });

      if (response.ok) {
        setSaveStatus("saved");
        setHasChanges(false);
        track("settings_saved", {
          artist_count: selectedArtists.length,
          genre_count: selectedGenres.length,
        });

        // Clear saved status after 3 seconds
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = () => {
    track("user_signed_out", {});
    signOut({ callbackUrl: "/" });
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
              </Link>
              <h1 className="text-xl font-bold text-white">Settings</h1>
            </div>

            <Button
              onClick={savePreferences}
              disabled={!hasChanges || isSaving}
              className={`${
                saveStatus === "saved"
                  ? "bg-green-600 hover:bg-green-700"
                  : saveStatus === "error"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-cyan-600 hover:bg-cyan-700"
              }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saveStatus === "saved" ? (
                <Check className="w-4 h-4 mr-2" />
              ) : saveStatus === "error" ? (
                <AlertCircle className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saveStatus === "saved" ? "Saved!" : saveStatus === "error" ? "Error" : "Save"}
            </Button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Profile Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <User className="w-5 h-5 text-cyan-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Profile</h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={session.user?.name || "Profile"}
                  className="w-20 h-20 rounded-full object-cover border-2 border-zinc-700"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-2xl font-bold text-white">
                    {(session.user?.name || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Upload overlay */}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                {isUploadingAvatar ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : (
                  <Camera className="w-6 h-6 text-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                />
              </label>

              {/* Remove button */}
              {avatarUrl && !isUploadingAvatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div>
              <p className="text-white font-medium text-lg">{session.user?.name || "User"}</p>
              <p className="text-zinc-500 text-sm">{session.user?.email}</p>
              {session.user?.username && (
                <p className="text-zinc-600 text-sm">@{session.user.username}</p>
              )}
              <p className="text-xs text-zinc-600 mt-1">Hover on photo to change</p>
            </div>
          </div>
        </section>

        {/* Favorite Artists Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Heart className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Favorite Artists</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-6">
            Add artists you love to get personalized concert recommendations — no streaming
            service needed.
          </p>

          <ArtistPicker
            selectedArtists={selectedArtists}
            onArtistsChange={handleArtistsChange}
            maxArtists={20}
            minArtists={0}
          />
        </section>

        {/* Favorite Genres Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Music className="w-5 h-5 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Favorite Genres</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-6">
            Select genres you enjoy. We&apos;ll recommend concerts that match your taste.
          </p>

          <div className="flex flex-wrap gap-2">
            {POPULAR_GENRES.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-green-500/20 border border-green-500/50 text-green-300"
                      : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {genre}
                </button>
              );
            })}
          </div>

          {selectedGenres.length > 0 && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                {selectedGenres.length} genre{selectedGenres.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          )}
        </section>

        {/* Connected Services Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Link2 className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Connected Services</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-6">
            Connect your music streaming accounts for automatic taste detection.
          </p>

          <ConnectedServicesPanel />
        </section>

        {/* Notification Preferences Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Bell className="w-5 h-5 text-orange-500" />
            </div>
            <h2 className="text-lg font-semibold text-white">Email Notifications</h2>
          </div>
          <p className="text-zinc-500 text-sm mb-6">
            Get notified when new concerts matching your taste are announced near you.
          </p>

          {isLoadingNotifications ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Notifications</p>
                  <p className="text-zinc-500 text-sm">
                    Receive email alerts for new concerts
                  </p>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    notificationsEnabled ? "bg-cyan-500" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      notificationsEnabled ? "translate-x-6" : ""
                    }`}
                  />
                </button>
              </div>

              {notificationsEnabled && (
                <>
                  {/* Location Input */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Location
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notificationLocation}
                        onChange={(e) => handleLocationSearch(e.target.value)}
                        placeholder="Enter city or zip code..."
                        className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <Button
                        variant="outline"
                        onClick={useCurrentLocation}
                        className="border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600"
                      >
                        <MapPin className="w-4 h-4" />
                      </Button>
                    </div>
                    {notificationLocationCoords && (
                      <p className="text-xs text-zinc-500 mt-1">
                        📍 Location set
                      </p>
                    )}
                  </div>

                  {/* Radius Slider */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Search Radius: {notificationRadius} miles
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="10"
                      value={notificationRadius}
                      onChange={(e) => setNotificationRadius(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                      <span>10 mi</span>
                      <span>200 mi</span>
                    </div>
                  </div>

                  {/* Minimum Match Score */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Minimum Match Score: {minMatchScore > 0 ? `${minMatchScore}%+` : "Any"}
                    </label>
                    <p className="text-zinc-500 text-xs mb-2">
                      Only notify for concerts with artists you&apos;ll vibe with
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="10"
                      value={minMatchScore}
                      onChange={(e) => setMinMatchScore(parseInt(e.target.value))}
                      className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between text-xs text-zinc-500 mt-1">
                      <span>Any match</span>
                      <span>High vibe only</span>
                    </div>
                  </div>

                  {/* Frequency Selection */}
                  <div>
                    <label className="block text-white font-medium mb-2">
                      Notification Frequency
                    </label>
                    <div className="flex gap-2">
                      {(["daily", "weekly"] as const).map((freq) => (
                        <button
                          key={freq}
                          onClick={() => setNotificationFrequency(freq)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            notificationFrequency === freq
                              ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300"
                              : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:border-zinc-600"
                          }`}
                        >
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={saveNotificationPreferences}
                    disabled={isSavingNotifications || !notificationLocationCoords}
                    className={`w-full ${
                      notificationsSaveStatus === "saved"
                        ? "bg-green-600 hover:bg-green-700"
                        : notificationsSaveStatus === "error"
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-cyan-600 hover:bg-cyan-700"
                    }`}
                  >
                    {isSavingNotifications ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : notificationsSaveStatus === "saved" ? (
                      <Check className="w-4 h-4 mr-2" />
                    ) : notificationsSaveStatus === "error" ? (
                      <AlertCircle className="w-4 h-4 mr-2" />
                    ) : (
                      <Bell className="w-4 h-4 mr-2" />
                    )}
                    {notificationsSaveStatus === "saved"
                      ? "Saved!"
                      : notificationsSaveStatus === "error"
                      ? "Error"
                      : "Save Notification Settings"}
                  </Button>
                </>
              )}
            </div>
          )}
        </section>

        {/* Sign Out Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-medium">Sign Out</h3>
              <p className="text-zinc-500 text-sm">
                Sign out of your Stageside account on this device.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
