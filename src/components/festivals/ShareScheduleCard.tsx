"use client";

import { useRef, useState, forwardRef } from "react";
import { toPng } from "html-to-image";
import { Download, Share2, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CrewSchedule } from "@/lib/schedule-planner";
import { formatTime } from "@/lib/schedule-planner";
import {
  scheduleToText,
  scheduleToCompactText,
  shareSchedule,
  shareScheduleWithImage,
  downloadImage,
} from "@/lib/schedule-share";

interface ShareScheduleCardProps {
  schedules: CrewSchedule[];
  festivalName: string;
  crewName: string;
  selectedDay?: string;
  onClose?: () => void;
}

// The actual card content that gets rendered to image
const ScheduleCardContent = forwardRef<
  HTMLDivElement,
  {
    schedule: CrewSchedule;
    festivalName: string;
    crewName: string;
  }
>(({ schedule, festivalName, crewName }, ref) => {
  return (
    <div
      ref={ref}
      className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-6 rounded-2xl min-w-[360px] max-w-[420px]"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="text-violet-400 text-sm font-medium mb-1">
          {festivalName}
        </div>
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">{schedule.day}</h2>
          <div className="bg-zinc-800 px-2.5 py-1 rounded-full text-xs text-zinc-400">
            {crewName}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-3 mb-4 text-sm">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>{schedule.meetups.filter((m) => m.type === "all-crew").length} meetups</span>
        </div>
        {schedule.conflicts.length > 0 && (
          <div className="flex items-center gap-1.5 text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>{schedule.conflicts.length} splits</span>
          </div>
        )}
      </div>

      {/* Schedule list */}
      <div className="space-y-2.5">
        {schedule.slots
          .sort((a, b) => a.timeSlot.startMinutes - b.timeSlot.startMinutes)
          .slice(0, 8) // Limit for image size
          .map((slot) => {
            const isMeetup = slot.isMeetup && slot.meetupType === "all-crew";
            return (
              <div
                key={slot.artist.id}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl",
                  isMeetup
                    ? "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-zinc-800/50"
                )}
              >
                <div className="text-zinc-500 text-xs w-12 flex-shrink-0">
                  {formatTime(slot.timeSlot.startTime)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-medium truncate">
                      {slot.artist.artistName}
                    </span>
                    {slot.artist.headliner && (
                      <span className="text-yellow-400 text-xs">⭐</span>
                    )}
                    {isMeetup && (
                      <span className="text-emerald-400 text-xs">📍</span>
                    )}
                  </div>
                  <div className="text-zinc-500 text-xs">{slot.artist.stage}</div>
                </div>
                <div className="flex -space-x-1.5">
                  {slot.crewAttending.slice(0, 3).map((c, i) => (
                    <div
                      key={c.userId}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-medium border-2 border-zinc-900"
                      style={{ zIndex: 3 - i }}
                    >
                      {c.displayName.charAt(0)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        
        {schedule.slots.length > 8 && (
          <div className="text-center text-zinc-500 text-xs pt-1">
            +{schedule.slots.length - 8} more sets
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between">
        <div className="text-zinc-600 text-xs">stageside.app</div>
        <div className="text-zinc-600 text-xs">🎵</div>
      </div>
    </div>
  );
});

ScheduleCardContent.displayName = "ScheduleCardContent";

export function ShareScheduleCard({
  schedules,
  festivalName,
  crewName,
  selectedDay,
  onClose,
}: ShareScheduleCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use first day if none selected
  const currentSchedule = selectedDay
    ? schedules.find((s) => s.day === selectedDay)
    : schedules[0];

  if (!currentSchedule) return null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    
    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#18181b",
      });
      
      const link = document.createElement("a");
      link.download = `${festivalName.toLowerCase().replace(/\s+/g, "-")}-${currentSchedule.day.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Failed to generate image:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#18181b",
      });

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const shared = await shareScheduleWithImage(
        `${festivalName} Schedule`,
        scheduleToCompactText(schedules, festivalName),
        blob,
        `${festivalName.toLowerCase().replace(/\s+/g, "-")}-schedule.png`
      );

      if (!shared) {
        // Fallback to text share
        await shareSchedule(
          `${festivalName} Schedule`,
          scheduleToText(schedules, festivalName, crewName)
        );
      }
    } catch (error) {
      console.error("Share failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyText = async () => {
    const text = scheduleToText(schedules, festivalName, crewName);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Share Schedule</h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Preview */}
        <div className="overflow-auto max-h-[60vh] mb-4 -mx-2 px-2">
          <ScheduleCardContent
            ref={cardRef}
            schedule={currentSchedule}
            festivalName={festivalName}
            crewName={crewName}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="bg-violet-600 hover:bg-violet-700"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? "Generating..." : "Download"}
            </Button>
            <Button
              onClick={handleShare}
              disabled={isGenerating}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          <Button
            onClick={handleCopyText}
            variant="ghost"
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy as text
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ShareScheduleCard;
