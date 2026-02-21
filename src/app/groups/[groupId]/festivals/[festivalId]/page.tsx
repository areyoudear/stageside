"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Calendar,
  Users,
  Sparkles,
  Trophy,
  Handshake,
  AlertTriangle,
  Loader2,
  Music,
  ChevronDown,
  ChevronUp,
  Star,
  User,
} from "lucide-react";

interface MemberMatch {
  userId: string;
  username: string;
  displayName: string;
  matchScore: number;
  matchType: "perfect" | "genre" | "discovery" | "none";
  matchReason?: string;
}

interface GroupItinerarySlot {
  artist: {
    id: string;
    artist_name: string;
    stage?: string;
    start_time?: string;
    end_time?: string;
  };
  decidedBy: "consensus" | "strongest-match" | "compromise";
  winningMember?: { userId: string; username: string; score: number };
  memberMatches: MemberMatch[];
  groupScore: number;
  alternatives?: Array<{
    artist: { artist_name: string };
    memberMatches: MemberMatch[];
    groupScore: number;
  }>;
  conflictResolution?: {
    losingMember: { userId: string; username: string; preferredArtist: string };
    reason: string;
  };
}

interface GroupItineraryDay {
  dayName: string;
  date: string;
  slots: GroupItinerarySlot[];
  groupScore: number;
  consensusCount: number;
  compromiseCount: number;
}

interface MemberSatisfaction {
  userId: string;
  username: string;
  satisfactionScore: number;
  mustSeesCovered: number;
  mustSeesTotal: number;
  compromises: number;
}

interface GroupItinerary {
  days: GroupItineraryDay[];
  totalGroupScore: number;
  consensusRate: number;
  memberSatisfaction: MemberSatisfaction[];
  highlights: string[];
}

interface FestivalInfo {
  id: string;
  name: string;
  dates: { start: string; end: string };
  location: { city: string; state?: string };
}

interface GroupInfo {
  id: string;
  name: string;
  memberCount: number;
  members: Array<{ userId: string; username: string; displayName: string }>;
}

export default function GroupFestivalPage({
  params,
}: {
  params: { groupId: string; festivalId: string };
}) {
  const { groupId, festivalId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();

  const [festival, setFestival] = useState<FestivalInfo | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [itinerary, setItinerary] = useState<GroupItinerary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [showSatisfaction, setShowSatisfaction] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/groups/${groupId}/festivals/${festivalId}`);
    } else if (status === "authenticated") {
      fetchItinerary();
    }
  }, [status, groupId, festivalId, router]);

  const fetchItinerary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/groups/${groupId}/festivals/${festivalId}/itinerary`
      );
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login`);
          return;
        }
        throw new Error("Failed to fetch itinerary");
      }

      const data = await res.json();
      setFestival(data.festival);
      setGroup(data.group);
      setItinerary(data.itinerary);
    } catch (error) {
      console.error("Error fetching itinerary:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Building your group schedule...</p>
        </div>
      </div>
    );
  }

  if (!itinerary || !festival || !group) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Couldn&apos;t load schedule
          </h2>
          <Link
            href={`/groups/${groupId}`}
            className="text-blue-400 hover:text-blue-300"
          >
            ← Back to group
          </Link>
        </div>
      </div>
    );
  }

  const currentDay = itinerary.days[activeDay];

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href={`/groups/${groupId}`}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to {group.name}
          </Link>
          <div className="flex items-center gap-2 text-gray-400">
            <Users className="w-4 h-4" />
            <span>{group.memberCount} members</span>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500/20 to-blue-500/20 border border-pink-500/30 rounded-full px-4 py-2 mb-4">
            <Users className="w-5 h-5 text-pink-400" />
            <span className="text-white font-medium">Festival Buddy</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{festival.name}</h1>
          <p className="text-gray-400">
            Group Schedule for {group.name}
          </p>
        </div>

        {/* Highlights */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {itinerary.highlights.map((highlight, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300"
            >
              {highlight}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-green-500/5 rounded-xl p-4 border border-green-500/20 text-center">
            <Handshake className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{itinerary.consensusRate}%</div>
            <div className="text-green-300/70 text-sm">Consensus</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 rounded-xl p-4 border border-yellow-500/20 text-center">
            <Trophy className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {itinerary.days.reduce((sum, d) => sum + d.slots.length, 0)}
            </div>
            <div className="text-yellow-300/70 text-sm">Acts Scheduled</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 rounded-xl p-4 border border-cyan-500/20 text-center">
            <Sparkles className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">
              {Math.round(itinerary.totalGroupScore)}
            </div>
            <div className="text-blue-300/70 text-sm">Group Score</div>
          </div>
          <button
            onClick={() => setShowSatisfaction(!showSatisfaction)}
            className="bg-gradient-to-br from-pink-500/20 to-pink-500/5 rounded-xl p-4 border border-pink-500/20 text-center hover:border-pink-500/40 transition-colors"
          >
            <Users className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{group.memberCount}</div>
            <div className="text-pink-300/70 text-sm">Member Stats ↓</div>
          </button>
        </div>

        {/* Member Satisfaction */}
        {showSatisfaction && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Member Satisfaction</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {itinerary.memberSatisfaction.map((member) => (
                <div key={member.userId} className="bg-white/5 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium">
                      {member.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium">@{member.username}</div>
                      <div className="text-gray-400 text-sm">
                        {member.satisfactionScore}% satisfied
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-400">
                      <span>Must-sees covered</span>
                      <span className="text-white">
                        {member.mustSeesCovered}/{member.mustSeesTotal}
                      </span>
                    </div>
                    {member.compromises > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Compromises made</span>
                        <span className="text-yellow-400">{member.compromises}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Day Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {itinerary.days.map((day, i) => (
            <button
              key={day.dayName}
              onClick={() => setActiveDay(i)}
              className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                activeDay === i
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {day.dayName}
              <span className="ml-2 text-xs opacity-70">
                {day.consensusCount}✓ {day.compromiseCount > 0 && `${day.compromiseCount}⚡`}
              </span>
            </button>
          ))}
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          {currentDay.slots.map((slot, i) => (
            <GroupSlotCard key={i} slot={slot} members={group.members} />
          ))}

          {currentDay.slots.length === 0 && (
            <div className="text-center py-12">
              <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                No acts scheduled
              </h3>
              <p className="text-gray-400">Connect more music services for better matches</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function GroupSlotCard({
  slot,
  members,
}: {
  slot: GroupItinerarySlot;
  members: Array<{ userId: string; username: string; displayName: string }>;
}) {
  const [expanded, setExpanded] = useState(false);

  const decisionColors = {
    consensus: "from-green-500 to-emerald-500",
    "strongest-match": "from-yellow-500 to-orange-500",
    compromise: "from-red-500 to-pink-500",
  };

  const decisionIcons = {
    consensus: Handshake,
    "strongest-match": Trophy,
    compromise: AlertTriangle,
  };

  const decisionLabels = {
    consensus: "Everyone agrees!",
    "strongest-match": "Strongest match wins",
    compromise: "Resolved by score",
  };

  const DecisionIcon = decisionIcons[slot.decidedBy];

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10">
      <div className="flex">
        {/* Time */}
        <div className="w-24 flex-shrink-0 bg-white/5 p-4 flex flex-col items-center justify-center border-r border-white/10">
          {slot.artist.start_time ? (
            <>
              <span className="text-2xl font-bold text-white">
                {slot.artist.start_time.split(":")[0]}
              </span>
              <span className="text-gray-400 text-sm">
                :{slot.artist.start_time.split(":")[1]}
              </span>
            </>
          ) : (
            <span className="text-gray-500">TBD</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`bg-gradient-to-r ${decisionColors[slot.decidedBy]} text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1`}
                >
                  <DecisionIcon className="w-3 h-3" />
                  {decisionLabels[slot.decidedBy]}
                </span>
                {slot.artist.stage && (
                  <span className="text-gray-500 text-sm">{slot.artist.stage}</span>
                )}
              </div>
              <h3 className="text-xl font-semibold text-white">{slot.artist.artist_name}</h3>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-white">{Math.round(slot.groupScore)}%</div>
              <div className="text-gray-500 text-xs">group avg</div>
            </div>
          </div>

          {/* Member matches preview */}
          <div className="flex items-center gap-2 mb-3">
            {slot.memberMatches.map((match) => (
              <div
                key={match.userId}
                className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  match.matchScore >= 80
                    ? "bg-green-500/20 text-green-300"
                    : match.matchScore > 0
                    ? "bg-yellow-500/20 text-yellow-300"
                    : "bg-gray-500/20 text-gray-400"
                }`}
                title={match.matchReason}
              >
                <span>@{match.username}</span>
                <span>{match.matchScore}%</span>
              </div>
            ))}
          </div>

          {/* Conflict resolution info */}
          {slot.conflictResolution && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-2 text-yellow-300 text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>{slot.conflictResolution.reason}</span>
              </div>
            </div>
          )}

          {/* Winner badge */}
          {slot.winningMember && slot.decidedBy !== "consensus" && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>
                Decided by @{slot.winningMember.username}&apos;s {slot.winningMember.score}% match
              </span>
            </div>
          )}

          {/* Alternatives */}
          {slot.alternatives && slot.alternatives.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mt-3"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {slot.alternatives.length} alternative{slot.alternatives.length !== 1 && "s"} at same time
            </button>
          )}

          {expanded && slot.alternatives && (
            <div className="mt-3 space-y-2">
              {slot.alternatives.map((alt, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-white/5 rounded-lg p-3"
                >
                  <div>
                    <span className="text-white">{alt.artist.artist_name}</span>
                    <div className="flex gap-1 mt-1">
                      {alt.memberMatches.slice(0, 3).map((m) => (
                        <span
                          key={m.userId}
                          className="text-xs bg-white/10 text-gray-400 px-1.5 py-0.5 rounded"
                        >
                          @{m.username}: {m.matchScore}%
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-gray-400">{Math.round(alt.groupScore)}% avg</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
