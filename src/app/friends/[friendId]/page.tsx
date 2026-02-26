"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Music,
  Loader2,
  Calendar,
  Sparkles,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TasteOverlapCard, type TasteOverlapData } from "@/components/TasteOverlapCard";
import { cn } from "@/lib/utils";

interface FriendProfile {
  id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
  friendSince?: string;
}

interface SharedConcert {
  id: string;
  artistName: string;
  venueName: string;
  city: string;
  date: string;
  imageUrl?: string;
  userInterested: boolean;
  friendInterested: boolean;
  friendGoing: boolean;
}

export default function FriendProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const friendId = params.friendId as string;

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [overlap, setOverlap] = useState<TasteOverlapData | null>(null);
  const [sharedConcerts, setSharedConcerts] = useState<SharedConcert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && friendId) {
      fetchFriendData();
    }
  }, [status, friendId]);

  const fetchFriendData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch friend info and overlap data in parallel
      const [friendRes, overlapRes, concertsRes] = await Promise.all([
        fetch(`/api/friends/${friendId}`),
        fetch(`/api/friends/${friendId}/overlap`),
        fetch(`/api/friends/${friendId}/shared-concerts`).catch(() => null),
      ]);

      if (!friendRes.ok) {
        const data = await friendRes.json();
        throw new Error(data.error || "Friend not found");
      }

      const friendData = await friendRes.json();
      setFriend(friendData);

      if (overlapRes.ok) {
        const overlapData = await overlapRes.json();
        setOverlap(overlapData);
      }

      if (concertsRes?.ok) {
        const concertsData = await concertsRes.json();
        setSharedConcerts(concertsData.concerts || []);
      }
    } catch (err) {
      console.error("Error fetching friend data:", err);
      setError(err instanceof Error ? err.message : "Failed to load friend");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindConcerts = () => {
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
          <h1 className="text-xl font-semibold text-white mb-2">Sign in to view</h1>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (error || !friend) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
        <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link href="/friends" className="flex items-center gap-2 text-zinc-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </Link>
            </div>
          </div>
        </nav>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <Users className="w-16 h-16 text-zinc-700 mb-4" />
          <p className="text-zinc-400 mb-4">{error || "Friend not found"}</p>
          <Link href="/friends">
            <Button variant="outline">Back to Friends</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/friends" className="flex items-center gap-2 text-zinc-400 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
              <span>Friends</span>
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
        {/* Friend Profile Header */}
        <div className="flex flex-col items-center mb-8">
          {/* Avatar */}
          {friend.avatarUrl ? (
            <img
              src={friend.avatarUrl}
              alt={friend.name}
              className="w-24 h-24 rounded-full border-4 border-zinc-800 mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 border-4 border-zinc-800">
              {friend.name.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Name */}
          <h1 className="text-2xl font-bold text-white">{friend.name}</h1>
          {friend.username && (
            <p className="text-zinc-500">@{friend.username}</p>
          )}
          {friend.friendSince && (
            <p className="text-xs text-zinc-600 mt-1">
              Friends since {new Date(friend.friendSince).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          )}
        </div>

        {/* Taste Overlap Card */}
        {overlap && (
          <div className="mb-8">
            <TasteOverlapCard friendName={friend.name} data={overlap} />
          </div>
        )}

        {/* Find Concerts CTA */}
        <div className="mb-8">
          <Button
            onClick={handleFindConcerts}
            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white py-6 text-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Find concerts with {friend.name}
          </Button>
        </div>

        {/* Shared Upcoming Concerts */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            Shared Upcoming Concerts
          </h2>

          {sharedConcerts.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
              <Ticket className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 mb-2">No shared concerts yet</p>
              <p className="text-sm text-zinc-600">
                Discover concerts you&apos;d both enjoy and start planning!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sharedConcerts.map((concert) => (
                <Link
                  key={concert.id}
                  href={`/concerts/${concert.id}`}
                  className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 hover:bg-zinc-800/50 transition-colors group"
                >
                  <div className="flex gap-4">
                    {/* Concert Image */}
                    {concert.imageUrl ? (
                      <img
                        src={concert.imageUrl}
                        alt={concert.artistName}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Music className="w-6 h-6 text-zinc-500" />
                      </div>
                    )}

                    {/* Concert Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white truncate group-hover:text-violet-300 transition-colors">
                        {concert.artistName}
                      </h3>
                      <p className="text-sm text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{concert.venueName} • {concert.city}</span>
                      </p>
                      <p className="text-sm text-zinc-400 mt-1">
                        {new Date(concert.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Interest indicators */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {concert.friendGoing && (
                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                          {friend.name.split(" ")[0]} going
                        </span>
                      )}
                      {concert.friendInterested && !concert.friendGoing && (
                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                          {friend.name.split(" ")[0]} interested
                        </span>
                      )}
                      {concert.userInterested && (
                        <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                          You interested
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
