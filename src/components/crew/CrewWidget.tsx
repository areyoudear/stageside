"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Link2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Star,
  Sparkles,
  Eye,
  Clock,
  Bell,
  Settings,
  LogOut,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CrewAvatarStack, type CrewMember } from "./CrewAvatarStack";

interface CrewStats {
  allWant: number;        // Artists everyone wants to see
  someWant: number;       // Artists some people want
  youOnlyWant: number;    // Artists only you want
  discoverFromCrew: number; // Artists your crew loves that you might discover
}

interface CrewWidgetProps {
  crewId?: string;
  crewName?: string;
  members: CrewMember[];
  currentUserId: string;
  festivalId: string;
  festivalName: string;
  stats?: CrewStats;
  inviteCode?: string;
  scheduleReleased?: boolean;
  scheduleReleaseDate?: string;
  isAdmin?: boolean;
  onInvite?: () => void;
  onCreateCrew?: () => void;
  onJoinCrew?: (code: string) => void;
  onEditCrewName?: (newName: string) => Promise<boolean>;
  onLeaveCrew?: () => Promise<boolean>;
  className?: string;
}

export function CrewWidget({
  crewId,
  crewName,
  members,
  currentUserId,
  festivalId,
  festivalName,
  stats,
  inviteCode,
  scheduleReleased = false,
  scheduleReleaseDate,
  isAdmin = false,
  onInvite,
  onCreateCrew,
  onJoinCrew,
  onEditCrewName,
  onLeaveCrew,
  className,
}: CrewWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(crewName || "");
  const [copied, setCopied] = useState(false);

  const hasCrew = crewId && members.length > 0;
  const currentUser = members.find(m => m.id === currentUserId);
  const otherMembers = members.filter(m => m.id !== currentUserId);

  const handleSaveName = async () => {
    if (!onEditCrewName) return;
    const success = await onEditCrewName(editedName.trim());
    if (success) {
      setIsEditingName(false);
    }
  };

  const handleLeaveCrew = async () => {
    if (!onLeaveCrew) return;
    if (!confirm(`Are you sure you want to leave this crew?${members.length === 1 ? ' This will delete the crew since you are the only member.' : ''}`)) {
      return;
    }
    await onLeaveCrew();
    setShowSettings(false);
  };

  const copyInviteLink = async () => {
    if (!inviteCode) return;
    const link = `${window.location.origin}/festivals/${festivalId}/join?code=${inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // No crew yet - show create/join prompt
  if (!hasCrew) {
    return (
      <div className={cn(
        "rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10",
        "border border-violet-500/20 p-4",
        className
      )}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white mb-1">
              Going with friends?
            </h3>
            <p className="text-sm text-zinc-400 mb-3">
              Create a crew to see which artists everyone wants to see, find overlaps, and plan together.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={onCreateCrew}
                className="bg-violet-600 hover:bg-violet-700"
              >
                <UserPlus className="w-4 h-4 mr-1.5" />
                Start a Crew
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  const code = prompt("Enter crew invite code:");
                  if (code) onJoinCrew?.(code);
                }}
              >
                <Link2 className="w-4 h-4 mr-1.5" />
                Join with Code
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl bg-zinc-900/80 border border-zinc-800",
      "overflow-hidden",
      className
    )}>
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white truncate">
                {crewName || "Your Crew"}
              </h3>
              <span className="text-xs text-zinc-500">
                {members.length} {members.length === 1 ? "person" : "people"}
              </span>
            </div>
            {stats && (
              <p className="text-sm text-zinc-400 truncate">
                <span className="text-green-400">{stats.allWant}</span> must-sees together
                {stats.discoverFromCrew > 0 && (
                  <span> · <span className="text-yellow-400">{stats.discoverFromCrew}</span> to discover</span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Member avatars */}
        <CrewAvatarStack 
          members={members} 
          maxVisible={6} 
          size="md"
          showTooltip={false}
        />

        <ChevronDown className={cn(
          "w-5 h-5 text-zinc-500 transition-transform flex-shrink-0",
          isExpanded && "rotate-180"
        )} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-zinc-800">
          {/* Stats grid */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800">
              <StatCard
                icon={<Star className="w-4 h-4 text-green-400" />}
                label="All want"
                value={stats.allWant}
                color="text-green-400"
              />
              <StatCard
                icon={<Users className="w-4 h-4 text-violet-400" />}
                label="Some want"
                value={stats.someWant}
                color="text-violet-400"
              />
              <StatCard
                icon={<Eye className="w-4 h-4 text-cyan-400" />}
                label="Just you"
                value={stats.youOnlyWant}
                color="text-cyan-400"
              />
              <StatCard
                icon={<Sparkles className="w-4 h-4 text-yellow-400" />}
                label="Discover"
                value={stats.discoverFromCrew}
                color="text-yellow-400"
              />
            </div>
          )}

          {/* Schedule status banner */}
          {!scheduleReleased && (
            <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-start gap-3">
              <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-amber-200">
                  <span className="font-medium">Schedule not released yet.</span>
                  {scheduleReleaseDate && (
                    <span className="text-amber-300/70"> Expected {scheduleReleaseDate}.</span>
                  )}
                </p>
                <p className="text-xs text-amber-200/60 mt-0.5">
                  Mark artists now — we'll detect conflicts when set times drop.
                </p>
              </div>
              <Button size="sm" variant="ghost" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 flex-shrink-0">
                <Bell className="w-3.5 h-3.5 mr-1.5" />
                Notify me
              </Button>
            </div>
          )}

          {/* Members list */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-zinc-400">Crew Members</h4>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost"
                  onClick={() => setShowInviteLink(!showInviteLink)}
                  className="text-violet-400 hover:text-violet-300"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Invite
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-zinc-400 hover:text-zinc-300"
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Settings panel */}
            {showSettings && (
              <div className="mb-4 p-3 bg-zinc-800 rounded-lg space-y-3">
                {/* Edit crew name */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Crew Name</label>
                  {isEditingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        placeholder="Enter crew name..."
                        className="flex-1 px-2 py-1.5 bg-zinc-900 rounded text-sm text-white border border-zinc-700 focus:border-violet-500 focus:outline-none"
                        autoFocus
                      />
                      <Button size="sm" onClick={handleSaveName} className="bg-violet-600 hover:bg-violet-700">
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setEditedName(crewName || ""); }}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white">{crewName || "Unnamed Crew"}</span>
                      {onEditCrewName && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="p-1 text-zinc-500 hover:text-white transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Leave crew */}
                {onLeaveCrew && (
                  <div className="pt-2 border-t border-zinc-700">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleLeaveCrew}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Leave Crew
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Invite link */}
            {showInviteLink && inviteCode && (
              <div className="mb-4 p-3 bg-zinc-800 rounded-lg">
                <p className="text-xs text-zinc-400 mb-2">Share this link with friends:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-2 py-1.5 bg-zinc-900 rounded text-xs text-zinc-300 truncate">
                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/festivals/${festivalId}/join?code=${inviteCode}`}
                  </code>
                  <Button size="sm" variant="outline" onClick={copyInviteLink}>
                    {copied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Member grid - supports up to 20 */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {members.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  isCurrentUser={member.id === currentUserId}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ 
  icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: number; 
  color: string;
}) {
  return (
    <div className="p-3 bg-zinc-900 text-center">
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        <span className={cn("text-lg font-bold", color)}>{value}</span>
      </div>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function MemberCard({ 
  member, 
  isCurrentUser 
}: { 
  member: CrewMember; 
  isCurrentUser: boolean;
}) {
  return (
    <div className={cn(
      "p-2 rounded-lg flex items-center gap-2",
      isCurrentUser ? "bg-violet-500/10 border border-violet-500/30" : "bg-zinc-800/50"
    )}>
      <div className="w-8 h-8 rounded-full bg-zinc-700 overflow-hidden flex-shrink-0">
        {member.avatarUrl ? (
          <Image
            src={member.avatarUrl}
            alt={member.displayName}
            width={32}
            height={32}
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
            {member.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white truncate">
          {member.displayName}
          {isCurrentUser && <span className="text-zinc-500 ml-1">(you)</span>}
        </p>
      </div>
    </div>
  );
}

// Compact version for mobile/smaller spaces
export function CrewWidgetCompact({
  members,
  stats,
  onExpand,
  className,
}: {
  members: CrewMember[];
  stats?: CrewStats;
  onExpand?: () => void;
  className?: string;
}) {
  if (members.length === 0) return null;

  return (
    <button
      onClick={onExpand}
      className={cn(
        "w-full p-3 rounded-lg bg-zinc-900/80 border border-zinc-800",
        "flex items-center gap-3 hover:bg-zinc-800/50 transition-colors",
        className
      )}
    >
      <CrewAvatarStack members={members} maxVisible={4} size="sm" showTooltip={false} />
      <div className="flex-1 text-left min-w-0">
        <p className="text-sm font-medium text-white">
          {members.length} in crew
        </p>
        {stats && (
          <p className="text-xs text-zinc-500 truncate">
            {stats.allWant} must-sees together
          </p>
        )}
      </div>
      <ChevronDown className="w-4 h-4 text-zinc-500" />
    </button>
  );
}
