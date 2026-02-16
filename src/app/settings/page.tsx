"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
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

  // State
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [hasChanges, setHasChanges] = useState(false);

  // Load existing preferences
  useEffect(() => {
    if (status === "authenticated") {
      loadPreferences();
    }
  }, [status]);

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
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || "Profile"}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <User className="w-8 h-8 text-zinc-500" />
              </div>
            )}
            <div>
              <p className="text-white font-medium">{session.user?.name || "User"}</p>
              <p className="text-zinc-500 text-sm">{session.user?.email}</p>
              {session.user?.username && (
                <p className="text-zinc-600 text-sm">@{session.user.username}</p>
              )}
            </div>
          </div>
        </section>

        {/* Favorite Artists Section */}
        <section className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Heart className="w-5 h-5 text-purple-500" />
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
