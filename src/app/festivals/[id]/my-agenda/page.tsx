"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Grid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { AgendaView, QuickShareButton } from "@/components/festivals";
import { toast } from "sonner";
import type { FestivalWithMatch, FestivalArtistMatch } from "@/lib/festival-types";

interface AgendaPageProps {
  params: { id: string };
}

export default function AgendaPage({ params }: AgendaPageProps) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalWithMatch | null>(null);
  const [lineup, setLineup] = useState<FestivalArtistMatch[]>([]);
  const [userAgenda, setUserAgenda] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Allow unauthenticated users to view their localStorage agenda
    if (status !== "loading") {
      fetchAgenda();
    }
  }, [id, status]);

  const fetchAgenda = async () => {
    setIsLoading(true);
    try {
      // Fetch festival and lineup
      const festivalResponse = await fetch(`/api/festivals/${id}`);
      if (!festivalResponse.ok) {
        toast.error("Failed to load agenda");
        router.push("/festivals");
        return;
      }
      const festivalData = await festivalResponse.json();
      setFestival(festivalData.festival);
      setLineup(festivalData.lineup || []);
      
      // Merge server agenda with localStorage agenda
      let serverAgenda: string[] = festivalData.userAgenda || [];
      let localAgenda: string[] = [];
      
      // Get localStorage agenda
      try {
        const storedAgenda = localStorage.getItem(`festival-agenda-${id}`);
        if (storedAgenda) {
          localAgenda = JSON.parse(storedAgenda);
        }
      } catch (e) {
        console.error("Error reading localStorage agenda:", e);
      }
      
      // Merge both agendas (union of both)
      const mergedAgenda = Array.from(new Set([...serverAgenda, ...localAgenda]));
      setUserAgenda(mergedAgenda);
      
      // If there's a difference, sync localStorage to include server data
      if (JSON.stringify(localAgenda.sort()) !== JSON.stringify(mergedAgenda.sort())) {
        localStorage.setItem(`festival-agenda-${id}`, JSON.stringify(mergedAgenda));
      }
    } catch (error) {
      console.error("Error fetching agenda:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const agendaArtists = useMemo(
    () => lineup.filter((a) => userAgenda.includes(a.id)),
    [lineup, userAgenda]
  );

  const removeFromAgenda = async (artistId: string) => {
    // Optimistic update
    const previousAgenda = [...userAgenda];
    const newAgenda = userAgenda.filter((aid) => aid !== artistId);
    setUserAgenda(newAgenda);
    
    // Update localStorage immediately
    localStorage.setItem(`festival-agenda-${id}`, JSON.stringify(newAgenda));

    // If logged in, also sync with server
    if (status === "authenticated") {
      try {
        const response = await fetch(`/api/festivals/${id}/agenda`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artistId }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to remove");
        }
      } catch (error) {
        console.error("Error removing from agenda:", error);
        // Revert on error
        setUserAgenda(previousAgenda);
        localStorage.setItem(`festival-agenda-${id}`, JSON.stringify(previousAgenda));
        toast.error("Failed to remove artist. Please try again.");
        return;
      }
    }
    
    toast.success("Removed from agenda");
  };

  const exportCalendar = async () => {
    try {
      const response = await fetch(`/api/festivals/${id}/agenda`, {
        method: "PUT",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${festival?.slug || "festival"}-agenda.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast.success("Calendar exported!");
      } else {
        throw new Error("Export failed");
      }
    } catch (error) {
      console.error("Error exporting calendar:", error);
      toast.error("Failed to export calendar. Please try again.");
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        {/* Navigation skeleton */}
        <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="w-20 h-4 bg-zinc-800 rounded animate-pulse" />
              <div className="w-24 h-5 bg-zinc-800 rounded animate-pulse" />
              <div className="w-20 h-8 bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </nav>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary card skeleton */}
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="w-48 h-6 bg-zinc-800 rounded animate-pulse mb-2" />
                <div className="w-32 h-4 bg-zinc-800 rounded animate-pulse" />
              </div>
              <div className="flex gap-2">
                <div className="w-20 h-8 bg-zinc-800 rounded animate-pulse" />
                <div className="w-20 h-8 bg-zinc-800 rounded animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="w-10 h-8 bg-zinc-800 rounded mx-auto mb-1 animate-pulse" />
                  <div className="w-16 h-3 bg-zinc-800 rounded mx-auto animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Day section skeletons */}
          {[...Array(2)].map((_, dayIdx) => (
            <div key={dayIdx} className="mb-6">
              <div className="w-24 h-4 bg-zinc-800 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800 bg-zinc-900/50"
                  >
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 animate-pulse" />
                    <div className="flex-1">
                      <div className="w-32 h-5 bg-zinc-800 rounded animate-pulse mb-2" />
                      <div className="w-48 h-4 bg-zinc-800 rounded animate-pulse" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-zinc-800 animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  if (!festival) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/festivals/${id}`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{festival.name}</span>
              <span className="sm:hidden">Back</span>
            </Link>

            <h1 className="text-lg font-semibold text-white">My Agenda</h1>

            <div className="flex items-center gap-2">
              <Link href={`/festivals/${id}/schedule`}>
                <Button variant="outline" size="sm">
                  <Grid className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Schedule</span>
                </Button>
              </Link>
              <SpotifyConnectButton size="sm" showName={false} />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AgendaView
          festival={festival}
          artists={agendaArtists}
          onRemove={removeFromAgenda}
          onExportCalendar={exportCalendar}
        />

        {/* Add more CTA */}
        {userAgenda.length > 0 && userAgenda.length < 10 && (
          <div className="mt-8 text-center">
            <p className="text-zinc-500 mb-4">
              Want to add more artists to your agenda?
            </p>
            <Link href={`/festivals/${id}/schedule`}>
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Browse Schedule
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
