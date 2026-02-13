"use client";

import { useState } from "react";
import Image from "next/image";
import { AlertTriangle, Clock, MapPin, Music, Star, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FestivalArtistMatch, ScheduleConflict } from "@/lib/festival-types";

interface ConflictResolverProps {
  conflict: ScheduleConflict;
  onKeep: (artistId: string, removeOtherId: string) => void;
  onKeepBoth: () => void;
  onDismiss: () => void;
}

export function ConflictResolver({
  conflict,
  onKeep,
  onKeepBoth,
  onDismiss,
}: ConflictResolverProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-red-500/10 border-b border-red-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold">Schedule Conflict</h3>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4 text-zinc-500" />
            </button>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            These artists overlap by {conflict.overlapMinutes} minutes on {conflict.day}
          </p>
        </div>

        {/* Artists comparison */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <ConflictArtistOption
              artist={conflict.artist1}
              onSelect={() => onKeep(conflict.artist1.id, conflict.artist2.id)}
            />
            <ConflictArtistOption
              artist={conflict.artist2}
              onSelect={() => onKeep(conflict.artist2.id, conflict.artist1.id)}
            />
          </div>

          {/* Keep both option */}
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              onClick={onKeepBoth}
              className="w-full text-zinc-400 border-zinc-700"
            >
              Keep both & run between stages 🏃
            </Button>
            <p className="text-xs text-zinc-600 text-center mt-2">
              You'll catch most of both sets with some overlap
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ConflictArtistOptionProps {
  artist: FestivalArtistMatch;
  onSelect: () => void;
}

function ConflictArtistOption({ artist, onSelect }: ConflictArtistOptionProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center text-center p-4 rounded-xl border border-zinc-700 hover:border-cyan-500 hover:bg-purple-500/10 transition-all group"
    >
      {/* Image */}
      <div className="relative w-20 h-20 rounded-full overflow-hidden mb-3">
        {!imageError && artist.image_url ? (
          <Image
            src={artist.image_url}
            alt={artist.artist_name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-cyan-600 to-pink-500 flex items-center justify-center">
            <Music className="w-8 h-8 text-white/50" />
          </div>
        )}
      </div>

      {/* Name */}
      <h4 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
        {artist.artist_name}
      </h4>

      {/* Match indicator */}
      <div className="flex items-center gap-1 mt-1">
        {artist.matchType === "perfect" && (
          <>
            <Star className="w-3 h-3 text-green-400 fill-green-400" />
            <span className="text-xs text-green-400">Perfect match</span>
          </>
        )}
        {(artist.matchType === "discovery" || artist.matchType === "genre") && (
          <>
            <Sparkles className="w-3 h-3 text-yellow-400" />
            <span className="text-xs text-yellow-400">Discovery</span>
          </>
        )}
        {artist.matchType === "none" && (
          <span className="text-xs text-zinc-500">No match data</span>
        )}
      </div>

      {/* Time & Stage */}
      <div className="mt-2 text-xs text-zinc-500 space-y-1">
        {artist.start_time && (
          <p className="flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(artist.start_time)}
            {artist.end_time && ` - ${formatTime(artist.end_time)}`}
          </p>
        )}
        {artist.stage && (
          <p className="flex items-center justify-center gap-1">
            <MapPin className="w-3 h-3" />
            {artist.stage}
          </p>
        )}
      </div>

      {/* Select button */}
      <div className="mt-3 px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-xs group-hover:bg-cyan-600 group-hover:text-white transition-all">
        Keep this one
      </div>
    </button>
  );
}

// Inline conflict indicator for schedule grid
export function InlineConflictWarning({
  conflicts,
  onResolve,
}: {
  conflicts: ScheduleConflict[];
  onResolve: (conflict: ScheduleConflict) => void;
}) {
  if (conflicts.length === 0) return null;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
      <div className="flex items-center gap-2 text-red-400 mb-2">
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">
          {conflicts.length} conflict{conflicts.length !== 1 && "s"} detected
        </span>
      </div>
      <div className="space-y-2">
        {conflicts.map((conflict, index) => (
          <button
            key={index}
            onClick={() => onResolve(conflict)}
            className="w-full text-left text-sm p-2 rounded bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
          >
            <span className="text-white">{conflict.artist1.artist_name}</span>
            <span className="text-zinc-500"> and </span>
            <span className="text-white">{conflict.artist2.artist_name}</span>
            <span className="text-zinc-500">
              {" "}
              overlap by {conflict.overlapMinutes} min
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
