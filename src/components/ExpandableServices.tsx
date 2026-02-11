"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { MusicServiceButton, MusicServiceType } from "@/components/MusicServiceButton";
import { cn } from "@/lib/utils";

export function ExpandableServices() {
  const [isExpanded, setIsExpanded] = useState(false);

  const otherServices: MusicServiceType[] = [
    "apple_music",
    "youtube_music",
    "tidal",
    "deezer",
  ];

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span>More services</span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} 
        />
      </button>

      {isExpanded && (
        <div className="flex flex-wrap justify-center gap-2 animate-fade-in">
          {otherServices.map((service) => (
            <MusicServiceButton
              key={service}
              service={service}
              size="sm"
              showStatus={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
