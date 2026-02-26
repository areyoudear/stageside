"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Music, ArrowRight, Heart, Ticket, Users, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConcertCard, ConcertCardSkeleton } from "@/components/ConcertCard";
import { cn } from "@/lib/utils";
import type { Concert } from "@/lib/ticketmaster";
import type { InterestStatus } from "@/components/InterestButtons";

type TabType = "interested" | "going" | "past";

interface ConcertInterest {
  id: string;
  concertId: string;
  status: "interested" | "going";
  concertData: Concert;
  createdAt: string;
  updatedAt: string;
}

export default function SavedConcertsPage() {
  const [interests, setInterests] = useState<ConcertInterest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("interested");

  // Fetch user's concert interests from API
  const fetchInterests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const res = await fetch("/api/concerts/interest", {
        method: "GET",
        credentials: "include",
      });
      
      if (res.status === 401) {
        // Not authenticated - show empty state with CTA
        setInterests([]);
        return;
      }
      
      if (!res.ok) {
        throw new Error("Failed to fetch interests");
      }
      
      const data = await res.json();
      setInterests(data.interests || []);
    } catch (err) {
      console.error("Error fetching interests:", err);
      setError("Couldn't load your concerts. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterests();
  }, [fetchInterests]);

  // Check if a concert date is in the past
  const isPastConcert = (dateStr: string) => {
    const concertDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return concertDate < today;
  };

  // Filter concerts by tab
  const filteredConcerts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (activeTab) {
      case "interested":
        return interests
          .filter(i => i.status === "interested" && !isPastConcert(i.concertData.date))
          .map(i => ({ ...i.concertData, interestStatus: i.status as InterestStatus }));
      case "going":
        return interests
          .filter(i => i.status === "going" && !isPastConcert(i.concertData.date))
          .map(i => ({ ...i.concertData, interestStatus: i.status as InterestStatus }));
      case "past":
        return interests
          .filter(i => isPastConcert(i.concertData.date))
          .map(i => ({ ...i.concertData, interestStatus: i.status as InterestStatus }))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      default:
        return [];
    }
  }, [interests, activeTab]);

  // Count for each tab
  const counts = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return {
      interested: interests.filter(i => i.status === "interested" && !isPastConcert(i.concertData.date)).length,
      going: interests.filter(i => i.status === "going" && !isPastConcert(i.concertData.date)).length,
      past: interests.filter(i => isPastConcert(i.concertData.date)).length,
    };
  }, [interests]);

  // Handle interest status change from a card
  const handleInterestChange = useCallback((concertId: string, status: InterestStatus, _concert: Concert) => {
    setInterests(prev => {
      if (status === null) {
        // Remove this interest
        return prev.filter(i => i.concertId !== concertId);
      }
      // Update the status
      return prev.map(i => 
        i.concertId === concertId 
          ? { ...i, status } 
          : i
      );
    });
  }, []);

  const tabs: { id: TabType; label: string; icon: typeof Heart; color: string; activeColor: string }[] = [
    { 
      id: "interested", 
      label: "Interested", 
      icon: Heart, 
      color: "text-zinc-400",
      activeColor: "bg-violet-500 text-white" 
    },
    { 
      id: "going", 
      label: "Going", 
      icon: Ticket, 
      color: "text-zinc-400",
      activeColor: "bg-green-500 text-white" 
    },
    { 
      id: "past", 
      label: "Past", 
      icon: Clock, 
      color: "text-zinc-400",
      activeColor: "bg-zinc-600 text-white" 
    },
  ];

  const getEmptyState = () => {
    switch (activeTab) {
      case "interested":
        return {
          icon: Heart,
          title: "No concerts yet",
          description: "When you find concerts you're interested in, tap the heart to save them here.",
          iconColor: "text-violet-500/50",
        };
      case "going":
        return {
          icon: Ticket,
          title: "No concerts planned",
          description: "Mark concerts as 'Going' when you've bought tickets or decided to attend.",
          iconColor: "text-green-500/50",
        };
      case "past":
        return {
          icon: Clock,
          title: "No past concerts",
          description: "Concerts you were interested in or went to will appear here after they've happened.",
          iconColor: "text-zinc-500",
        };
    }
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
        <div className="mb-8">
          <div className="flex items-center gap-2 text-violet-400 mb-2">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-medium">My Concerts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Your concert plans
          </h1>
          <p className="text-zinc-400">
            {interests.length === 0 && !isLoading
              ? "Track concerts you're interested in and planning to attend."
              : `${counts.interested} interested, ${counts.going} going${counts.past > 0 ? `, ${counts.past} past` : ""}`
            }
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex items-center gap-2 flex-wrap border-b border-zinc-800 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all",
                activeTab === tab.id
                  ? tab.activeColor
                  : "bg-zinc-800/50 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={cn(
                "ml-1 text-xs px-1.5 py-0.5 rounded-full",
                activeTab === tab.id
                  ? "bg-white/20"
                  : "bg-zinc-700"
              )}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <ConcertCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-red-500/50" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-zinc-500 max-w-md mx-auto mb-6">
              {error}
            </p>
            <Button 
              onClick={fetchInterests}
              className="bg-zinc-800 hover:bg-zinc-700"
            >
              <Loader2 className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : filteredConcerts.length === 0 ? (
          // Empty State
          (() => {
            const emptyState = getEmptyState();
            return (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
                  <emptyState.icon className={cn("w-10 h-10", emptyState.iconColor)} />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">
                  {emptyState.title}
                </h2>
                <p className="text-zinc-500 max-w-md mx-auto mb-6">
                  {emptyState.description}
                </p>
                <Link href="/discover">
                  <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500">
                    Discover Concerts
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            );
          })()
        ) : (
          // Concert Grid
          <>
            {/* Past concerts disclaimer */}
            {activeTab === "past" && (
              <div className="mb-6 p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                <p className="text-sm text-zinc-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  These concerts have already happened. Hope you had a great time!
                </p>
              </div>
            )}
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredConcerts.map((concert) => (
                <ConcertCard
                  key={concert.id}
                  concert={concert}
                  isAuthenticated={true}
                  interestStatus={(concert as Concert & { interestStatus?: InterestStatus }).interestStatus}
                  onInterestChange={handleInterestChange}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick Stats Footer */}
        {interests.length > 0 && !isLoading && (
          <div className="mt-12 pt-8 border-t border-zinc-800">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-violet-500/10 rounded-lg border border-violet-500/20">
                <div className="text-2xl font-bold text-violet-400">{counts.interested}</div>
                <div className="text-sm text-zinc-400">Interested</div>
              </div>
              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">{counts.going}</div>
                <div className="text-sm text-zinc-400">Going</div>
              </div>
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                <div className="text-2xl font-bold text-zinc-400">{counts.past}</div>
                <div className="text-sm text-zinc-500">Attended</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
