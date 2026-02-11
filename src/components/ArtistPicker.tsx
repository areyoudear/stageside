"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Music, Plus, Loader2, TrendingUp } from "lucide-react";
import { track } from "@/lib/analytics";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  genres: string[];
}

interface ArtistPickerProps {
  selectedArtists: Artist[];
  onArtistsChange: (artists: Artist[]) => void;
  maxArtists?: number;
  minArtists?: number;
}

export function ArtistPicker({
  selectedArtists,
  onArtistsChange,
  maxArtists = 10,
  minArtists = 3,
}: ArtistPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Artist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Track search queries (debounced separately)
  const lastTrackedQuery = useRef<string>("");
  
  // Search for artists
  const searchArtists = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    // Track search query (only if significantly different from last tracked)
    if (searchQuery.length >= 3 && searchQuery !== lastTrackedQuery.current) {
      lastTrackedQuery.current = searchQuery;
      track('artist_search', { query: searchQuery });
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/artists/search?q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();
      setResults(data.artists || []);
    } catch (error) {
      console.error("Error searching artists:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchArtists(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, searchArtists]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addArtist = (artist: Artist, source: 'search' | 'trending' = 'search') => {
    if (selectedArtists.length >= maxArtists) return;
    if (selectedArtists.find((a) => a.id === artist.id)) return;

    track('artist_added', { 
      artist_name: artist.name, 
      artist_id: artist.id,
      source 
    });

    // Track genres detected when we have enough artists
    const newArtists = [...selectedArtists, artist];
    const allGenres = Array.from(new Set(newArtists.flatMap((a) => a.genres)));
    if (allGenres.length > 0 && newArtists.length >= 3) {
      track('genre_detected', { genres: allGenres });
    }

    onArtistsChange(newArtists);
    setQuery("");
    setResults([]);
    setShowResults(false);
    inputRef.current?.focus();
  };

  const removeArtist = (artistId: string) => {
    const artist = selectedArtists.find((a) => a.id === artistId);
    if (artist) {
      track('artist_removed', { 
        artist_name: artist.name, 
        artist_id: artist.id 
      });
    }
    onArtistsChange(selectedArtists.filter((a) => a.id !== artistId));
  };

  const canAddMore = selectedArtists.length < maxArtists;
  const hasEnough = selectedArtists.length >= minArtists;

  return (
    <div className="space-y-4">
      {/* Selected Artists */}
      {selectedArtists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedArtists.map((artist) => (
            <div
              key={artist.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200"
            >
              {artist.imageUrl ? (
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <Music className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">{artist.name}</span>
              <button
                onClick={() => removeArtist(artist.id)}
                className="ml-1 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      {canAddMore && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowResults(true);
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search for artists..."
              className="w-full pl-10 pr-10 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {showResults && (query.length >= 2 || results.length > 0) && (
            <div
              ref={resultsRef}
              className="absolute z-50 w-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden"
            >
              {results.length > 0 ? (
                <ul className="max-h-64 overflow-y-auto">
                  {results
                    .filter((a) => !selectedArtists.find((s) => s.id === a.id))
                    .map((artist) => (
                      <li key={artist.id}>
                        <button
                          onClick={() => addArtist(artist)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left"
                        >
                          {artist.imageUrl ? (
                            <img
                              src={artist.imageUrl}
                              alt={artist.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                              <Music className="w-5 h-5 text-zinc-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">
                              {artist.name}
                            </p>
                            {artist.genres.length > 0 && (
                              <p className="text-sm text-zinc-500 truncate">
                                {artist.genres.slice(0, 2).join(", ")}
                              </p>
                            )}
                          </div>
                          <Plus className="w-5 h-5 text-zinc-500" />
                        </button>
                      </li>
                    ))}
                </ul>
              ) : query.length >= 2 && !isSearching ? (
                <div className="px-4 py-6 text-center text-zinc-500">
                  No artists found for &quot;{query}&quot;
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-500">
          {selectedArtists.length === 0
            ? `Pick at least ${minArtists} artists`
            : !hasEnough
            ? `Add ${minArtists - selectedArtists.length} more`
            : ""}
        </span>
        {selectedArtists.length > 0 && (
          <button
            onClick={() => onArtistsChange([])}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}

// Trending artists chips for quick-add
interface TrendingArtistChipsProps {
  onSelect: (artist: Artist) => void;
  exclude?: string[];
  location?: string;
}

export function TrendingArtistChips({
  onSelect,
  exclude = [],
  location = "near you",
}: TrendingArtistChipsProps) {
  // These would ideally come from an API, but static for now
  const trendingArtists: Artist[] = [
    { id: "taylor-swift", name: "Taylor Swift", imageUrl: null, genres: ["Pop"] },
    { id: "drake", name: "Drake", imageUrl: null, genres: ["Hip-Hop", "R&B"] },
    { id: "the-weeknd", name: "The Weeknd", imageUrl: null, genres: ["R&B", "Pop"] },
    { id: "bad-bunny", name: "Bad Bunny", imageUrl: null, genres: ["Reggaeton", "Latin"] },
    { id: "sza", name: "SZA", imageUrl: null, genres: ["R&B", "Soul"] },
    { id: "kendrick-lamar", name: "Kendrick Lamar", imageUrl: null, genres: ["Hip-Hop", "Rap"] },
    { id: "dua-lipa", name: "Dua Lipa", imageUrl: null, genres: ["Pop", "Dance"] },
    { id: "tyler-creator", name: "Tyler, The Creator", imageUrl: null, genres: ["Hip-Hop", "Alternative"] },
  ];

  const available = trendingArtists.filter((a) => !exclude.includes(a.id));

  if (available.length === 0) return null;

  const handleTrendingClick = (artist: Artist) => {
    track('trending_artist_clicked', { 
      artist_name: artist.name, 
      artist_id: artist.id 
    });
    onSelect(artist);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <TrendingUp className="w-4 h-4 text-green-500" />
        <span>Trending {location}:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {available.slice(0, 5).map((artist) => (
          <button
            key={artist.id}
            onClick={() => handleTrendingClick(artist)}
            className="px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-green-500/50 text-zinc-300 hover:text-white text-sm transition-all"
          >
            + {artist.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// Re-export for backward compatibility
export function PopularArtistSuggestions({
  onSelect,
  exclude = [],
}: {
  onSelect: (artist: Artist) => void;
  exclude?: string[];
}) {
  return <TrendingArtistChips onSelect={onSelect} exclude={exclude} />;
}
