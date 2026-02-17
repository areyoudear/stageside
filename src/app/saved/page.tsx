"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Music, ArrowRight, Heart, Check, Filter, Users, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { cn } from "@/lib/utils";
import type { Concert } from "@/lib/ticketmaster";

type FilterType = "all" | "hearted" | "going";

export default function SavedConcertsPage() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [goingIds, setGoingIds] = useState<string[]>([]);
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    // Load saved and going concert IDs from localStorage
    const saved = JSON.parse(localStorage.getItem('savedConcerts') || '[]');
    const going = JSON.parse(localStorage.getItem('goingConcerts') || '[]');
    setSavedIds(saved);
    setGoingIds(going);
    
    // Combine all unique IDs
    const allIds = Array.from(new Set([...saved, ...going]));
    
    if (allIds.length === 0) {
      setIsLoading(false);
      return;
    }

    // Fetch full concert details
    fetchConcerts(allIds);
  }, []);

  const fetchConcerts = async (ids: string[]) => {
    try {
      const res = await fetch('/api/concerts/by-ids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Mark saved/going status on each concert
        const concertsWithStatus = data.concerts.map((c: Concert) => ({
          ...c,
          isSaved: savedIds.includes(c.id),
        }));
        setConcerts(concertsWithStatus);
      }
    } catch (error) {
      console.error("Error fetching concerts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter concerts based on selection
  const filteredConcerts = useMemo(() => {
    switch (filter) {
      case "hearted":
        return concerts.filter(c => savedIds.includes(c.id));
      case "going":
        return concerts.filter(c => goingIds.includes(c.id));
      default:
        return concerts;
    }
  }, [concerts, savedIds, goingIds, filter]);

  const handleSaveConcert = (concertId: string) => {
    setConcerts(prev => prev.map(c => c.id === concertId ? { ...c, isSaved: true } : c));
    const newSaved = [...savedIds, concertId];
    setSavedIds(newSaved);
    localStorage.setItem('savedConcerts', JSON.stringify(newSaved));
  };

  const handleUnsaveConcert = (concertId: string) => {
    setConcerts(prev => prev.map(c => c.id === concertId ? { ...c, isSaved: false } : c));
    const newSaved = savedIds.filter(id => id !== concertId);
    setSavedIds(newSaved);
    localStorage.setItem('savedConcerts', JSON.stringify(newSaved));
  };

  const handleGoing = (concertId: string) => {
    const newGoing = [...goingIds, concertId];
    setGoingIds(newGoing);
    localStorage.setItem('goingConcerts', JSON.stringify(newGoing));
  };

  const handleNotGoing = (concertId: string) => {
    const newGoing = goingIds.filter(id => id !== concertId);
    setGoingIds(newGoing);
    localStorage.setItem('goingConcerts', JSON.stringify(newGoing));
  };

  const clearAll = () => {
    localStorage.setItem('savedConcerts', '[]');
    localStorage.setItem('goingConcerts', '[]');
    setSavedIds([]);
    setGoingIds([]);
    setConcerts([]);
  };

  const heartedCount = savedIds.length;
  const goingCount = goingIds.length;
  const allCount = concerts.length;

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
              <Link href="/groups" className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Friends</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-400 mb-2">
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">My Concerts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              Your saved concerts
            </h1>
            <p className="text-zinc-400">
              {allCount === 0 
                ? "Save concerts you're interested in to find them later."
                : `${heartedCount} hearted, ${goingCount} going`
              }
            </p>
          </div>
          {allCount > 0 && (
            <Button
              variant="outline"
              onClick={clearAll}
              className="border-zinc-700 text-zinc-400 hover:text-white"
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Filter Tabs */}
        {allCount > 0 && (
          <div className="mb-6 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-zinc-500 mr-1">
              <Filter className="w-4 h-4 inline mr-1" />
              Filter:
            </span>
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === "all"
                  ? "bg-cyan-500 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              All
              <span className="ml-1 text-xs opacity-70">({allCount})</span>
            </button>
            <button
              onClick={() => setFilter("hearted")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === "hearted"
                  ? "bg-red-500 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              )}
            >
              <Heart className="w-3.5 h-3.5" />
              Hearted
              <span className="ml-1 text-xs opacity-70">({heartedCount})</span>
            </button>
            <button
              onClick={() => setFilter("going")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                filter === "going"
                  ? "bg-green-500 text-white"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              )}
            >
              <Check className="w-3.5 h-3.5" />
              Going
              <span className="ml-1 text-xs opacity-70">({goingCount})</span>
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ConcertCardSkeleton key={i} />
            ))}
          </div>
        ) : allCount === 0 ? (
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
        ) : filteredConcerts.length === 0 ? (
          // No results for this filter
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
              {filter === "hearted" ? (
                <Heart className="w-10 h-10 text-zinc-700" />
              ) : (
                <Check className="w-10 h-10 text-zinc-700" />
              )}
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              No {filter === "hearted" ? "hearted" : "going"} concerts
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              {filter === "hearted" 
                ? "Tap the heart icon on concerts you're interested in."
                : "Tap the checkmark icon on concerts you're definitely going to."
              }
            </p>
            <button
              onClick={() => setFilter("all")}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              Show all saved concerts instead
            </button>
          </div>
        ) : (
          // Concert Grid
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConcerts.map((concert) => (
              <ConcertCard
                key={concert.id}
                concert={concert}
                onSave={handleSaveConcert}
                onUnsave={handleUnsaveConcert}
                onGoing={handleGoing}
                onNotGoing={handleNotGoing}
                isAuthenticated={true}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
