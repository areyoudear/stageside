"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Sparkles,
  Star,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Loader2,
  Music,
  AlertTriangle,
  CheckCircle,
  Zap,
  Coffee,
  Save,
  RotateCcw,
  Check,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

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

interface ItinerarySettings {
  maxPerDay: number;
  restBreak: number;
  includeDiscoveries: boolean;
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

  // Save state
  const [isSaved, setIsSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Error state
  const [error, setError] = useState<{ type: 'notFound' | 'noMusic' | 'generic'; message?: string } | null>(null);

  // Settings
  const [maxPerDay, setMaxPerDay] = useState(8);
  const [includeDiscoveries, setIncludeDiscoveries] = useState(true);
  const [restBreak, setRestBreak] = useState(90);

  // Track original settings to detect changes
  const [originalSettings, setOriginalSettings] = useState<ItinerarySettings | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/festivals/${id}/schedule`);
    } else if (status === "authenticated") {
      fetchItinerary();
    }
  }, [status, id, router]);

  // Detect changes to settings
  useEffect(() => {
    if (originalSettings) {
      const changed = 
        maxPerDay !== originalSettings.maxPerDay ||
        restBreak !== originalSettings.restBreak ||
        includeDiscoveries !== originalSettings.includeDiscoveries;
      setHasChanges(changed);
    }
  }, [maxPerDay, restBreak, includeDiscoveries, originalSettings]);

  const fetchItinerary = useCallback(async (regenerate = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        maxPerDay: maxPerDay.toString(),
        discoveries: includeDiscoveries.toString(),
        restBreak: restBreak.toString(),
      });
      
      if (regenerate) {
        queryParams.set("regenerate", "true");
      }

      const res = await fetch(`/api/festivals/${id}/itinerary?${queryParams}`);
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?callbackUrl=/festivals/${id}/schedule`);
          return;
        }
        if (res.status === 404) {
          setError({ type: 'notFound', message: 'Festival not found' });
          return;
        }
        // Check if user has no music connected
        const errorData = await res.json().catch(() => ({}));
        if (errorData.error?.includes('music') || errorData.error?.includes('connect')) {
          setError({ type: 'noMusic', message: errorData.error });
          return;
        }
        throw new Error(errorData.error || "Failed to fetch itinerary");
      }

      const data = await res.json();
      
      // Check if user has no music data
      if (!data.itinerary || (data.itinerary.days?.length === 0 && data.noMusicData)) {
        setError({ type: 'noMusic', message: 'Connect a music service to get personalized recommendations' });
        setFestival(data.festival);
        return;
      }
      
      setFestival(data.festival);
      setItinerary(data.itinerary);
      setIsSaved(data.isSaved || false);
      setSavedAt(data.savedAt || null);
      
      // Set settings from response
      if (data.settings) {
        setMaxPerDay(data.settings.maxPerDay || 8);
        setRestBreak(data.settings.restBreak || 90);
        setIncludeDiscoveries(data.settings.includeDiscoveries !== false);
        setOriginalSettings({
          maxPerDay: data.settings.maxPerDay || 8,
          restBreak: data.settings.restBreak || 90,
          includeDiscoveries: data.settings.includeDiscoveries !== false,
        });
      } else {
        setOriginalSettings({ maxPerDay, restBreak, includeDiscoveries });
      }
      
      setHasChanges(false);
    } catch (err) {
      console.error("Error fetching itinerary:", err);
      setError({ type: 'generic', message: err instanceof Error ? err.message : 'Failed to load schedule' });
    } finally {
      setIsLoading(false);
    }
  }, [id, maxPerDay, includeDiscoveries, restBreak, router]);

  const regenerate = async () => {
    setIsRegenerating(true);
    setHasChanges(false);
    
    try {
      const queryParams = new URLSearchParams({
        maxPerDay: maxPerDay.toString(),
        discoveries: includeDiscoveries.toString(),
        restBreak: restBreak.toString(),
        regenerate: "true",
      });

      const res = await fetch(`/api/festivals/${id}/itinerary?${queryParams}`);
      if (!res.ok) throw new Error("Failed to regenerate");

      const data = await res.json();
      setItinerary(data.itinerary);
      setIsSaved(false);
      setSavedAt(null);
      setOriginalSettings({ maxPerDay, restBreak, includeDiscoveries });
      setHasChanges(true); // Mark as changed since we regenerated
      toast.success("Schedule regenerated!");
    } catch (error) {
      console.error("Error regenerating:", error);
      toast.error("Failed to regenerate schedule. Please try again.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const saveItinerary = async () => {
    if (!itinerary) return;
    
    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const res = await fetch(`/api/festivals/${id}/itinerary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itinerary,
          settings: {
            maxPerDay,
            restBreak,
            includeDiscoveries,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setIsSaved(true);
      setSavedAt(data.savedAt);
      setHasChanges(false);
      setOriginalSettings({ maxPerDay, restBreak, includeDiscoveries });
      setSaveSuccess(true);
      toast.success("Schedule saved!");
      
      // Hide success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error("Error saving itinerary:", error);
      toast.error("Failed to save schedule. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetItinerary = async () => {
    setIsResetting(true);
    
    try {
      // Delete saved itinerary
      await fetch(`/api/festivals/${id}/itinerary`, {
        method: "DELETE",
      });

      // Regenerate fresh
      await fetchItinerary(true);
      setIsSaved(false);
      setSavedAt(null);
      toast.success("Schedule reset to AI suggestions!");
    } catch (error) {
      console.error("Error resetting itinerary:", error);
      toast.error("Failed to reset schedule. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950">
        {/* Skeleton header */}
        <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="h-5 w-40 bg-white/10 rounded animate-pulse" />
            <div className="flex items-center gap-3">
              <div className="h-8 w-24 bg-white/10 rounded animate-pulse" />
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        </nav>
        
        <main className="max-w-6xl mx-auto px-4 py-8">
          {/* Skeleton hero */}
          <div className="text-center mb-8">
            <div className="h-10 w-64 bg-white/10 rounded-full mx-auto mb-4 animate-pulse" />
            <div className="h-8 w-48 bg-white/10 rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-32 bg-white/10 rounded mx-auto animate-pulse" />
          </div>
          
          {/* Loading indicator */}
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <Loader2 className="w-16 h-16 text-cyan-500 animate-spin" />
              <Sparkles className="w-6 h-6 text-yellow-400 absolute -top-1 -right-1 animate-pulse" />
            </div>
            <p className="text-white font-medium mt-6">Generating your personalized schedule...</p>
            <p className="text-gray-500 text-sm mt-2">Analyzing your music taste and optimizing set times</p>
          </div>
          
          {/* Skeleton stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/10 animate-pulse">
                <div className="h-4 w-16 bg-white/10 rounded mb-2" />
                <div className="h-8 w-12 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Error states
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950">
        <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link
              href="/festivals"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to festivals
            </Link>
          </div>
        </nav>
        
        <main className="max-w-6xl mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            {error.type === 'notFound' ? (
              <div className="bg-red-500/10 rounded-2xl p-8 border border-red-500/20">
                <AlertTriangle className="w-16 h-16 text-red-400/60 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-3">Festival Not Found</h2>
                <p className="text-gray-400 mb-6">
                  This festival doesn&apos;t exist or may have been removed.
                </p>
                <Link
                  href="/festivals"
                  className="block w-full bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
                >
                  Browse All Festivals
                </Link>
              </div>
            ) : error.type === 'noMusic' ? (
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/10 rounded-2xl p-8 border border-white/10">
                <Music className="w-16 h-16 text-blue-400/60 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-3">Connect Your Music</h2>
                <p className="text-gray-400 mb-6">
                  To generate a personalized schedule, we need to know your music taste. 
                  Connect Spotify or Apple Music to get started.
                </p>
                <div className="space-y-3">
                  <Link
                    href="/connect"
                    className="block w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
                  >
                    Connect Music Service
                  </Link>
                  <Link
                    href={`/festivals/${id}`}
                    className="block w-full bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
                  >
                    Browse Festival Manually
                  </Link>
                </div>
                <p className="text-gray-500 text-sm mt-6">
                  Your music data is only used to match artists and is never shared.
                </p>
              </div>
            ) : (
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
                <AlertTriangle className="w-16 h-16 text-yellow-400/60 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-3">Something Went Wrong</h2>
                <p className="text-gray-400 mb-6">
                  {error.message || 'We couldn\'t load the schedule. Please try again.'}
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setError(null);
                      fetchItinerary();
                    }}
                    className="block w-full bg-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-cyan-700 transition-colors"
                  >
                    Try Again
                  </button>
                  <Link
                    href={`/festivals/${id}`}
                    className="block w-full bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
                  >
                    Back to Festival
                  </Link>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!itinerary || !festival) {
    return (
      <div className="min-h-screen bg-gray-950">
        <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4">
            <Link
              href="/festivals"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to festivals
            </Link>
          </div>
        </nav>
        
        <main className="max-w-6xl mx-auto px-4 py-16">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-zinc-900/50 rounded-2xl p-8 border border-zinc-800">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
              <h2 className="text-2xl font-bold text-white mb-3">Schedule Coming Soon</h2>
              <p className="text-gray-400 mb-6">
                The lineup for this festival hasn&apos;t been announced yet.
                Check back closer to the festival date for personalized recommendations.
              </p>
              <div className="space-y-3">
                <Link
                  href={`/festivals/${id}`}
                  className="block w-full bg-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-cyan-700 transition-colors"
                >
                  Browse Festival Details
                </Link>
                <Link
                  href="/festivals"
                  className="block w-full bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors"
                >
                  Explore Other Festivals
                </Link>
              </div>
            </div>
          </div>
        </main>
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
            {/* Save indicator */}
            {isSaved && savedAt && !hasChanges && (
              <span className="text-gray-500 text-sm hidden sm:block">
                Saved {new Date(savedAt).toLocaleDateString()}
              </span>
            )}
            
            {/* Reset button - only show if saved */}
            {isSaved && (
              <button
                onClick={resetItinerary}
                disabled={isResetting}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                title="Reset to AI suggestions"
              >
                <RotateCcw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Regenerate button */}
            <button
              onClick={regenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRegenerating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Regenerate</span>
            </button>

            {/* Save button */}
            <button
              onClick={saveItinerary}
              disabled={isSaving || (!hasChanges && isSaved)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                saveSuccess
                  ? "bg-green-500/20 text-green-400 border border-green-500/50"
                  : hasChanges || !isSaved
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-white/10 text-gray-500 cursor-not-allowed"
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </button>

            <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors text-white">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-pink-500/20 border border-cyan-500/30 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">
              {isSaved ? "Your Saved Schedule" : "Your Personalized Schedule"}
            </span>
            {hasChanges && (
              <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded-full ml-2">
                Unsaved changes
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{festival.name}</h1>
          <p className="text-gray-400">
            {festival.location.city}
            {festival.location.state && `, ${festival.location.state}`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl p-4 border border-cyan-500/20">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
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
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
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
                    ? "bg-blue-500/20 border-cyan-500/50 text-blue-300"
                    : "bg-white/10 border-white/20 text-gray-400"
                }`}
              >
                {includeDiscoveries ? "Yes, show me new artists" : "No, stick to favorites"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={regenerate}
              disabled={isRegenerating}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isRegenerating ? "Regenerating..." : "Apply & Regenerate"}
            </button>
            {hasChanges && (
              <button
                onClick={saveItinerary}
                disabled={isSaving}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                {isSaving ? "Saving..." : "Save Current"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ScheduleCard({ slot, index }: { slot: ItinerarySlot; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const priorityColors = {
    "must-see": "from-yellow-500 to-orange-500",
    recommended: "from-cyan-500 to-blue-600",
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
