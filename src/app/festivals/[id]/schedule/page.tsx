"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Sparkles,
  Star,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Share2,
  Loader2,
  Music,
  AlertTriangle,
  CheckCircle,
  Zap,
  Coffee,
} from "lucide-react";

interface ItinerarySlot {
  artist: {
    id: string;
    artist_name: string;
    stage?: string;
    start_time?: string;
    end_time?: string;
    image_url?: string;
    matchScore: number;
    matchType: "perfect" | "genre" | "discovery" | "none";
    matchReason?: string;
  };
  priority: "must-see" | "recommended" | "discovery" | "filler";
  reason: string;
  alternatives?: ItinerarySlot["artist"][];
}

interface ItineraryDay {
  dayName: string;
  date: string;
  slots: ItinerarySlot[];
  totalScore: number;
  mustSeeCount: number;
}

interface GeneratedItinerary {
  days: ItineraryDay[];
  totalScore: number;
  coverage: number;
  conflicts: Array<{
    artist1: ItinerarySlot["artist"];
    artist2: ItinerarySlot["artist"];
    day: string;
    overlapMinutes: number;
  }>;
  highlights: string[];
}

interface FestivalInfo {
  id: string;
  name: string;
  dates: { start: string; end: string };
  location: { city: string; state?: string };
}

export default function FestivalSchedulePage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalInfo | null>(null);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeDay, setActiveDay] = useState(0);
  const [showConflicts, setShowConflicts] = useState(false);

  // Settings
  const [maxPerDay, setMaxPerDay] = useState(8);
  const [includeDiscoveries, setIncludeDiscoveries] = useState(true);
  const [restBreak, setRestBreak] = useState(90);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/festivals/${id}/schedule`);
    } else if (status === "authenticated") {
      fetchItinerary();
    }
  }, [status, id, router]);

  const fetchItinerary = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        maxPerDay: maxPerDay.toString(),
        discoveries: includeDiscoveries.toString(),
        restBreak: restBreak.toString(),
      });

      const res = await fetch(`/api/festivals/${id}/itinerary?${params}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/festivals/${id}/schedule`);
          return;
        }
        throw new Error("Failed to fetch itinerary");
      }

      const data = await res.json();
      setFestival(data.festival);
      setItinerary(data.itinerary);
    } catch (error) {
      console.error("Error fetching itinerary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerate = async () => {
    setIsRegenerating(true);
    await fetchItinerary();
    setIsRegenerating(false);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Generating your personalized schedule...</p>
        </div>
      </div>
    );
  }

  if (!itinerary || !festival) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">No schedule available</h2>
          <p className="text-gray-400 mb-4">Connect a music service to get personalized recommendations</p>
          <Link
            href={`/festivals/${id}`}
            className="text-purple-400 hover:text-purple-300"
          >
            ← Back to festival
          </Link>
        </div>
      </div>
    );
  }

  const currentDay = itinerary.days[activeDay];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/festivals/${id}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to {festival.name}
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={regenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
              Regenerate
            </button>
            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-white">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">Your Personalized Schedule</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{festival.name}</h1>
          <p className="text-gray-400">
            {festival.location.city}
            {festival.location.state && `, ${festival.location.state}`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Star className="w-4 h-4" />
              <span className="text-sm">Must-See</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {itinerary.days.reduce((sum, d) => sum + d.mustSeeCount, 0)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center gap-2 text-green-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-sm">Discoveries</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {itinerary.days.reduce(
                (sum, d) => sum + d.slots.filter((s) => s.priority === "discovery").length,
                0
              )}
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-xl p-4 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm">Conflicts</span>
            </div>
            <div className="text-2xl font-bold text-white">{itinerary.conflicts.length}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Match Score</span>
            </div>
            <div className="text-2xl font-bold text-white">{itinerary.totalScore}</div>
          </div>
        </div>

        {/* Conflicts Warning */}
        {itinerary.conflicts.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mb-8">
            <button
              onClick={() => setShowConflicts(!showConflicts)}
              className="flex items-center justify-between w-full"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <span className="text-white font-medium">
                  {itinerary.conflicts.length} schedule conflict
                  {itinerary.conflicts.length !== 1 && "s"} detected
                </span>
              </div>
              {showConflicts ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            {showConflicts && (
              <div className="mt-4 space-y-3">
                {itinerary.conflicts.map((conflict, i) => (
                  <div
                    key={i}
                    className="bg-yellow-500/10 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <span className="text-white font-medium">{conflict.artist1.artist_name}</span>
                      <span className="text-gray-400"> overlaps with </span>
                      <span className="text-white font-medium">{conflict.artist2.artist_name}</span>
                      <span className="text-gray-400"> on {conflict.day}</span>
                    </div>
                    <span className="text-yellow-400 text-sm">{conflict.overlapMinutes}min</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Day Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {itinerary.days.map((day, i) => (
            <button
              key={day.dayName}
              onClick={() => setActiveDay(i)}
              className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeDay === i
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {day.dayName}
              <span className="ml-2 text-xs opacity-70">
                {day.slots.length} acts
              </span>
            </button>
          ))}
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          {currentDay.slots.map((slot, i) => (
            <ScheduleCard key={i} slot={slot} index={i} />
          ))}

          {currentDay.slots.length === 0 && (
            <div className="text-center py-12">
              <Coffee className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Rest day!</h3>
              <p className="text-gray-400">No must-see artists scheduled for this day</p>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="mt-12 bg-white/5 rounded-xl p-6 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4">Schedule Settings</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Max acts per day</label>
              <select
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              >
                {[4, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} acts
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Break between acts</label>
              <select
                value={restBreak}
                onChange={(e) => setRestBreak(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white"
              >
                {[30, 60, 90, 120].map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Include discoveries</label>
              <button
                onClick={() => setIncludeDiscoveries(!includeDiscoveries)}
                className={`w-full px-4 py-2 rounded-lg border transition-colors ${
                  includeDiscoveries
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                    : "bg-white/10 border-white/20 text-gray-400"
                }`}
              >
                {includeDiscoveries ? "Yes, show me new artists" : "No, stick to favorites"}
              </button>
            </div>
          </div>
          <button
            onClick={regenerate}
            disabled={isRegenerating}
            className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isRegenerating ? "Regenerating..." : "Apply Changes"}
          </button>
        </div>
      </main>
    </div>
  );
}

function ScheduleCard({ slot, index }: { slot: ItinerarySlot; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    "must-see": "from-yellow-500 to-orange-500",
    recommended: "from-purple-500 to-pink-500",
    discovery: "from-green-500 to-teal-500",
    filler: "from-gray-500 to-gray-600",
  };

  const priorityLabels = {
    "must-see": "Must-See",
    recommended: "Recommended",
    discovery: "Discovery",
    filler: "Popular",
  };

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex">
        {/* Time */}
        <div className="w-24 flex-shrink-0 bg-white/5 p-4 flex flex-col items-center justify-center border-r border-white/10">
          {slot.artist.start_time ? (
            <>
              <span className="text-2xl font-bold text-white">
                {slot.artist.start_time.split(":")[0]}
              </span>
              <span className="text-gray-400 text-sm">
                :{slot.artist.start_time.split(":")[1]}
              </span>
            </>
          ) : (
            <span className="text-gray-500">TBD</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`bg-gradient-to-r ${priorityColors[slot.priority]} text-white text-xs px-2 py-0.5 rounded-full`}
                >
                  {priorityLabels[slot.priority]}
                </span>
                {slot.artist.stage && (
                  <span className="text-gray-500 text-sm">{slot.artist.stage}</span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-white">{slot.artist.artist_name}</h3>
              <p className="text-gray-400 text-sm mt-1">{slot.reason}</p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-white">{slot.artist.matchScore}%</div>
              <div className="text-gray-500 text-xs">match</div>
            </div>
          </div>

          {/* Alternatives */}
          {slot.alternatives && slot.alternatives.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {slot.alternatives.length} alternative{slot.alternatives.length !== 1 && "s"} at same time
              </button>
              {expanded && (
                <div className="mt-3 space-y-2">
                  {slot.alternatives.map((alt, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                    >
                      <div>
                        <span className="text-white">{alt.artist_name}</span>
                        {alt.stage && (
                          <span className="text-gray-500 text-sm ml-2">@ {alt.stage}</span>
                        )}
                      </div>
                      <div className="text-gray-400">{alt.matchScore}% match</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
