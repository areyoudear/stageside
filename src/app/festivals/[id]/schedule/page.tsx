"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Users,
  Loader2,
  Zap,
  CheckCircle2,
  Coffee,
  Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimelineView } from "@/components/festivals/TimelineView";
import { cn } from "@/lib/utils";
import type { CrewSchedule } from "@/lib/schedule-planner";

interface ScheduleData {
  festival: {
    id: string;
    name: string;
    slug: string;
  };
  crew: {
    id: string;
    name: string;
    members: {
      userId: string;
      displayName: string;
      username?: string;
      avatarUrl?: string;
    }[];
    size: number;
  };
  days: string[];
  schedules: CrewSchedule[];
  summary: {
    totalConflicts: number;
    totalMeetups: number;
    totalFreeSlots: number;
    allCrewMoments: number;
  };
  hasSchedule: boolean;
  artistCount: number;
  interestedArtistCount: number;
}

export default function FestivalSchedulePage() {
  const { data: session, status } = useSession();
  const params = useParams();
  const searchParams = useSearchParams();
  const festivalId = params.id as string;
  const crewId = searchParams.get("crewId");

  const [data, setData] = useState<ScheduleData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && crewId) {
      fetchSchedule();
    } else if (status === "authenticated" && !crewId) {
      setError("No crew selected. Join a crew to see the group schedule.");
      setIsLoading(false);
    }
  }, [status, festivalId, crewId]);

  const fetchSchedule = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `/api/festivals/${festivalId}/schedule/crew?crewId=${crewId}`
      );
      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Failed to load schedule");
        return;
      }

      setData(result);
      if (result.days.length > 0 && !selectedDay) {
        setSelectedDay(result.days[0]);
      }
    } catch (err) {
      setError("Failed to load schedule");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetMeetup = (time: string, artistId: string) => {
    // TODO: Implement meetup setting
    console.log("Set meetup at", time, "after", artistId);
  };

  const handleShare = () => {
    // TODO: Implement sharing
    if (navigator.share) {
      navigator.share({
        title: `${data?.festival.name} Schedule`,
        text: `Check out our ${data?.festival.name} schedule!`,
        url: window.location.href,
      });
    }
  };

  const handleExport = () => {
    // TODO: Implement calendar export
    console.log("Export to calendar");
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center gap-4 p-4">
        <Users className="w-12 h-12 text-zinc-600" />
        <p className="text-zinc-400">Sign in to view your crew schedule</p>
        <Link href="/login">
          <Button>Sign In</Button>
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link
                href={`/festivals/${festivalId}`}
                className="flex items-center gap-2 text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </Link>
            </div>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Link href={`/festivals/${festivalId}`}>
            <Button variant="outline">Back to Festival</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const currentSchedule = data.schedules.find((s) => s.day === selectedDay);

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              href={`/festivals/${festivalId}`}
              className="flex items-center gap-2 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white hidden sm:block">
                Stageside
              </span>
            </Link>
            <div className="w-16" />
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {data.festival.name}
          </h1>
          <div className="flex items-center gap-2 text-zinc-400">
            <Users className="w-4 h-4" />
            <span>
              {data.crew.name || "Your Crew"}:{" "}
              {data.crew.members.map((m) => m.displayName.split(" ")[0]).join(", ")}
            </span>
          </div>
        </div>

        {/* No schedule yet */}
        {!data.hasSchedule ? (
          <div className="text-center py-16 bg-zinc-900/50 rounded-2xl border border-zinc-800">
            <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Schedule Coming Soon
            </h2>
            <p className="text-zinc-400 max-w-md mx-auto">
              The {data.festival.name} schedule hasn't been released yet. Keep
              marking artists you want to see, and we'll notify you when it drops!
            </p>
            <Link href={`/festivals/${festivalId}`}>
              <Button className="mt-6">Browse Lineup</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="text-2xl font-bold text-white">
                  {data.interestedArtistCount}
                </div>
                <div className="text-xs text-zinc-500">Artists to See</div>
              </div>
              <div className="bg-emerald-500/10 rounded-xl border border-emerald-500/30 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  {data.summary.allCrewMoments}
                </div>
                <div className="text-xs text-emerald-400/70">All-Crew Moments</div>
              </div>
              <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-amber-400">
                  <Zap className="w-5 h-5" />
                  {data.summary.totalConflicts}
                </div>
                <div className="text-xs text-amber-400/70">Conflicts</div>
              </div>
              <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 text-center">
                <div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-zinc-400">
                  <Coffee className="w-5 h-5" />
                  {data.summary.totalFreeSlots}
                </div>
                <div className="text-xs text-zinc-500">Free Slots</div>
              </div>
            </div>

            {/* Day tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {data.days.map((day) => {
                const schedule = data.schedules.find((s) => s.day === day);
                const hasConflicts = (schedule?.conflicts.length || 0) > 0;
                const hasMeetups =
                  schedule?.meetups.some((m) => m.type === "all-crew") || false;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                      selectedDay === day
                        ? "bg-white text-zinc-900"
                        : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                    )}
                  >
                    {day}
                    {hasConflicts && (
                      <Zap
                        className={cn(
                          "w-3.5 h-3.5",
                          selectedDay === day ? "text-amber-600" : "text-amber-400"
                        )}
                      />
                    )}
                    {hasMeetups && (
                      <CheckCircle2
                        className={cn(
                          "w-3.5 h-3.5",
                          selectedDay === day ? "text-emerald-600" : "text-emerald-400"
                        )}
                      />
                    )}
                  </button>
                );
              })}
              <Button variant="ghost" size="sm" className="text-zinc-500">
                <Calendar className="w-4 h-4 mr-1.5" />
                Timeline
              </Button>
            </div>

            {/* Timeline view */}
            {currentSchedule && (
              <TimelineView
                schedule={currentSchedule}
                currentUserId={session?.user?.id || ""}
                onSetMeetup={handleSetMeetup}
                onShare={handleShare}
                onExport={handleExport}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}
