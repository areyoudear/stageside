"use client";

import { useState } from "react";
import { Users, X, Ticket, Star, Clock } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export interface FriendInterest {
  id: string;
  name: string;
  username?: string;
  status: "interested" | "going";
  markedAt?: string;
}

interface FriendsBadgeProps {
  friends: FriendInterest[];
  concertName?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Avatar circle component for friend display
 */
function FriendAvatar({ 
  name, 
  index, 
  status 
}: { 
  name: string; 
  index: number;
  status: "interested" | "going";
}) {
  // Get initials from name
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  // Generate consistent color based on name
  const colors = [
    "bg-violet-500",
    "bg-cyan-500",
    "bg-pink-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={cn(
        "relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-zinc-900 shadow-sm",
        bgColor,
        index > 0 && "-ml-2" // Overlap after first avatar
      )}
      style={{ zIndex: 10 - index }} // Stack properly
      title={`${name} is ${status}`}
    >
      {initials}
      {/* Status indicator dot */}
      {status === "going" && (
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border border-zinc-900" />
      )}
    </div>
  );
}

/**
 * Format relative time (e.g., "2 days ago", "yesterday")
 */
function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? "s" : ""} ago`;
}

/**
 * Avatar component for the detail view (larger than badge version)
 */
function FriendAvatarLarge({ name, status }: { name: string; status: "interested" | "going" }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  
  const colors = [
    "bg-violet-500",
    "bg-cyan-500",
    "bg-pink-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
  ];
  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={cn(
        "relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md flex-shrink-0",
        bgColor
      )}
    >
      {initials}
      {status === "going" && (
        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-800" />
      )}
    </div>
  );
}

/**
 * Individual friend row in the detail sheet
 */
function FriendRow({ friend }: { friend: FriendInterest }) {
  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
      <FriendAvatarLarge name={friend.name} status={friend.status} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">{friend.name}</p>
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          {friend.username && <span>@{friend.username}</span>}
          {friend.markedAt && (
            <>
              {friend.username && <span className="text-zinc-600">·</span>}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatRelativeTime(friend.markedAt)}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FriendsBadge - Shows which friends are interested in or going to a concert
 * Displays overlapping avatars and a count, clickable to show detail sheet
 */
export function FriendsBadge({ friends, concertName, compact = false, className }: FriendsBadgeProps) {
  const [showSheet, setShowSheet] = useState(false);

  if (!friends || friends.length === 0) {
    return null;
  }

  const goingCount = friends.filter((f) => f.status === "going").length;
  const interestedCount = friends.filter((f) => f.status === "interested").length;

  // Show up to 3 avatars, prioritize "going" friends
  const sortedFriends = [...friends].sort((a, b) => {
    if (a.status === "going" && b.status !== "going") return -1;
    if (a.status !== "going" && b.status === "going") return 1;
    return 0;
  });
  const displayFriends = sortedFriends.slice(0, 3);
  const extraCount = friends.length - displayFriends.length;

  // Generate label text
  const getLabelText = () => {
    if (goingCount > 0 && interestedCount > 0) {
      return `${goingCount} going, ${interestedCount} interested`;
    } else if (goingCount > 0) {
      return `${goingCount} friend${goingCount > 1 ? "s" : ""} going`;
    } else {
      return `${interestedCount} friend${interestedCount > 1 ? "s" : ""} interested`;
    }
  };

  // Compact version for tighter spaces
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowSheet(true)}
          className={cn(
            "flex items-center gap-1.5 py-1 px-2 rounded-full transition-all",
            "bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 hover:border-amber-500/40",
            "cursor-pointer",
            className
          )}
        >
          <Users className="w-3 h-3 text-amber-400" />
          <span className="text-[11px] font-medium text-amber-300">
            {friends.length} friend{friends.length !== 1 ? "s" : ""}
            {goingCount > 0 && ` (${goingCount} going)`}
          </span>
        </button>

        <FriendsDetailSheet
          isOpen={showSheet}
          onClose={() => setShowSheet(false)}
          friends={friends}
          concertName={concertName}
        />
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowSheet(true)}
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg transition-all w-full",
          "bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50",
          "group cursor-pointer",
          className
        )}
      >
        {/* Stacked avatars */}
        <div className="flex items-center">
          {displayFriends.map((friend, index) => (
            <FriendAvatar
              key={friend.id}
              name={friend.name}
              index={index}
              status={friend.status}
            />
          ))}
          {extraCount > 0 && (
            <div
              className={cn(
                "relative w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-zinc-900",
                "bg-zinc-600 -ml-2"
              )}
              style={{ zIndex: 6 }}
            >
              +{extraCount}
            </div>
          )}
        </div>

        {/* Text label */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Users className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <span className="text-xs font-medium text-amber-200 group-hover:text-amber-100 transition-colors truncate">
            {getLabelText()}
          </span>
        </div>
      </button>

      {/* Detail sheet */}
      <FriendsDetailSheet
        isOpen={showSheet}
        onClose={() => setShowSheet(false)}
        friends={friends}
        concertName={concertName}
      />
    </>
  );
}

/**
 * FriendsDetailSheet - Modal showing full list of friends interested/going to a concert
 * Groups friends by status: "Going" and "Interested"
 */
function FriendsDetailSheet({
  isOpen,
  onClose,
  friends,
  concertName,
}: {
  isOpen: boolean;
  onClose: () => void;
  friends: FriendInterest[];
  concertName?: string;
}) {
  const friendsGoing = friends.filter((f) => f.status === "going");
  const friendsInterested = friends.filter((f) => f.status === "interested");

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Backdrop */}
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-fade-in" />
        
        {/* Sheet - slides up from bottom on mobile, centered on desktop */}
        <Dialog.Content
          className={cn(
            "fixed z-50 bg-zinc-900 shadow-2xl border border-zinc-700/50",
            // Mobile: bottom sheet
            "bottom-0 left-0 right-0 max-h-[85vh]",
            "rounded-t-2xl",
            // Desktop: centered modal
            "md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
            "md:rounded-2xl md:max-w-md md:w-full md:max-h-[80vh]",
            // Animation
            "animate-slide-up md:animate-fade-in"
          )}
        >
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 px-5 py-4 rounded-t-2xl z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/20">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-bold text-white">
                    Friends at this concert
                  </Dialog.Title>
                  {concertName && (
                    <Dialog.Description className="text-sm text-zinc-400 mt-0.5 line-clamp-1">
                      {concertName}
                    </Dialog.Description>
                  )}
                </div>
              </div>
              <Dialog.Close asChild>
                <button
                  className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </Dialog.Close>
            </div>

            {/* Summary stats */}
            <div className="flex gap-4 mt-4">
              {friendsGoing.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/30">
                  <Ticket className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-green-300">
                    {friendsGoing.length} going
                  </span>
                </div>
              )}
              {friendsInterested.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30">
                  <Star className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-300">
                    {friendsInterested.length} interested
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto px-5 py-4 space-y-6" style={{ maxHeight: "calc(80vh - 140px)" }}>
            {/* Going section */}
            {friendsGoing.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-green-400 mb-3">
                  <Ticket className="w-4 h-4" />
                  Going
                </h3>
                <div className="space-y-2">
                  {friendsGoing.map((friend) => (
                    <FriendRow key={friend.id} friend={friend} />
                  ))}
                </div>
              </div>
            )}

            {/* Interested section */}
            {friendsInterested.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-400 mb-3">
                  <Star className="w-4 h-4" />
                  Interested
                </h3>
                <div className="space-y-2">
                  {friendsInterested.map((friend) => (
                    <FriendRow key={friend.id} friend={friend} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state (shouldn't happen but just in case) */}
            {friends.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400">No friends have marked this concert yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-zinc-900 border-t border-zinc-800 px-5 py-4">
            <Dialog.Close asChild>
              <button className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors">
                Close
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Re-export for backwards compatibility
export { FriendsDetailSheet };
