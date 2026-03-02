"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Sparkles, AlertTriangle, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleDroppedBannerProps {
  festivalName: string;
  festivalSlug: string;
  crewId?: string;
  stats: {
    conflictsDetected: number;
    allCrewMoments: number;
    artistsMarked: number;
  };
  onDismiss?: () => void;
}

export function ScheduleDroppedBanner({
  festivalName,
  festivalSlug,
  crewId,
  stats,
  onDismiss,
}: ScheduleDroppedBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 rounded-xl p-[1px]">
      <div className="bg-zinc-950 rounded-xl p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                🎉 {festivalName} schedule is LIVE!
              </h3>
              <p className="text-zinc-400 text-sm mt-1">
                Your crew marked {stats.artistsMarked} artists. Here's the damage:
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-4 mt-4">
                {stats.conflictsDetected > 0 && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {stats.conflictsDetected} conflict{stats.conflictsDetected !== 1 ? "s" : ""} detected
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {stats.allCrewMoments} "whole crew" moment{stats.allCrewMoments !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Meetup points suggested</span>
                </div>
              </div>

              {/* CTA */}
              <div className="mt-4">
                <Link
                  href={
                    crewId
                      ? `/festivals/${festivalSlug}/schedule?crewId=${crewId}`
                      : `/festivals/${festivalSlug}/schedule`
                  }
                >
                  <Button className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500">
                    View Your Crew's Schedule →
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Compact inline version for notifications
export function ScheduleDroppedNotification({
  festivalName,
  festivalSlug,
  crewId,
}: {
  festivalName: string;
  festivalSlug: string;
  crewId?: string;
}) {
  return (
    <Link
      href={
        crewId
          ? `/festivals/${festivalSlug}/schedule?crewId=${crewId}`
          : `/festivals/${festivalSlug}/schedule`
      }
      className="block"
    >
      <div className="bg-gradient-to-r from-violet-500/20 to-pink-500/20 border border-violet-500/30 rounded-lg p-3 hover:bg-violet-500/30 transition-colors">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white">
            🎉 {festivalName} schedule dropped!
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1 ml-6">
          Tap to see your crew's schedule →
        </p>
      </div>
    </Link>
  );
}

export default ScheduleDroppedBanner;
