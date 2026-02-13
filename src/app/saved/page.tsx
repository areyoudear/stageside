"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Music, ArrowRight, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SavedConcertsPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved concert IDs from localStorage
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    setSavedIds(saved);
    setIsLoading(false);
  }, []);

  const clearAll = () => {
    localStorage.setItem('savedConcerts', '[]');
    setSavedIds([]);
  };

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

            <div className="flex items-center gap-4">
              <Link href="/discover" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Discover
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">Saved Concerts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Your saved concerts
            </h1>
            <p className="text-zinc-400">
              {savedIds.length === 0 
                ? "Save concerts you're interested in to find them later."
                : `You have ${savedIds.length} saved concert${savedIds.length === 1 ? '' : 's'}.`
              }
            </p>
          </div>
          {savedIds.length > 0 && (
            <Button
              variant="outline"
              onClick={clearAll}
              className="border-zinc-700 text-zinc-400 hover:text-white"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : savedIds.length === 0 ? (
          // Empty State
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No saved concerts yet
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              When you find concerts you&apos;re interested in, tap the heart icon to save them here for later.
            </p>
            <Link href="/discover">
              <Button className="bg-green-600 hover:bg-green-500">
                Discover Concerts
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        ) : (
          // Saved concerts info
          <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <Heart className="w-10 h-10 text-red-400 fill-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              {savedIds.length} concert{savedIds.length === 1 ? '' : 's'} saved
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              Your saved concerts are stored locally. To see the full details, head back to the discover page where you found them.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/discover">
                <Button className="bg-green-600 hover:bg-green-500">
                  Find More Concerts
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
            
            {/* List of saved IDs (for debugging/info) */}
            <div className="mt-8 pt-8 border-t border-zinc-800 max-w-md mx-auto">
              <p className="text-xs text-zinc-600 mb-2">Saved concert IDs:</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {savedIds.slice(0, 10).map((id) => (
                  <span 
                    key={id} 
                    className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-500 font-mono"
                  >
                    {id.slice(0, 8)}...
                  </span>
                ))}
                {savedIds.length > 10 && (
                  <span className="px-2 py-1 text-xs text-zinc-600">
                    +{savedIds.length - 10} more
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
