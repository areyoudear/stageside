"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Calendar,
  Download,
  Share2,
  X,
  AlertTriangle,
  Clock,
  MapPin,
  Music,
  Star,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Festival, FestivalArtistMatch, ScheduleConflict } from "@/lib/festival-types";
import { detectConflicts } from "@/lib/festivals";

interface AgendaViewProps {
  festival: Festival;
  artists: FestivalArtistMatch[];
  onRemove: (artistId: string) => void;
  onExportCalendar: () => void;
  onShare?: () => void;
}

export function AgendaView({
  festival,
  artists,
  onRemove,
  onExportCalendar,
  onShare,
}: AgendaViewProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Group artists by day
  const artistsByDay = artists.reduce((acc, artist) => {
    const day = artist.day || "Unscheduled";
    if (!acc[day]) acc[day] = [];
    acc[day].push(artist);
    return acc;
  }, {} as Record<string, FestivalArtistMatch[]>);

  // Sort artists within each day by time
  Object.keys(artistsByDay).forEach((day) => {
    artistsByDay[day].sort((a, b) => {
      if (!a.start_time) return 1;
      if (!b.start_time) return -1;
      return a.start_time.localeCompare(b.start_time);
    });
  });

  // Detect conflicts
  const conflicts = detectConflicts(artists);
  const conflictArtistIds = new Set(
    conflicts.flatMap((c) => [c.artist1.id, c.artist2.id])
  );

  // Calculate stats
  const perfectMatches = artists.filter((a) => a.matchType === "perfect").length;
  const discoveries = artists.filter(
    (a) => a.matchType === "discovery" || a.matchType === "genre"
  ).length;

  if (artists.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-10 h-10 text-zinc-700" />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Your agenda is empty
        </h2>
        <p className="text-zinc-500 max-w-md mx-auto">
          Add artists from the lineup or schedule to build your personal festival plan.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Your {festival.name} Agenda
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              {artists.length} artist{artists.length !== 1 && "s"} •{" "}
              {Object.keys(artistsByDay).length} day
              {Object.keys(artistsByDay).length !== 1 && "s"}
            </p>
          </div>

          <div className="flex gap-2">
            {onShare && (
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="text-zinc-400"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            )}
            <div className="relative">
              <Button
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              {showExportMenu && (
                <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-10 min-w-[180px]">
                  <button
                    onClick={() => {
                      onExportCalendar();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 rounded-t-lg"
                  >
                    📅 Add to Calendar (.ics)
                  </button>
                  <button
                    onClick={() => setShowExportMenu(false)}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                  >
                    📋 Copy as Text
                  </button>
                  <button
                    onClick={() => setShowExportMenu(false)}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 rounded-b-lg"
                  >
                    🖼️ Save as Image
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-zinc-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{artists.length}</p>
            <p className="text-xs text-zinc-500">Artists</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{perfectMatches}</p>
            <p className="text-xs text-zinc-500">Perfect Matches</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{discoveries}</p>
            <p className="text-xs text-zinc-500">Discoveries</p>
          </div>
        </div>

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {conflicts.length} schedule conflict
                {conflicts.length !== 1 && "s"}
              </span>
            </div>
            <p className="text-xs text-red-300/70 mt-1">
              Some artists overlap. You may need to choose between them.
            </p>
          </div>
        )}
      </div>

      {/* Day sections */}
      {Object.entries(artistsByDay).map(([day, dayArtists]) => (
        <div key={day} className="space-y-3">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {day}
          </h3>

          <div className="space-y-2">
            {dayArtists.map((artist) => (
              <AgendaItem
                key={artist.id}
                artist={artist}
                hasConflict={conflictArtistIds.has(artist.id)}
                onRemove={() => onRemove(artist.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface AgendaItemProps {
  artist: FestivalArtistMatch;
  hasConflict: boolean;
  onRemove: () => void;
}

function AgendaItem({ artist, hasConflict, onRemove }: AgendaItemProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "flex items-center gap-4 p-3 rounded-lg border transition-all",
        hasConflict
          ? "bg-red-500/10 border-red-500/30"
          : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Image */}
      <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
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
            <Music className="w-6 h-6 text-white/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-white truncate">
            {artist.artist_name}
          </h4>
          {artist.matchType === "perfect" && (
            <Star className="w-4 h-4 text-green-400 fill-green-400 flex-shrink-0" />
          )}
          {(artist.matchType === "discovery" || artist.matchType === "genre") && (
            <Sparkles className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          )}
          {hasConflict && (
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
          {artist.start_time && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(artist.start_time)}
              {artist.end_time && ` - ${formatTime(artist.end_time)}`}
            </span>
          )}
          {artist.stage && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {artist.stage}
            </span>
          )}
        </div>

        {artist.matchReason && (
          <p className="text-xs text-zinc-600 mt-1">{artist.matchReason}</p>
        )}
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-2 rounded-full text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
        aria-label="Remove from agenda"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}
