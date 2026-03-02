"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Clock,
  MapPin,
  Users,
  Zap,
  Coffee,
  Star,
  ChevronRight,
  Calendar,
  Share2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/schedule-planner";
import type {
  CrewSchedule,
  ScheduleSlot,
  ScheduleConflict,
  FreeSlot,
} from "@/lib/schedule-planner";

interface TimelineViewProps {
  schedule: CrewSchedule;
  currentUserId: string;
  onSetMeetup?: (time: string, artistId: string) => void;
  onShare?: () => void;
  onExport?: () => void;
}

// Avatar stack component
function CrewAvatars({
  members,
  max = 4,
  size = "sm",
}: {
  members: { userId: string; displayName: string; avatarUrl?: string }[];
  max?: number;
  size?: "sm" | "md";
}) {
  const shown = members.slice(0, max);
  const remaining = members.length - max;
  
  const sizeClasses = {
    sm: "w-6 h-6 text-[10px] -ml-2 first:ml-0",
    md: "w-8 h-8 text-xs -ml-3 first:ml-0",
  };

  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div
          key={m.userId}
          className={cn(
            "rounded-full border-2 border-zinc-900 flex items-center justify-center",
            sizeClasses[size]
          )}
          style={{ zIndex: shown.length - i }}
          title={m.displayName}
        >
          {m.avatarUrl ? (
            <Image
              src={m.avatarUrl}
              alt={m.displayName}
              width={size === "sm" ? 24 : 32}
              height={size === "sm" ? 24 : 32}
              className="rounded-full"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium">
              {m.displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            "rounded-full bg-zinc-700 border-2 border-zinc-900 flex items-center justify-center text-white font-medium",
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

// Single timeline slot
function TimelineSlot({
  slot,
  currentUserId,
}: {
  slot: ScheduleSlot;
  currentUserId: string;
}) {
  const isUserAttending = slot.crewAttending.some(
    (c) => c.userId === currentUserId
  );
  
  return (
    <div
      className={cn(
        "relative pl-16 pb-8 border-l-2",
        slot.isMeetup && slot.meetupType === "all-crew"
          ? "border-emerald-500"
          : slot.isConflict
          ? "border-amber-500"
          : "border-zinc-700"
      )}
    >
      {/* Time marker */}
      <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center">
        <div
          className={cn(
            "w-3 h-3 rounded-full",
            slot.isMeetup && slot.meetupType === "all-crew"
              ? "bg-emerald-500"
              : slot.isConflict
              ? "bg-amber-500"
              : "bg-zinc-600"
          )}
        />
        <span className="text-xs text-zinc-500 mt-1 w-12 text-center">
          {formatTime(slot.timeSlot.startTime)}
        </span>
      </div>

      {/* Content card */}
      <div
        className={cn(
          "bg-zinc-900/50 rounded-xl border p-4 ml-4",
          slot.isMeetup && slot.meetupType === "all-crew"
            ? "border-emerald-500/50 bg-emerald-500/5"
            : slot.isConflict
            ? "border-amber-500/50 bg-amber-500/5"
            : "border-zinc-800"
        )}
      >
        {/* Meetup badge */}
        {slot.isMeetup && slot.meetupType === "all-crew" && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>ALL CREW — meetup! 📍</span>
          </div>
        )}

        {/* Artist info */}
        <div className="flex items-start gap-3">
          {slot.artist.imageUrl && (
            <Image
              src={slot.artist.imageUrl}
              alt={slot.artist.artistName}
              width={48}
              height={48}
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">
                {slot.artist.artistName}
              </h3>
              {slot.artist.headliner && (
                <Star className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {slot.artist.stage}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatTime(slot.timeSlot.startTime)} - {formatTime(slot.timeSlot.endTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Crew attending */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800">
          <CrewAvatars members={slot.crewAttending} />
          <span className="text-xs text-zinc-500">
            {isUserAttending
              ? slot.crewAttending.length === 1
                ? "Just you"
                : `You + ${slot.crewAttending.length - 1} more`
              : `${slot.crewAttending.length} attending`}
          </span>
        </div>
      </div>
    </div>
  );
}

// Conflict card
function ConflictCard({
  conflict,
  currentUserId,
  onSetMeetup,
}: {
  conflict: ScheduleConflict;
  currentUserId: string;
  onSetMeetup?: (time: string, artistId: string) => void;
}) {
  return (
    <div className="relative pl-16 pb-8 border-l-2 border-amber-500">
      {/* Time marker */}
      <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center">
        <div className="w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
          <Zap className="w-2.5 h-2.5 text-amber-950" />
        </div>
        <span className="text-xs text-amber-400 mt-1 w-12 text-center font-medium">
          SPLIT
        </span>
      </div>

      {/* Conflict content */}
      <div className="bg-amber-500/10 rounded-xl border border-amber-500/30 p-4 ml-4">
        <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-3">
          <AlertTriangle className="w-4 h-4" />
          <span>⚡ CONFLICT</span>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {conflict.options.map((option, i) => {
            const isUserHere = option.crewMembers.some(
              (c) => c.userId === currentUserId
            );
            return (
              <div
                key={option.artist.id}
                className={cn(
                  "p-3 rounded-lg border",
                  isUserHere
                    ? "bg-zinc-800 border-zinc-600"
                    : "bg-zinc-900/50 border-zinc-800"
                )}
              >
                <p className="font-medium text-white text-sm truncate">
                  {option.artist.artistName}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {option.artist.stage}
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <Users className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs text-zinc-400">
                    {option.crewMembers.map((c) => c.displayName.split(" ")[0]).join(", ")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Meetup suggestion */}
        {conflict.suggestedMeetup && (
          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center justify-between">
            <span className="text-sm text-zinc-400">
              {conflict.suggestedMeetup.message}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              onClick={() =>
                onSetMeetup?.(
                  conflict.suggestedMeetup!.time,
                  conflict.options[0].artist.id
                )
              }
            >
              Set meetup
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Free slot indicator
function FreeSlotIndicator({ slot }: { slot: FreeSlot }) {
  return (
    <div className="relative pl-16 pb-8 border-l-2 border-dashed border-zinc-700">
      {/* Time marker */}
      <div className="absolute left-0 -translate-x-1/2 flex flex-col items-center">
        <div className="w-3 h-3 rounded-full bg-zinc-700 border-2 border-zinc-900" />
        <span className="text-xs text-zinc-600 mt-1 w-12 text-center">
          {formatTime(slot.startTime)}
        </span>
      </div>

      {/* Free slot content */}
      <div className="bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800 p-3 ml-4">
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Coffee className="w-4 h-4" />
          <span>FREE — {slot.suggestion}</span>
          <span className="text-xs text-zinc-600">
            ({slot.durationMinutes} min)
          </span>
        </div>
      </div>
    </div>
  );
}

// Main Timeline View
export function TimelineView({
  schedule,
  currentUserId,
  onSetMeetup,
  onShare,
  onExport,
}: TimelineViewProps) {
  // Merge slots, conflicts, and free slots into timeline order
  const timeline: Array<
    | { type: "slot"; data: ScheduleSlot }
    | { type: "conflict"; data: ScheduleConflict }
    | { type: "free"; data: FreeSlot }
  > = [];

  // Add all items with their start times for sorting
  const items: Array<{ startMinutes: number; item: typeof timeline[0] }> = [];

  for (const slot of schedule.slots) {
    // Skip slots that are part of a conflict (they'll be shown in the conflict card)
    const isInConflict = schedule.conflicts.some((c) =>
      c.options.some((o) => o.artist.id === slot.artist.id)
    );
    if (!isInConflict) {
      items.push({
        startMinutes: slot.timeSlot.startMinutes,
        item: { type: "slot", data: slot },
      });
    }
  }

  for (const conflict of schedule.conflicts) {
    items.push({
      startMinutes: conflict.timeSlot.startMinutes,
      item: { type: "conflict", data: conflict },
    });
  }

  for (const free of schedule.freeSlots) {
    const [h, m] = free.startTime.split(":").map(Number);
    items.push({
      startMinutes: h * 60 + m,
      item: { type: "free", data: free },
    });
  }

  // Sort by time
  items.sort((a, b) => a.startMinutes - b.startMinutes);

  return (
    <div className="space-y-6">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">{schedule.day}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onShare}>
            <Share2 className="w-4 h-4 mr-1.5" />
            Share
          </Button>
          <Button size="sm" variant="ghost" onClick={onExport}>
            <Calendar className="w-4 h-4 mr-1.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm">
        {schedule.meetups.filter((m) => m.type === "all-crew").length > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Users className="w-4 h-4" />
            <span>
              {schedule.meetups.filter((m) => m.type === "all-crew").length} crew
              meetups
            </span>
          </div>
        )}
        {schedule.conflicts.length > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <Zap className="w-4 h-4" />
            <span>{schedule.conflicts.length} conflicts</span>
          </div>
        )}
        {schedule.freeSlots.length > 0 && (
          <div className="flex items-center gap-1.5 text-zinc-500">
            <Coffee className="w-4 h-4" />
            <span>{schedule.freeSlots.length} breaks</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        {items.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No sets scheduled for this day</p>
            <p className="text-sm mt-1">
              Mark artists as interested to build your schedule
            </p>
          </div>
        ) : (
          <div className="pl-4">
            {items.map((item, i) => {
              if (item.item.type === "slot") {
                return (
                  <TimelineSlot
                    key={`slot-${item.item.data.artist.id}`}
                    slot={item.item.data}
                    currentUserId={currentUserId}
                  />
                );
              }
              if (item.item.type === "conflict") {
                return (
                  <ConflictCard
                    key={`conflict-${i}`}
                    conflict={item.item.data}
                    currentUserId={currentUserId}
                    onSetMeetup={onSetMeetup}
                  />
                );
              }
              if (item.item.type === "free") {
                return (
                  <FreeSlotIndicator
                    key={`free-${i}`}
                    slot={item.item.data}
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default TimelineView;
