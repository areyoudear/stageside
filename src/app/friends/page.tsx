"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  UserPlus,
  Check,
  X,
  Clock,
  Search,
  Music,
  Loader2,
  Bookmark,
  UserCheck,
  Send,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { cn } from "@/lib/utils";

interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  since?: string;
}

interface PendingRequest {
  friendshipId: string;
  id: string;
  name: string;
  username?: string;
  requestedAt: string;
}

interface SentRequest {
  friendshipId: string;
  id: string;
  name: string;
  username?: string;
  sentAt: string;
}

interface SearchResult {
  id: string;
  name: string;
  username?: string;
  email?: string;
  friendshipStatus: string | null;
  isRequestSender: boolean;
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch friends data
  useEffect(() => {
    if (status === "authenticated") {
      fetchFriends();
    }
  }, [status]);

  const fetchFriends = async () => {
    setFetchError(null);
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to load friends");
      }
      
      setFriends(data.friends || []);
      setPendingRequests(data.pendingRequests || []);
      setSentRequests(data.sentRequests || []);
    } catch (error) {
      console.error("Error fetching friends:", error);
      setFetchError(error instanceof Error ? error.message : "Failed to load friends");
    } finally {
      setIsLoading(false);
    }
  };

  // Search users with debounce
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const sendFriendRequest = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userName }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("error", data.error || "Failed to send request");
        return;
      }

      showMessage("success", data.message || "Friend request sent!");
      setSearchQuery("");
      setSearchResults([]);
      fetchFriends();
    } catch {
      showMessage("error", "Failed to send request");
    } finally {
      setActionLoading(null);
    }
  };

  const sendRequestByQuery = async () => {
    if (!searchQuery.trim()) return;

    setActionLoading("query");
    try {
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await res.json();

      if (!res.ok) {
        showMessage("error", data.error || "Failed to send request");
        return;
      }

      showMessage("success", data.message || "Friend request sent!");
      setSearchQuery("");
      setSearchResults([]);
      fetchFriends();
    } catch {
      showMessage("error", "Failed to send request");
    } finally {
      setActionLoading(null);
    }
  };

  const respondToRequest = async (friendshipId: string, action: "accept" | "reject") => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        showMessage("success", action === "accept" ? "Friend request accepted!" : "Request declined");
        fetchFriends();
      } else {
        showMessage("error", "Failed to respond to request");
      }
    } catch {
      showMessage("error", "Failed to respond to request");
    } finally {
      setActionLoading(null);
    }
  };

  const cancelRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", "Request cancelled");
        fetchFriends();
      }
    } catch {
      showMessage("error", "Failed to cancel request");
    } finally {
      setActionLoading(null);
    }
  };

  const removeFriend = async (friendshipId: string, friendName: string) => {
    if (!confirm(`Remove ${friendName} as a friend?`)) return;

    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", "Friend removed");
        fetchFriends();
      }
    } catch {
      showMessage("error", "Failed to remove friend");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </main>
    );
  }

  if (status === "unauthenticated") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-white mb-2">Sign in to see friends</h1>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>

            {/* Mode tabs */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
              <Link
                href="/dashboard"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Concerts
              </Link>
              <Link
                href="/festivals"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Festivals
              </Link>
              <Link
                href="/saved"
                className="px-4 py-1.5 rounded-md text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
              <span className="px-4 py-1.5 rounded-md text-sm bg-cyan-600 text-white flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Friends</span>
              </span>
            </div>

            <div className="w-8" />
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast Message */}
        {message && (
          <div
            className={cn(
              "fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top",
              message.type === "success"
                ? "bg-emerald-500/90 text-white"
                : "bg-red-500/90 text-white"
            )}
          >
            {message.type === "success" ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-7 h-7 text-blue-400" />
            Friends
          </h1>
          <p className="text-zinc-400">
            Add friends to see which concerts they&apos;re interested in
          </p>
        </div>

        {/* Add Friend Section */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5 mb-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-blue-400" />
            Add a Friend
          </h2>

          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendRequestByQuery()}
                  placeholder="Search by name, username, or email..."
                  className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-zinc-500" />
                )}
              </div>
              <Button
                onClick={sendRequestByQuery}
                disabled={!searchQuery.trim() || actionLoading === "query"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {actionLoading === "query" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 divide-y divide-zinc-700">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 hover:bg-zinc-800/80"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.name}</p>
                        <p className="text-sm text-zinc-500">
                          {user.username ? `@${user.username}` : user.email}
                        </p>
                      </div>
                    </div>
                    <div>
                      {user.friendshipStatus === "accepted" ? (
                        <span className="flex items-center gap-1 text-sm text-emerald-400">
                          <UserCheck className="w-4 h-4" />
                          Friends
                        </span>
                      ) : user.friendshipStatus === "pending" ? (
                        <span className="flex items-center gap-1 text-sm text-amber-400">
                          <Clock className="w-4 h-4" />
                          {user.isRequestSender ? "Pending" : "Respond"}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => sendFriendRequest(user.id, user.name)}
                          disabled={actionLoading === user.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <p className="text-sm text-zinc-500 text-center py-3">
                No users found. Try a different search or send a request directly.
              </p>
            )}
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Friend Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center justify-between bg-zinc-900/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-semibold">
                      {request.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{request.name}</p>
                      {request.username && (
                        <p className="text-sm text-zinc-500">@{request.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondToRequest(request.friendshipId, "accept")}
                      disabled={actionLoading === request.friendshipId}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {actionLoading === request.friendshipId ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToRequest(request.friendshipId, "reject")}
                      disabled={actionLoading === request.friendshipId}
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5 mb-6">
            <h2 className="text-sm font-semibold text-zinc-400 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" />
              Sent Requests ({sentRequests.length})
            </h2>
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 flex items-center justify-center text-white font-semibold">
                      {request.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{request.name}</p>
                      <p className="text-sm text-zinc-500">Awaiting response</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelRequest(request.friendshipId)}
                    disabled={actionLoading === request.friendshipId}
                    className="text-zinc-400 hover:text-white"
                  >
                    {actionLoading === request.friendshipId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Cancel"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            Your Friends ({friends.length})
          </h2>

          {fetchError ? (
            <ErrorState
              type="server"
              message={fetchError}
              onRetry={fetchFriends}
              compact
            />
          ) : friends.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No friends yet"
              description="Connect with friends to see which concerts they're interested in and plan shows together."
              compact
            />
          ) : (
            <div className="space-y-3">
              {friends.map((friend) => (
                <div
                  key={friend.friendshipId}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3 hover:bg-zinc-800/80 transition-colors group"
                >
                  <Link
                    href={`/friends/${friend.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    {friend.avatarUrl ? (
                      <Image
                        src={friend.avatarUrl}
                        alt={friend.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-white font-medium truncate">{friend.name}</p>
                      {friend.username && (
                        <p className="text-sm text-zinc-500 truncate">@{friend.username}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.preventDefault();
                      removeFriend(friend.friendshipId, friend.name);
                    }}
                    disabled={actionLoading === friend.friendshipId}
                    className="text-zinc-500 hover:text-red-400 ml-2"
                  >
                    {actionLoading === friend.friendshipId ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
