"use client";

import { useState, useMemo } from "react";
import { Check, AlertTriangle, Music, Clock, Calendar, HelpCircle } from "lucide-react";
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
  const [showUnscheduled, setShowUnscheduled] = useState(false);

  // Separate scheduled and unscheduled artists
  const { scheduledArtists, unscheduledArtists } = useMemo(() => {
    const scheduled: FestivalArtistMatch[] = [];
    const unscheduled: FestivalArtistMatch[] = [];

    for (const artist of lineup) {
      if (artist.day && artist.start_time) {
        scheduled.push(artist);
      } else {
        unscheduled.push(artist);
      }
    }

    return { scheduledArtists: scheduled, unscheduledArtists: unscheduled };
  }, [lineup]);

  // Get artists organized by day and time
  const artistsByDayAndTime = useMemo(() => {
    const map = new Map<string, Map<string, FestivalArtistMatch[]>>();

    for (const artist of scheduledArtists) {
      if (!map.has(artist.day!)) {
        map.set(artist.day!, new Map());
      }
      const dayMap = map.get(artist.day!)!;

      if (!dayMap.has(artist.start_time!)) {
        dayMap.set(artist.start_time!, []);
      }
      dayMap.get(artist.start_time!)!.push(artist);
    }

    return map;
  }, [scheduledArtists]);

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

  // Empty state - no schedule at all
  if (schedule.length === 0 && lineup.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="bg-zinc-900/50 rounded-2xl p-8 max-w-md mx-auto border border-zinc-800">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-zinc-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No Schedule Available</h3>
          <p className="text-zinc-400 mb-4">
            The lineup for this festival hasn&apos;t been announced yet.
          </p>
          <p className="text-sm text-zinc-500">
            Check back closer to the festival date for set times and stages.
          </p>
        </div>
      </div>
    );
  }

  // Has lineup but no schedule times - show artist list
  if (schedule.length === 0 && lineup.length > 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Clock className="w-12 h-12 mx-auto mb-3 text-yellow-500/70" />
          <h3 className="text-lg font-semibold text-white mb-2">Schedule Times TBD</h3>
          <p className="text-zinc-400 text-sm">
            The lineup has been announced, but set times aren&apos;t available yet.
          </p>
        </div>
        
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lineup
            .sort((a, b) => b.matchScore - a.matchScore)
            .map((artist) => (
              <UnscheduledArtistCard
                key={artist.id}
                artist={artist}
                isInAgenda={agenda.includes(artist.id)}
                onToggleAgenda={() => onToggleAgenda(artist.id)}
              />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Day tabs - increased touch targets for mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {schedule.map((day, index) => (
          <button
            key={day.dayName}
            onClick={() => setActiveDay(index)}
            className={cn(
              "px-5 py-3 rounded-lg font-medium transition-all whitespace-nowrap min-h-[48px]",
              index === activeDay
                ? "bg-cyan-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 active:bg-zinc-600"
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

      {/* Grid - scrollable on mobile with visual indicator */}
      {timeSlots.length > 0 ? (
        <div className="relative">
          {/* Scroll hint for mobile */}
          <div className="sm:hidden absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none z-10" />
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-4">
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
      ) : (
        <div className="text-center py-8 bg-zinc-900/30 rounded-xl">
          <HelpCircle className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-400">No scheduled acts for {currentDay?.dayName || 'this day'}</p>
          <p className="text-sm text-zinc-500 mt-1">Set times may not be announced yet</p>
        </div>
      )}

      {/* Unscheduled artists section */}
      {unscheduledArtists.length > 0 && (
        <div className="border-t border-zinc-800 pt-6">
          <button
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-4"
          >
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {unscheduledArtists.length} Artist{unscheduledArtists.length !== 1 ? 's' : ''} - Times TBD
            </span>
            <span className="text-xs text-zinc-500">
              {showUnscheduled ? '(click to hide)' : '(click to show)'}
            </span>
          </button>

          {showUnscheduled && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {unscheduledArtists
                .sort((a, b) => b.matchScore - a.matchScore)
                .map((artist) => (
                  <UnscheduledArtistCard
                    key={artist.id}
                    artist={artist}
                    isInAgenda={agenda.includes(artist.id)}
                    onToggleAgenda={() => onToggleAgenda(artist.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
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
        "relative p-3 min-h-[72px] rounded-lg border text-left transition-all group touch-manipulation",
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

interface UnscheduledArtistCardProps {
  artist: FestivalArtistMatch;
  isInAgenda: boolean;
  onToggleAgenda: () => void;
}

function UnscheduledArtistCard({
  artist,
  isInAgenda,
  onToggleAgenda,
}: UnscheduledArtistCardProps) {
  const getBgColor = () => {
    if (isInAgenda) return "bg-green-500/20 border-green-500/50";
    if (artist.matchType === "perfect")
      return "bg-green-500/10 border-green-500/30 hover:bg-green-500/20";
    if (artist.matchType === "genre" || artist.matchType === "discovery")
      return "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20";
    return "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800";
  };

  return (
    <button
      onClick={onToggleAgenda}
      className={cn(
        "relative p-4 rounded-lg border text-left transition-all w-full min-h-[72px] touch-manipulation active:scale-[0.98]",
        getBgColor()
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white truncate">
            {artist.artist_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {artist.day ? (
              <span className="text-xs text-zinc-500">{artist.day}</span>
            ) : (
              <span className="text-xs text-yellow-500/70 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                TBD
              </span>
            )}
            {artist.stage && (
              <span className="text-xs text-zinc-600">• {artist.stage}</span>
            )}
          </div>
          {artist.matchType !== "none" && (
            <p className="text-xs text-zinc-500 mt-1 truncate">
              {artist.matchReason}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {isInAgenda ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : artist.matchScore > 0 ? (
            <span className="text-xs text-zinc-500">{artist.matchScore}%</span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
