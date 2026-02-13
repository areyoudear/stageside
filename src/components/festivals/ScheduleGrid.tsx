"use client";

import { useState, useMemo } from "react";
import { Check, AlertTriangle, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FestivalArtistMatch, ScheduleDay } from "@/lib/festival-types";

interface ScheduleGridProps {
  schedule: ScheduleDay[];
  lineup: FestivalArtistMatch[];
  agenda: string[];
  onToggleAgenda: (artistId: string) => void;
  onArtistClick?: (artist: FestivalArtistMatch) => void;
}

export function ScheduleGrid({
  schedule,
  lineup,
  agenda,
  onToggleAgenda,
  onArtistClick,
}: ScheduleGridProps) {
  const [activeDay, setActiveDay] = useState(0);

  // Get artists organized by day and time
  const artistsByDayAndTime = useMemo(() => {
    const map = new Map<string, Map<string, FestivalArtistMatch[]>>();

    for (const artist of lineup) {
      if (!artist.day || !artist.start_time) continue;

      if (!map.has(artist.day)) {
        map.set(artist.day, new Map());
      }
      const dayMap = map.get(artist.day)!;

      if (!dayMap.has(artist.start_time)) {
        dayMap.set(artist.start_time, []);
      }
      dayMap.get(artist.start_time)!.push(artist);
    }

    return map;
  }, [lineup]);

  // Get time slots for the active day
  const timeSlots = useMemo(() => {
    const day = schedule[activeDay];
    if (!day) return [];

    const times = new Set<string>();
    const dayArtists = artistsByDayAndTime.get(day.dayName);

    if (dayArtists) {
      dayArtists.forEach((_, time) => {
        times.add(time);
      });
    }

    return Array.from(times).sort();
  }, [schedule, activeDay, artistsByDayAndTime]);

  // Get stages for the active day
  const stages = useMemo(() => {
    const day = schedule[activeDay];
    if (!day) return [];

    const stageSet = new Set<string>();
    const dayArtists = artistsByDayAndTime.get(day.dayName);

    if (dayArtists) {
      dayArtists.forEach((artists) => {
        artists.forEach((artist) => {
          if (artist.stage) stageSet.add(artist.stage);
        });
      });
    }

    return Array.from(stageSet);
  }, [schedule, activeDay, artistsByDayAndTime]);

  const currentDay = schedule[activeDay];
  const dayArtists = currentDay
    ? artistsByDayAndTime.get(currentDay.dayName)
    : null;

  if (schedule.length === 0) {
    return (
      <div className="text-center py-12 text-zinc-500">
        <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Schedule not available yet</p>
        <p className="text-sm mt-2">Check back closer to the festival date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Day tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {schedule.map((day, index) => (
          <button
            key={day.dayName}
            onClick={() => setActiveDay(index)}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap",
              index === activeDay
                ? "bg-cyan-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            )}
          >
            {day.dayName}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500/30 border border-green-500" />
          Perfect match
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500/30 border border-yellow-500" />
          Discovery
        </span>
        <span className="flex items-center gap-1">
          <Check className="w-3 h-3 text-green-400" />
          In your agenda
        </span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Stage headers */}
          <div className="grid gap-1 mb-2" style={{
            gridTemplateColumns: `80px repeat(${stages.length}, 1fr)`,
          }}>
            <div className="text-xs text-zinc-500 font-medium p-2">Time</div>
            {stages.map((stage) => (
              <div
                key={stage}
                className="text-xs text-zinc-400 font-medium p-2 text-center bg-zinc-800/50 rounded-lg"
              >
                {stage}
              </div>
            ))}
          </div>

          {/* Time slots */}
          <div className="space-y-1">
            {timeSlots.map((time) => {
              const artists = dayArtists?.get(time) || [];

              return (
                <div
                  key={time}
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `80px repeat(${stages.length}, 1fr)`,
                  }}
                >
                  {/* Time label */}
                  <div className="text-xs text-zinc-500 p-2 flex items-start">
                    {formatTime(time)}
                  </div>

                  {/* Stage cells */}
                  {stages.map((stage) => {
                    const artist = artists.find((a) => a.stage === stage);

                    if (!artist) {
                      return (
                        <div
                          key={stage}
                          className="p-2 min-h-[60px] bg-zinc-900/30 rounded-lg"
                        />
                      );
                    }

                    const isInAgenda = agenda.includes(artist.id);
                    const hasConflict =
                      isInAgenda &&
                      artists.some(
                        (a) => a.id !== artist.id && agenda.includes(a.id)
                      );

                    return (
                      <ScheduleCell
                        key={`${stage}-${artist.id}`}
                        artist={artist}
                        isInAgenda={isInAgenda}
                        hasConflict={hasConflict}
                        onClick={() => onArtistClick?.(artist)}
                        onToggleAgenda={() => onToggleAgenda(artist.id)}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ScheduleCellProps {
  artist: FestivalArtistMatch;
  isInAgenda: boolean;
  hasConflict: boolean;
  onClick?: () => void;
  onToggleAgenda: () => void;
}

function ScheduleCell({
  artist,
  isInAgenda,
  hasConflict,
  onClick,
  onToggleAgenda,
}: ScheduleCellProps) {
  const getBgColor = () => {
    if (isInAgenda && hasConflict) return "bg-red-500/20 border-red-500/50";
    if (isInAgenda) return "bg-green-500/20 border-green-500/50";
    if (artist.matchType === "perfect")
      return "bg-green-500/10 border-green-500/30 hover:bg-green-500/20";
    if (artist.matchType === "genre" || artist.matchType === "discovery")
      return "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20";
    return "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800";
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onToggleAgenda();
      }}
      className={cn(
        "relative p-2 min-h-[60px] rounded-lg border text-left transition-all group",
        getBgColor()
      )}
    >
      {/* Artist name */}
      <p className="text-sm font-medium text-white truncate pr-5">
        {artist.artist_name}
      </p>

      {/* Time range */}
      {artist.start_time && artist.end_time && (
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {formatTime(artist.start_time)} - {formatTime(artist.end_time)}
        </p>
      )}

      {/* Match indicator */}
      {artist.matchType !== "none" && !isInAgenda && (
        <p className="text-[10px] text-zinc-500 mt-1 truncate">
          {artist.matchReason}
        </p>
      )}

      {/* Status icons */}
      <div className="absolute top-1.5 right-1.5">
        {hasConflict && (
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
        )}
        {isInAgenda && !hasConflict && (
          <Check className="w-3.5 h-3.5 text-green-400" />
        )}
      </div>
    </button>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
