"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Plus,
  Copy,
  Check,
  ArrowRight,
  Loader2,
  Music,
  Share2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

interface GroupMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "member";
}

interface ConcertGroup {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  members: GroupMember[];
  createdAt: string;
}

export default function GroupsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [groups, setGroups] = useState<ConcertGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/groups");
    } else if (status === "authenticated") {
      fetchGroups();
    }
  }, [status, router]);

  const fetchGroups = async () => {
    setFetchError(null);
    try {
      const res = await fetch("/api/groups");
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to load groups");
      }
      
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error fetching groups:", error);
      setFetchError(error instanceof Error ? error.message : "Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Stageside</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Concerts
            </Link>
            <Link
              href="/festivals"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Festivals
            </Link>
            <span className="text-white font-medium">Groups</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Concert Buddy</h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Find concerts you&apos;ll ALL enjoy. Create a group, invite friends, and
            discover shows that match everyone&apos;s music taste.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center mb-12">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-5 h-5" />
            Create Group
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 bg-white/10 text-white px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition-colors border border-white/20"
          >
            <Share2 className="w-5 h-5" />
            Join with Code
          </button>
        </div>

        {/* Groups List */}
        {fetchError ? (
          <div className="bg-red-500/5 rounded-2xl p-12 text-center border border-red-500/20">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              Couldn&apos;t load groups
            </h2>
            <p className="text-gray-400 mb-6">
              {fetchError}
            </p>
            <Button
              onClick={fetchGroups}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
            <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">
              No groups yet
            </h2>
            <p className="text-gray-400 mb-6">
              Create your first group and invite friends to find concerts together!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 bg-cyan-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-cyan-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Group
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateGroupModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(group) => {
            setGroups([group, ...groups]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <JoinGroupModal
          onClose={() => setShowJoinModal(false)}
          onJoined={(group) => {
            setGroups([group, ...groups]);
            setShowJoinModal(false);
          }}
        />
      )}
    </div>
  );
}

function GroupCard({ group }: { group: ConcertGroup }) {
  const [copied, setCopied] = useState(false);

  const copyInviteCode = () => {
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Track invite link copied
    track("invite_link_copied", { group_id: group.id, group_name: group.name });
  };

  return (
    <Link
      href={`/groups/${group.id}`}
      className="block bg-white/5 rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">{group.name}</h3>
          {group.description && (
            <p className="text-gray-400 text-sm mb-3">{group.description}</p>
          )}
          <div className="flex items-center gap-4">
            {/* Members */}
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {group.members.slice(0, 4).map((member, i) => (
                  <div
                    key={member.userId}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 border-2 border-gray-900 flex items-center justify-center text-white text-xs font-medium"
                    style={{ zIndex: 10 - i }}
                  >
                    {member.avatarUrl ? (
                      <Image
                        src={member.avatarUrl}
                        alt={member.displayName}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      member.displayName[0].toUpperCase()
                    )}
                  </div>
                ))}
                {group.members.length > 4 && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-white text-xs font-medium">
                    +{group.members.length - 4}
                  </div>
                )}
              </div>
              <span className="ml-3 text-gray-400 text-sm">
                {group.members.length} member{group.members.length !== 1 && "s"}
              </span>
            </div>

            {/* Invite Code */}
            <button
              onClick={(e) => {
                e.preventDefault();
                copyInviteCode();
              }}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="font-mono">{group.inviteCode}</span>
            </button>
          </div>
        </div>

        <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
      </div>
    </Link>
  );
}

function CreateGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (group: ConcertGroup) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("Group name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create group");
      }

      // Track group created
      track("group_created", { group_id: data.group.id, group_name: data.group.name });

      onCreated(data.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Create a Group</h2>

        {error && (
          <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Group Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., SF Concert Crew"
              className="w-full bg-white/10 border border-white/20 rounded-xl py-4 px-4 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Finding shows for summer 2026"
              className="w-full bg-white/10 border border-white/20 rounded-xl py-4 px-4 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-4 rounded-xl text-gray-400 hover:text-white transition-colors min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 px-4 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Create
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function JoinGroupModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: (group: ConcertGroup) => void;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError("Invite code is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: inviteCode.toUpperCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to join group");
      }

      // Track group joined via invite
      track("group_joined_via_invite", { 
        group_id: data.group.id, 
        invite_code: inviteCode.toUpperCase() 
      });

      onJoined(data.group);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
        <h2 className="text-xl font-bold text-white mb-4">Join a Group</h2>

        {error && (
          <div className="bg-red-500/20 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-gray-300 mb-2">
            Invite Code
          </label>
          <input
            type="text"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="e.g., XK7N2M9P"
            maxLength={8}
            className="w-full bg-white/10 border border-white/20 rounded-xl py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-center text-2xl tracking-widest"
          />
          <p className="text-sm text-gray-500 mt-2">
            Ask your friend for their group&apos;s invite code
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-4 px-4 rounded-xl text-gray-400 hover:text-white transition-colors min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-4 px-4 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Users className="w-5 h-5" />
                Join
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
