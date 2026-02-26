"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Search,
  Music,
  ArrowLeft,
  Loader2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MatchBadge } from "@/components/TasteOverlapCard";
import { cn } from "@/lib/utils";

interface Friend {
  friendshipId: string;
  id: string;
  name: string;
  username?: string;
  since?: string;
}

interface FriendWithOverlap extends Friend {
  overlapPercentage?: number;
  sharedArtistCount?: number;
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
  friendshipStatus?: string | null;
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [friends, setFriends] = useState<FriendWithOverlap[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingOverlaps, setLoadingOverlaps] = useState<Set<string>>(new Set());
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [addingUser, setAddingUser] = useState<string | null>(null);

  // Fetch friends data
  useEffect(() => {
    if (status === "authenticated") {
      fetchFriends();
    }
  }, [status]);

  // Live search as user types
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/friends");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      const friendsList = data.friends || [];
      setFriends(friendsList);
      setPendingRequests(data.pendingRequests || []);
      setSentRequests(data.sentRequests || []);

      // Fetch overlap data for each friend
      fetchOverlapData(friendsList);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOverlapData = async (friendsList: Friend[]) => {
    // Fetch overlap data in parallel for all friends
    const overlapPromises = friendsList.map(async (friend) => {
      try {
        setLoadingOverlaps((prev) => new Set(prev).add(friend.id));
        const res = await fetch(`/api/friends/overlap/${friend.id}`);
        if (!res.ok) return null;
        const data = await res.json();
        return { friendId: friend.id, ...data };
      } catch {
        return null;
      } finally {
        setLoadingOverlaps((prev) => {
          const next = new Set(prev);
          next.delete(friend.id);
          return next;
        });
      }
    });

    const results = await Promise.all(overlapPromises);
    
    // Update friends with overlap data
    setFriends((currentFriends) =>
      currentFriends.map((friend) => {
        const overlap = results.find((r) => r?.friendId === friend.id);
        if (overlap) {
          return {
            ...friend,
            overlapPercentage: overlap.overlapPercentage,
            sharedArtistCount: overlap.sharedArtists?.length || 0,
          };
        }
        return friend;
      })
    );
  };

  const sendFriendRequest = async (usernameOrEmail?: string) => {
    const target = usernameOrEmail || searchQuery.trim();
    if (!target) return;
    
    setIsSearching(true);
    setSearchError(null);
    setSuccessMessage(null);
    if (usernameOrEmail) setAddingUser(usernameOrEmail);

    try {
      const isEmail = target.includes("@");
      const res = await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEmail ? { email: target } : { username: target }
        ),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setSearchError(data.error || "Failed to send request");
        return;
      }

      setSuccessMessage(`Friend request sent to ${data.friendship.targetUser.name}!`);
      setSearchQuery("");
      setSearchResults([]);
      fetchFriends(); // Refresh lists
    } catch (error) {
      setSearchError("Failed to send request");
    } finally {
      setIsSearching(false);
      setAddingUser(null);
    }
  };

  const respondToRequest = async (friendshipId: string, action: "accept" | "reject") => {
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      
      if (res.ok) {
        fetchFriends();
        if (action === "accept") {
          setSuccessMessage("Friend added!");
        }
      }
    } catch (error) {
      console.error("Error responding to request:", error);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    if (!confirm("Remove this friend?")) return;
    
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, {
        method: "DELETE",
      });
      
      if (res.ok) {
        fetchFriends();
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const handleFindConcertsTogether = (friendId: string) => {
    router.push(`/discover?friendId=${friendId}`);
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

  // Sort friends by overlap percentage (highest first)
  const sortedFriends = [...friends].sort((a, b) => {
    const aOverlap = a.overlapPercentage ?? -1;
    const bOverlap = b.overlapPercentage ?? -1;
    return bOverlap - aOverlap;
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/discover" className="flex items-center gap-2 text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>
            <div className="w-20" /> {/* Spacer */}
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Users className="w-7 h-7 text-violet-400" />
          Friends
        </h1>

        {/* Add Friend Section */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 mb-6">
          <h2 className="text-sm font-medium text-zinc-400 mb-3">Add a friend</h2>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendFriendRequest()}
                placeholder="Enter username or email"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <Button
              onClick={sendFriendRequest}
              disabled={isSearching || !searchQuery.trim()}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add
                </>
              )}
            </Button>
          </div>
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{user.name}</p>
                      {user.username && (
                        <p className="text-sm text-zinc-500">@{user.username}</p>
                      )}
                    </div>
                  </div>
                  {user.friendshipStatus === "accepted" ? (
                    <span className="text-sm text-green-400">Friends</span>
                  ) : user.friendshipStatus === "pending" ? (
                    <span className="text-sm text-amber-400">Pending</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => sendFriendRequest(user.username || user.id)}
                      disabled={addingUser === (user.username || user.id)}
                      className="bg-violet-600 hover:bg-violet-500"
                    >
                      {addingUser === (user.username || user.id) ? (
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
              ))}
            </div>
          )}
          {searchError && (
            <p className="text-sm text-red-400 mt-2">{searchError}</p>
          )}
          {successMessage && (
            <p className="text-sm text-green-400 mt-2">{successMessage}</p>
          )}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Friend Requests ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-white">{request.name}</p>
                    {request.username && (
                      <p className="text-sm text-zinc-500">@{request.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => respondToRequest(request.friendshipId, "accept")}
                      className="bg-green-600 hover:bg-green-500 h-8"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => respondToRequest(request.friendshipId, "reject")}
                      className="border-zinc-700 h-8"
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
          <div className="mb-6">
            <h2 className="text-sm font-medium text-zinc-400 mb-3">
              Pending ({sentRequests.length})
            </h2>
            <div className="space-y-2">
              {sentRequests.map((request) => (
                <div
                  key={request.friendshipId}
                  className="flex items-center justify-between p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-white">{request.name}</p>
                    <p className="text-xs text-zinc-500">Request sent</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeFriend(request.friendshipId)}
                    className="text-zinc-500 hover:text-red-400"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends List */}
        <div>
          <h2 className="text-sm font-medium text-zinc-400 mb-3">
            Your Friends ({friends.length})
          </h2>
          {friends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500">No friends yet</p>
              <p className="text-sm text-zinc-600 mt-1">
                Add friends to see what concerts they&apos;re interested in!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFriends.map((friend) => {
                const isLoadingOverlap = loadingOverlaps.has(friend.id);
                const hasOverlap = friend.overlapPercentage !== undefined;

                return (
                  <div
                    key={friend.friendshipId}
                    className="group bg-zinc-900/50 border border-zinc-800 rounded-xl hover:bg-zinc-800/50 transition-colors overflow-hidden"
                  >
                    {/* Main friend info row */}
                    <Link
                      href={`/friends/${friend.id}`}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                          {/* Match badge overlay */}
                          {hasOverlap && friend.overlapPercentage! > 0 && (
                            <div className="absolute -bottom-1 -right-1">
                              <MatchBadge percentage={friend.overlapPercentage!} size="sm" />
                            </div>
                          )}
                        </div>

                        {/* Name and info */}
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {friend.name}
                            {isLoadingOverlap && (
                              <Loader2 className="w-3 h-3 animate-spin text-zinc-500" />
                            )}
                          </p>
                          {friend.username && (
                            <p className="text-sm text-zinc-500">@{friend.username}</p>
                          )}
                          {hasOverlap && friend.sharedArtistCount! > 0 && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {friend.sharedArtistCount} shared artists
                            </p>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </Link>

                    {/* Action buttons row */}
                    <div className="flex items-center gap-2 px-4 pb-4 pt-0">
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          handleFindConcertsTogether(friend.id);
                        }}
                        className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs h-8"
                      >
                        <Sparkles className="w-3 h-3 mr-1.5" />
                        Find concerts together
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          removeFriend(friend.friendshipId);
                        }}
                        className="text-zinc-500 hover:text-red-400 h-8 ml-auto"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
