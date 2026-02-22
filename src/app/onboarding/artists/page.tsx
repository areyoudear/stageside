"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  X,
  Plus,
  Check,
  Loader2,
  Music,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
  popularity?: number;
}

const MIN_ARTISTS = 5;
const MAX_ARTISTS = 20;

export default function ArtistsPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);

  // Load saved artists
  useEffect(() => {
    const saved = localStorage.getItem("stageside_onboarding_artists");
    if (saved) {
      setSelectedArtists(JSON.parse(saved));
    }
  }, []);

  // Save artists on change
  useEffect(() => {
    localStorage.setItem(
      "stageside_onboarding_artists",
      JSON.stringify(selectedArtists)
    );
  }, [selectedArtists]);

  // Search artists using existing API
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const searchArtists = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/artists/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        const data = await res.json();

        // Filter out already selected artists
        const filtered = (data.artists || []).filter(
          (artist: Artist) =>
            !selectedArtists.some(
              (s) => s.name.toLowerCase() === artist.name.toLowerCase()
            )
        );

        setResults(filtered);
      } catch (error) {
        console.error("Artist search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    searchArtists();
  }, [debouncedQuery, selectedArtists]);

  const addArtist = useCallback(
    (artist: Artist) => {
      if (selectedArtists.length >= MAX_ARTISTS) return;
      if (
        selectedArtists.some(
          (s) => s.name.toLowerCase() === artist.name.toLowerCase()
        )
      )
        return;

      setSelectedArtists((prev) => [...prev, artist]);
      setQuery("");
      setResults([]);
      setShowResults(false);
      inputRef.current?.focus();
    },
    [selectedArtists]
  );

  const removeArtist = useCallback((artistId: string) => {
    setSelectedArtists((prev) => prev.filter((a) => a.id !== artistId));
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim() && results.length > 0) {
      e.preventDefault();
      addArtist(results[0]);
    }
  };

  const progress = Math.min(selectedArtists.length / MIN_ARTISTS, 1);
  const remaining = Math.max(0, MIN_ARTISTS - selectedArtists.length);
  const canContinue = selectedArtists.length >= MIN_ARTISTS;

  const handleContinue = () => {
    if (!canContinue) return;
    router.push("/onboarding/culture");
  };

  const handleBack = () => {
    router.push("/onboarding/preferences");
  };

  return (
    <div className="max-w-xl mx-auto pb-32">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 mb-6">
          <Music className="w-10 h-10 text-pink-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Who do you love?
        </h1>
        <p className="text-zinc-400 text-lg">
          Add at least {MIN_ARTISTS} artists you'd see live
        </p>
      </motion.div>

      {/* Progress Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/50 rounded-2xl p-5 border border-zinc-800 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-400">
            {selectedArtists.length} artist{selectedArtists.length !== 1 ? "s" : ""}{" "}
            added
          </span>
          {remaining > 0 ? (
            <span className="text-sm text-amber-400 font-medium flex items-center gap-1">
              <Plus className="w-4 h-4" />
              Add {remaining} more
            </span>
          ) : (
            <span className="text-sm text-green-400 font-medium flex items-center gap-1">
              <Check className="w-4 h-4" />
              Ready to continue
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progress >= 1
                ? "bg-gradient-to-r from-green-500 to-emerald-500"
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            )}
          />
        </div>
      </motion.div>

      {/* Search Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search for an artist..."
            className={cn(
              "w-full pl-12 pr-4 py-4 rounded-xl text-lg",
              "bg-zinc-900 border-2 border-zinc-700",
              "text-white placeholder:text-zinc-500",
              "focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20",
              "transition-all duration-200"
            )}
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 animate-spin" />
          )}
        </div>

        {/* Search Results Dropdown */}
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-50 max-h-80 overflow-y-auto"
            >
              {results.map((artist, index) => (
                <motion.button
                  key={artist.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => addArtist(artist)}
                  className="w-full px-4 py-3 flex items-center gap-4 hover:bg-zinc-800 transition-colors text-left group"
                >
                  {/* Artist Image */}
                  {artist.imageUrl ? (
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 shrink-0">
                      <Image
                        src={artist.imageUrl}
                        alt={artist.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <User className="w-6 h-6 text-zinc-600" />
                    </div>
                  )}

                  {/* Artist Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{artist.name}</p>
                    {artist.genres && artist.genres.length > 0 && (
                      <p className="text-sm text-zinc-500 truncate">
                        {artist.genres.slice(0, 2).join(" • ")}
                      </p>
                    )}
                  </div>

                  {/* Add icon */}
                  <Plus className="w-5 h-5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click away to close */}
        {showResults && results.length > 0 && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowResults(false)}
          />
        )}
      </motion.div>

      {/* Selected Artists Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        {selectedArtists.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {selectedArtists.map((artist, index) => (
                <motion.div
                  key={artist.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.02 }}
                  className="relative group"
                >
                  <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3 flex flex-col items-center text-center">
                    {/* Artist Image */}
                    {artist.imageUrl ? (
                      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-zinc-800 mb-3">
                        <Image
                          src={artist.imageUrl}
                          alt={artist.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-3">
                        <User className="w-8 h-8 text-zinc-600" />
                      </div>
                    )}

                    {/* Artist Name */}
                    <p className="text-sm font-medium text-white truncate w-full">
                      {artist.name}
                    </p>
                    {artist.genres && artist.genres.length > 0 && (
                      <p className="text-xs text-zinc-500 truncate w-full mt-0.5">
                        {artist.genres[0]}
                      </p>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => removeArtist(artist.id)}
                      className={cn(
                        "absolute -top-2 -right-2 w-6 h-6 rounded-full",
                        "bg-zinc-700 hover:bg-red-500 text-white",
                        "flex items-center justify-center",
                        "opacity-0 group-hover:opacity-100 transition-all",
                        "shadow-lg"
                      )}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12 border-2 border-dashed border-zinc-800 rounded-xl"
          >
            <Music className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">Start typing to search for artists</p>
            <p className="text-zinc-600 text-sm mt-1">
              These artists will shape your recommendations
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Suggestions */}
      {selectedArtists.length < 3 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl p-4 border border-cyan-500/20"
        >
          <p className="text-sm text-cyan-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>
              <strong>Tip:</strong> Add artists across different genres for better
              recommendations
            </span>
          </p>
        </motion.div>
      )}

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={handleBack}
            className="px-6 py-4 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleContinue}
            disabled={!canContinue}
            className={cn(
              "flex-1 py-4 px-6 rounded-xl font-semibold text-lg",
              "flex items-center justify-center gap-3",
              "transition-all duration-300",
              canContinue
                ? "bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/25"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
