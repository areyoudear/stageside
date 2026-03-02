"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

export interface CrewMember {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string | null;
  interestLevel?: "must-see" | "interested" | "maybe";
}

interface CrewAvatarStackProps {
  members: CrewMember[];
  maxVisible?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showNames?: boolean;
  showTooltip?: boolean;
  highlightLevel?: "must-see" | "interested" | "maybe" | null;
  className?: string;
  onMemberClick?: (member: CrewMember) => void;
}

const sizeConfig = {
  xs: { avatar: "w-5 h-5", text: "text-[9px]", overlap: "-ml-1.5", ring: "ring-1", plus: "text-[8px] w-5 h-5" },
  sm: { avatar: "w-6 h-6", text: "text-[10px]", overlap: "-ml-2", ring: "ring-1", plus: "text-[9px] w-6 h-6" },
  md: { avatar: "w-8 h-8", text: "text-xs", overlap: "-ml-2.5", ring: "ring-2", plus: "text-[10px] w-8 h-8" },
  lg: { avatar: "w-10 h-10", text: "text-sm", overlap: "-ml-3", ring: "ring-2", plus: "text-xs w-10 h-10" },
};

const interestColors = {
  "must-see": "ring-green-500 bg-green-500/20",
  "interested": "ring-violet-500 bg-violet-500/20",
  "maybe": "ring-zinc-500 bg-zinc-500/20",
};

export function CrewAvatarStack({
  members,
  maxVisible = 5,
  size = "sm",
  showNames = false,
  showTooltip = true,
  highlightLevel = null,
  className,
  onMemberClick,
}: CrewAvatarStackProps) {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const config = sizeConfig[size];
  
  const visibleMembers = members.slice(0, maxVisible);
  const overflowCount = members.length - maxVisible;
  const hasOverflow = overflowCount > 0;

  if (members.length === 0) return null;

  return (
    <div className={cn("flex items-center", className)}>
      <div className="flex items-center">
        {visibleMembers.map((member, index) => {
          const isHighlighted = highlightLevel 
            ? member.interestLevel === highlightLevel 
            : true;
          const interestColor = member.interestLevel 
            ? interestColors[member.interestLevel] 
            : "ring-zinc-700";
          
          return (
            <div
              key={member.id}
              className={cn(
                "relative rounded-full bg-zinc-800",
                config.avatar,
                config.ring,
                "ring-zinc-900",
                index > 0 && config.overlap,
                onMemberClick && "cursor-pointer",
                !isHighlighted && "opacity-40"
              )}
              style={{ zIndex: visibleMembers.length - index }}
              onMouseEnter={() => setHoveredMember(member.id)}
              onMouseLeave={() => setHoveredMember(null)}
              onClick={() => onMemberClick?.(member)}
            >
              {member.avatarUrl ? (
                <Image
                  src={member.avatarUrl}
                  alt={member.displayName}
                  fill
                  className={cn(
                    "rounded-full object-cover",
                    member.interestLevel && `ring-2 ${interestColors[member.interestLevel]}`
                  )}
                />
              ) : (
                <div className={cn(
                  "w-full h-full rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800",
                  "flex items-center justify-center",
                  member.interestLevel && `ring-2 ${interestColors[member.interestLevel]}`
                )}>
                  <span className={cn("font-medium text-zinc-400", config.text)}>
                    {member.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Tooltip */}
              {showTooltip && hoveredMember === member.id && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 rounded text-xs text-white whitespace-nowrap z-50 shadow-lg border border-zinc-700">
                  <span className="font-medium">{member.displayName}</span>
                  {member.interestLevel && (
                    <span className={cn(
                      "ml-1.5",
                      member.interestLevel === "must-see" && "text-green-400",
                      member.interestLevel === "interested" && "text-violet-400",
                      member.interestLevel === "maybe" && "text-zinc-400"
                    )}>
                      • {member.interestLevel === "must-see" ? "Must see!" : 
                         member.interestLevel === "interested" ? "Interested" : "Maybe"}
                    </span>
                  )}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                    <div className="border-4 border-transparent border-t-zinc-800" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
        
        {/* Overflow indicator */}
        {hasOverflow && (
          <div
            className={cn(
              "relative rounded-full bg-zinc-800 flex items-center justify-center",
              config.plus,
              config.ring,
              "ring-zinc-900",
              config.overlap
            )}
            style={{ zIndex: 0 }}
          >
            <span className="text-zinc-400 font-medium">+{overflowCount}</span>
          </div>
        )}
      </div>
      
      {/* Names list (optional) */}
      {showNames && members.length <= 3 && (
        <span className={cn("ml-2 text-zinc-400", config.text)}>
          {members.map(m => m.displayName.split(' ')[0]).join(", ")}
        </span>
      )}
    </div>
  );
}

// Compact badge version showing count + avatars
export function CrewInterestBadge({
  members,
  totalCrewSize,
  artistName,
  size = "sm",
  className,
}: {
  members: CrewMember[];
  totalCrewSize: number;
  artistName?: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const mustSeeCount = members.filter(m => m.interestLevel === "must-see").length;
  const config = sizeConfig[size];
  
  if (members.length === 0) return null;

  // Sort: must-see first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.interestLevel === "must-see" && b.interestLevel !== "must-see") return -1;
    if (b.interestLevel === "must-see" && a.interestLevel !== "must-see") return 1;
    return 0;
  });

  const allIn = members.length === totalCrewSize;
  const mostIn = members.length >= totalCrewSize * 0.75;

  return (
    <div 
      className={cn("relative inline-flex items-center gap-1.5", className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Avatar stack */}
      <CrewAvatarStack 
        members={sortedMembers} 
        maxVisible={4} 
        size={size}
        showTooltip={false}
      />
      
      {/* Count badge */}
      <span className={cn(
        "font-medium tabular-nums",
        config.text,
        allIn ? "text-green-400" : mostIn ? "text-violet-400" : "text-zinc-400"
      )}>
        {members.length}/{totalCrewSize}
      </span>
      
      {/* "All in" badge for unanimous interest */}
      {allIn && totalCrewSize > 1 && (
        <span className={cn(
          "px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 font-medium",
          size === "xs" ? "text-[8px]" : "text-[10px]"
        )}>
          ALL IN
        </span>
      )}
      
      {/* Expanded tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-zinc-900 rounded-lg border border-zinc-700 shadow-xl z-50 min-w-[200px]">
          <p className="text-xs text-zinc-400 mb-2">
            {artistName ? `Crew interest in ${artistName}` : "Crew interest"}
          </p>
          <div className="space-y-1.5">
            {sortedMembers.map(member => (
              <div key={member.id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                  {member.avatarUrl ? (
                    <Image
                      src={member.avatarUrl}
                      alt={member.displayName}
                      width={20}
                      height={20}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500">
                      {member.displayName.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-white flex-1 truncate">
                  {member.displayName}
                </span>
                <span className={cn(
                  "text-[10px] font-medium",
                  member.interestLevel === "must-see" && "text-green-400",
                  member.interestLevel === "interested" && "text-violet-400",
                  member.interestLevel === "maybe" && "text-zinc-500"
                )}>
                  {member.interestLevel === "must-see" ? "🔥 Must see" : 
                   member.interestLevel === "interested" ? "👍 Interested" : "🤔 Maybe"}
                </span>
              </div>
            ))}
          </div>
          {members.length < totalCrewSize && (
            <p className="text-[10px] text-zinc-500 mt-2 pt-2 border-t border-zinc-800">
              {totalCrewSize - members.length} crew member{totalCrewSize - members.length > 1 ? "s" : ""} haven't voted
            </p>
          )}
        </div>
      )}
    </div>
  );
}
