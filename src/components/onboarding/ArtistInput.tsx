"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Plus, Check, Loader2, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface ArtistInputProps {
  artists: string[];
  onChange: (artists: string[]) => void;
  minArtists?: number;
  maxArtists?: number;
}

interface SearchResult {
  name: string;
  image?: string;
  genres?: string[];
}

export function ArtistInput({ 
  artists, 
  onChange, 
  minArtists = 5,
  maxArtists = 20 
}: ArtistInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedQuery = useDebounce(query, 300);
  
  // Search for artists
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }
    
    const searchArtists = async () => {
      setIsSearching(true);
      try {
        // Use iTunes API for artist search (free, no auth)
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(debouncedQuery)}&entity=musicArtist&limit=8`
        );
        const data = await res.json();
        
        const searchResults: SearchResult[] = data.results.map((r: {
          artistName: string;
          primaryGenreName?: string;
        }) => ({
          name: r.artistName,
          genres: r.primaryGenreName ? [r.primaryGenreName] : [],
        }));
        
        // Filter out already added artists
        const filtered = searchResults.filter(
          r => !artists.some(a => a.toLowerCase() === r.name.toLowerCase())
        );
        
        setResults(filtered);
      } catch (error) {
        console.error("Artist search error:", error);
      } finally {
        setIsSearching(false);
      }
    };
    
    searchArtists();
  }, [debouncedQuery, artists]);
  
  const addArtist = useCallback((name: string) => {
    if (artists.length >= maxArtists) return;
    if (artists.some(a => a.toLowerCase() === name.toLowerCase())) return;
    
    onChange([...artists, name]);
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  }, [artists, maxArtists, onChange]);
  
  const removeArtist = useCallback((name: string) => {
    onChange(artists.filter(a => a !== name));
  }, [artists, onChange]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && query.trim() && results.length > 0) {
      e.preventDefault();
      addArtist(results[0].name);
    }
  };
  
  const progress = Math.min(artists.length / minArtists, 1);
  const remaining = Math.max(0, minArtists - artists.length);
  
  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-400">
            {artists.length} artist{artists.length !== 1 ? "s" : ""} added
          </span>
          {remaining > 0 ? (
            <span className="text-sm text-amber-400">
              Add {remaining} more
            </span>
          ) : (
            <span className="text-sm text-green-400 flex items-center gap-1">
              <Check className="w-4 h-4" />
              Ready to continue
            </span>
          )}
        </div>
        
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              progress >= 1 
                ? "bg-gradient-to-r from-green-500 to-emerald-500" 
                : "bg-gradient-to-r from-amber-500 to-orange-500"
            )}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      
      {/* Search input */}
      <div className="relative">
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
            className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-700 rounded-xl 
              text-white placeholder:text-zinc-500
              focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50
              transition-all"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 animate-spin" />
          )}
        </div>
        
        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-xl z-50">
            {results.map((result) => (
              <button
                key={result.name}
                onClick={() => addArtist(result.name)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                  <Music className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{result.name}</p>
                  {result.genres && result.genres.length > 0 && (
                    <p className="text-xs text-zinc-500 truncate">
                      {result.genres.join(", ")}
                    </p>
                  )}
                </div>
                <Plus className="w-5 h-5 text-cyan-400" />
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Selected artists */}
      {artists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {artists.map((artist) => (
            <div
              key={artist}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700 group"
            >
              <span className="text-sm text-white">{artist}</span>
              <button
                onClick={() => removeArtist(artist)}
                className="p-0.5 rounded-full hover:bg-zinc-700 text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Empty state */}
      {artists.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Start typing to search for artists</p>
        </div>
      )}
      
      {/* Click away to close */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
