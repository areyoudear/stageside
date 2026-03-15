"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Clock, MapPin, AlertTriangle, Star, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FestivalArtistMatch } from "@/lib/festival-types";
import { CrewAvatarStack, type CrewMember } from "@/components/crew/CrewAvatarStack";
import { audioManager } from "@/lib/audio-manager";

interface HorizontalTimelineProps {
  artists: FestivalArtistMatch[];
  days: string[]; // e.g., ["Friday", "Saturday", "Sunday"]
  stages: string[];
  userAgenda: string[];
  crewInterests?: Record<string, CrewMember[]>;
  conflicts?: {
    artist1Id: string;
    artist2Id: string;
    affectedMembers: { id: string; displayName: string }[];
  }[];
  onToggleAgenda: (artistId: string) => void;
  className?: string;
}

// Constants for timeline
const HOUR_WIDTH = 120; // pixels per hour
const ROW_HEIGHT = 80;
const START_HOUR = 12; // 12 PM (noon)
const END_HOUR = 26; // 2 AM next day (26 = 24 + 2)

export function HorizontalTimeline({
  artists,
  days,
  stages,
  userAgenda,
  crewInterests,
  conflicts = [],
  onToggleAgenda,
  className,
}: HorizontalTimelineProps) {
  const [selectedDay, setSelectedDay] = useState(days[0] || "Friday");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  // Filter artists for selected day with set times
  const dayArtists = artists.filter(
    a => a.day === selectedDay && a.start_time && a.end_time
  );

  // Get unique stages for this day
  const dayStages = Array.from(new Set(dayArtists.map(a => a.stage).filter(Boolean))) as string[];

  // Group by stage
  const stageGroups = dayStages.reduce((acc, stage) => {
    acc[stage] = dayArtists.filter(a => a.stage === stage);
    return acc;
  }, {} as Record<string, FestivalArtistMatch[]>);

  // Get conflict artist IDs for this day
  const conflictArtistIds = new Set(
    conflicts.flatMap(c => [c.artist1Id, c.artist2Id])
  );

  // Calculate timeline width
  const timelineWidth = (END_HOUR - START_HOUR) * HOUR_WIDTH;

  // Generate hour markers
  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => {
    const hour = START_HOUR + i;
    const displayHour = hour > 24 ? hour - 24 : hour;
    const ampm = hour >= 12 && hour < 24 ? "PM" : "AM";
    const displayHour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour;
    return { hour, label: `${displayHour12}${ampm}` };
  });

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    // Only show current time indicator if it's within the timeline range
    if (currentHour >= START_HOUR - 12 && currentHour <= END_HOUR - 12) {
      const adjustedHour = currentHour + (currentHour < START_HOUR - 12 ? 24 : 0);
      setCurrentTime(adjustedHour);
      
      // Scroll to current time
      if (scrollContainerRef.current) {
        const scrollPosition = (adjustedHour - START_HOUR) * HOUR_WIDTH - 100;
        scrollContainerRef.current.scrollLeft = Math.max(0, scrollPosition);
      }
    }
  }, [selectedDay]);

  if (dayArtists.length === 0) {
    return (
      <div className={cn("rounded-xl bg-zinc-900/80 border border-zinc-800 p-8 text-center", className)}>
        <Clock className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No set times yet</h3>
        <p className="text-zinc-500">
          Set times for {selectedDay} haven't been released. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-hidden", className)}>
      {/* Day selector */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Schedule Timeline</h2>
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm transition-colors",
                selectedDay === day
                  ? "bg-cyan-600 text-white"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Conflict banner */}
      {conflicts.length > 0 && (
        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-amber-200">
            {conflicts.length} schedule conflict{conflicts.length > 1 ? "s" : ""} detected
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        {/* Stage labels (fixed left column) */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-zinc-900 border-r border-zinc-800 z-10">
          {/* Header spacer */}
          <div className="h-10 border-b border-zinc-800" />
          
          {/* Stage names */}
          {Object.keys(stageGroups).map((stage, idx) => (
            <div
              key={stage}
              className="h-20 px-3 flex items-center border-b border-zinc-800"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                <span className="text-sm font-medium text-zinc-300 truncate">
                  {stage}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div
          ref={scrollContainerRef}
          className="ml-32 overflow-x-auto scrollbar-thin scrollbar-thumb-zinc-700"
        >
          <div style={{ width: timelineWidth + 100 }}>
            {/* Hour markers */}
            <div className="h-10 flex border-b border-zinc-800 sticky top-0 bg-zinc-900">
              {hours.map(({ hour, label }) => (
                <div
                  key={hour}
                  className="flex-shrink-0 text-xs text-zinc-500 border-l border-zinc-800 pl-2"
                  style={{ width: HOUR_WIDTH }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Stage rows */}
            {Object.entries(stageGroups).map(([stage, stageArtists]) => (
              <div
                key={stage}
                className="h-20 relative border-b border-zinc-800"
              >
                {/* Hour grid lines */}
                {hours.map(({ hour }) => (
                  <div
                    key={hour}
                    className="absolute top-0 bottom-0 border-l border-zinc-800/50"
                    style={{ left: (hour - START_HOUR) * HOUR_WIDTH }}
                  />
                ))}

                {/* Artist blocks */}
                {stageArtists.map(artist => {
                  const startMinutes = timeToMinutes(artist.start_time!);
                  const endMinutes = timeToMinutes(artist.end_time!);
                  const left = ((startMinutes / 60) - START_HOUR) * HOUR_WIDTH;
                  const width = ((endMinutes - startMinutes) / 60) * HOUR_WIDTH;
                  const isInAgenda = userAgenda.includes(artist.id);
                  const hasConflict = conflictArtistIds.has(artist.id);
                  const crewMembers = crewInterests?.[artist.id] || [];

                  return (
                    <TimelineArtistBlock
                      key={artist.id}
                      artist={artist}
                      left={left}
                      width={width}
                      isInAgenda={isInAgenda}
                      hasConflict={hasConflict}
                      crewMembers={crewMembers}
                      onToggleAgenda={() => onToggleAgenda(artist.id)}
                    />
                  );
                })}
              </div>
            ))}

            {/* Current time indicator */}
            {currentTime !== null && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                style={{ left: 128 + (currentTime - START_HOUR) * HOUR_WIDTH }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500" />
          <span>In your agenda</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
          <span>Perfect match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500" />
          <span>Conflict</span>
        </div>
      </div>
    </div>
  );
}

function TimelineArtistBlock({
  artist,
  left,
  width,
  isInAgenda,
  hasConflict,
  crewMembers,
  onToggleAgenda,
}: {
  artist: FestivalArtistMatch;
  left: number;
  width: number;
  isInAgenda: boolean;
  hasConflict: boolean;
  crewMembers: CrewMember[];
  onToggleAgenda: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!artist.preview_url) return;

    if (audioManager.isPlaying(artist.preview_url)) {
      await audioManager.stop();
      setIsPlaying(false);
    } else {
      try {
        await audioManager.play(artist.preview_url, 0, {
          onStateChange: (state) => setIsPlaying(state === "playing"),
          onEnd: () => setIsPlaying(false),
        });
      } catch (error) {
        setIsPlaying(false);
      }
    }
  };

  // Determine colors
  let borderColor = "border-zinc-700";
  let bgColor = "bg-zinc-800/80";

  if (hasConflict) {
    borderColor = "border-amber-500";
    bgColor = "bg-amber-500/10";
  } else if (isInAgenda) {
    borderColor = "border-cyan-500";
    bgColor = "bg-cyan-500/10";
  } else if (artist.matchType === "perfect") {
    borderColor = "border-green-500/50";
    bgColor = "bg-green-500/10";
  }

  return (
    <button
      onClick={onToggleAgenda}
      className={cn(
        "absolute top-2 bottom-2 rounded-lg border-2 overflow-hidden",
        "flex items-center gap-2 px-2 text-left transition-all",
        "hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
        borderColor,
        bgColor
      )}
      style={{ left, width: Math.max(width - 4, 60) }}
    >
      {/* Artist image */}
      {width > 100 && artist.image_url && (
        <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0 relative">
          <Image
            src={artist.image_url}
            alt={artist.artist_name}
            fill
            className="object-cover"
          />
          {/* Play button overlay */}
          {artist.preview_url && (
            <button
              onClick={togglePreview}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5 text-white" />
              )}
            </button>
          )}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          {artist.matchType === "perfect" && (
            <Star className="w-3 h-3 text-green-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-white truncate">
            {artist.artist_name}
          </span>
        </div>
        <span className="text-xs text-zinc-400">
          {artist.start_time?.slice(0, 5)} - {artist.end_time?.slice(0, 5)}
        </span>
      </div>

      {/* Crew avatars */}
      {width > 150 && crewMembers.length > 0 && (
        <div className="flex-shrink-0">
          <CrewAvatarStack members={crewMembers} maxVisible={3} size="sm" />
        </div>
      )}

      {/* Conflict indicator */}
      {hasConflict && (
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      )}
    </button>
  );
}

function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  // Handle times past midnight (e.g., 01:00 = 25:00 in our timeline)
  const adjustedHours = hours < 12 ? hours + 24 : hours;
  return adjustedHours * 60 + minutes;
}
