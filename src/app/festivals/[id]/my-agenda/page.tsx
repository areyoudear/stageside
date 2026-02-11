"use client";

import { useState, useEffect, use, useMemo } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Grid, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { AgendaView } from "@/components/festivals";
import type { FestivalWithMatch, FestivalArtistMatch } from "@/lib/festival-types";

interface AgendaPageProps {
  params: Promise<{ id: string }>;
}

export default function AgendaPage({ params }: AgendaPageProps) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalWithMatch | null>(null);
  const [lineup, setLineup] = useState<FestivalArtistMatch[]>([]);
  const [userAgenda, setUserAgenda] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/festivals/${id}`);
      return;
    }

    if (status === "authenticated") {
      fetchAgenda();
    }
  }, [id, status]);

  const fetchAgenda = async () => {
    setIsLoading(true);
    try {
      // Fetch festival and lineup
      const festivalResponse = await fetch(`/api/festivals/${id}`);
      if (!festivalResponse.ok) {
        router.push("/festivals");
        return;
      }
      const festivalData = await festivalResponse.json();
      setFestival(festivalData.festival);
      setLineup(festivalData.lineup || []);
      setUserAgenda(festivalData.userAgenda || []);
    } catch (error) {
      console.error("Error fetching agenda:", error);
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
    setUserAgenda(userAgenda.filter((id) => id !== artistId));

    try {
      await fetch(`/api/festivals/${id}/agenda`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId }),
      });
    } catch (error) {
      console.error("Error removing from agenda:", error);
      // Revert on error
      setUserAgenda([...userAgenda, artistId]);
    }
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

  if (status === "loading" || isLoading) {
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
