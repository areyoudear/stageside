"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Download,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import {
  ScheduleGrid,
  InlineConflictWarning,
  ConflictResolver,
} from "@/components/festivals";
import { detectConflicts } from "@/lib/festivals";
import type {
  FestivalWithMatch,
  FestivalArtistMatch,
  ScheduleDay,
  ScheduleConflict,
} from "@/lib/festival-types";

interface SchedulePageProps {
  params: Promise<{ id: string }>;
}

export default function SchedulePage({ params }: SchedulePageProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalWithMatch | null>(null);
  const [lineup, setLineup] = useState<FestivalArtistMatch[]>([]);
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [userAgenda, setUserAgenda] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedArtist, setSelectedArtist] = useState<FestivalArtistMatch | null>(null);
  const [activeConflict, setActiveConflict] = useState<ScheduleConflict | null>(null);

  useEffect(() => {
    fetchFestival();
  }, [id, session]);

  const fetchFestival = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/festivals/${id}`);
      if (!response.ok) {
        router.push("/festivals");
        return;
      }
      const data = await response.json();
      setFestival(data.festival);
      setLineup(data.lineup || []);
      setSchedule(data.schedule || []);
      setUserAgenda(data.userAgenda || []);
    } catch (error) {
      console.error("Error fetching festival:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate conflicts
  const agendaArtists = useMemo(
    () => lineup.filter((a) => userAgenda.includes(a.id)),
    [lineup, userAgenda]
  );
  const conflicts = useMemo(
    () => detectConflicts(agendaArtists),
    [agendaArtists]
  );

  const toggleAgenda = async (artistId: string) => {
    if (!session) {
      return;
    }

    const isInAgenda = userAgenda.includes(artistId);
    const method = isInAgenda ? "DELETE" : "POST";

    // Optimistic update
    const newAgenda = isInAgenda
      ? userAgenda.filter((id) => id !== artistId)
      : [...userAgenda, artistId];
    setUserAgenda(newAgenda);

    // Check for new conflicts after adding
    if (!isInAgenda) {
      const artist = lineup.find((a) => a.id === artistId);
      if (artist) {
        const newAgendaArtists = [...agendaArtists, artist];
        const newConflicts = detectConflicts(newAgendaArtists);
        const artistConflicts = newConflicts.filter(
          (c) => c.artist1.id === artistId || c.artist2.id === artistId
        );
        if (artistConflicts.length > 0) {
          setActiveConflict(artistConflicts[0]);
        }
      }
    }

    try {
      await fetch(`/api/festivals/${id}/agenda`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId }),
      });
    } catch (error) {
      console.error("Error updating agenda:", error);
      // Revert on error
      setUserAgenda(userAgenda);
    }
  };

  const handleKeepOne = (keepId: string, removeId: string) => {
    // Remove the other artist from agenda
    setUserAgenda(userAgenda.filter((id) => id !== removeId));

    fetch(`/api/festivals/${id}/agenda`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ artistId: removeId }),
    }).catch(console.error);

    setActiveConflict(null);
  };

  const handleKeepBoth = () => {
    // Just close the dialog, keep both
    setActiveConflict(null);
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
      }
    } catch (error) {
      console.error("Error exporting calendar:", error);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </main>
    );
  }

  if (!festival) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
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

            <h1 className="text-lg font-semibold text-white">Schedule Builder</h1>

            <div className="flex items-center gap-2">
              {userAgenda.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportCalendar}
                    className="hidden sm:flex"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Link href={`/festivals/${id}/my-agenda`}>
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                      <List className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">
                        My Agenda ({userAgenda.length})
                      </span>
                      <span className="sm:hidden">{userAgenda.length}</span>
                    </Button>
                  </Link>
                </>
              )}
              <SpotifyConnectButton size="sm" showName={false} />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-zinc-500">In Your Agenda</p>
              <p className="text-2xl font-bold text-white">{userAgenda.length}</p>
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total Artists</p>
              <p className="text-2xl font-bold text-zinc-400">{lineup.length}</p>
            </div>
          </div>

          {!session && (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <SpotifyConnectButton size="sm" />
              <span>to save your agenda</span>
            </div>
          )}
        </div>

        {/* Conflicts */}
        {conflicts.length > 0 && (
          <div className="mb-6">
            <InlineConflictWarning
              conflicts={conflicts}
              onResolve={setActiveConflict}
            />
          </div>
        )}

        {/* Schedule Grid */}
        <ScheduleGrid
          schedule={schedule}
          lineup={lineup}
          agenda={userAgenda}
          onToggleAgenda={toggleAgenda}
          onArtistClick={setSelectedArtist}
        />
      </div>

      {/* Conflict Resolver Modal */}
      {activeConflict && (
        <ConflictResolver
          conflict={activeConflict}
          onKeep={handleKeepOne}
          onKeepBoth={handleKeepBoth}
          onDismiss={() => setActiveConflict(null)}
        />
      )}
    </main>
  );
}
