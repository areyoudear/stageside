"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Music,
  Loader2,
  Calendar,
  MapPin,
  Users,
  Heart,
  Check,
  Sparkles,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Concert {
  id: string;
  name: string;
  artists?: string[];
  venue?: { name: string };
  date?: string;
  imageUrl?: string;
  ticketUrl?: string;
  status?: string;
  friendStatus?: string;
  yourStatus?: string;
  markedAt?: string;
}

interface FriendProfile {
  profile: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    memberSince: string;
    friendsSince: string;
  };
  concerts: {
    interested: Concert[];
    going: Concert[];
    past: Concert[];
  };
  sharedInterests: Concert[];
  compatibility: {
    score: number;
    commonArtists: string[];
    totalCommonArtists: number;
  };
}

type Tab = "going" | "interested" | "past" | "shared";

export default function FriendProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("going");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && userId) {
      fetchProfile();
    }
  }, [status, userId]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${userId}/profile`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Failed to load profile");
        return;
      }
      
      setProfile(data);
    } catch (err) {
      setError("Failed to load profile");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-red-400">{error}</p>
        <Link href="/friends">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Friends
          </Button>
        </Link>
      </div>
    );
  }

  if (!profile) return null;

  const tabs: { id: Tab; label: string; count: number; icon: typeof Check }[] = [
    { id: "going", label: "Going", count: profile.concerts.going.length, icon: Check },
    { id: "interested", label: "Interested", count: profile.concerts.interested.length, icon: Heart },
    { id: "shared", label: "Shared", count: profile.sharedInterests.length, icon: Users },
    { id: "past", label: "Past", count: profile.concerts.past.length, icon: Clock },
  ];

  const currentConcerts = 
    activeTab === "going" ? profile.concerts.going :
    activeTab === "interested" ? profile.concerts.interested :
    activeTab === "shared" ? profile.sharedInterests :
    profile.concerts.past;

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/friends" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Friends</span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800 p-6 mb-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              {profile.profile.avatarUrl ? (
                <Image
                  src={profile.profile.avatarUrl}
                  alt={profile.profile.name}
                  width={96}
                  height={96}
                  className="w-24 h-24 rounded-full object-cover border-2 border-zinc-700"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">
                    {profile.profile.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">{profile.profile.name}</h1>
              {profile.profile.username && (
                <p className="text-zinc-400 mb-3">@{profile.profile.username}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
                <span>Friends since {formatDate(profile.profile.friendsSince)}</span>
                <span>Member since {formatDate(profile.profile.memberSince)}</span>
              </div>
            </div>

            {/* Compatibility Score */}
            <div className="text-center p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span className="text-2xl font-bold text-white">{profile.compatibility.score}%</span>
              </div>
              <p className="text-xs text-zinc-400">Music Match</p>
            </div>
          </div>

          {/* Common Artists */}
          {profile.compatibility.commonArtists.length > 0 && (
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <p className="text-sm text-zinc-400 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                {profile.compatibility.totalCommonArtists} artists in common
              </p>
              <div className="flex flex-wrap gap-2">
                {profile.compatibility.commonArtists.map((artist) => (
                  <span
                    key={artist}
                    className="px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-sm"
                  >
                    {artist}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-cyan-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              <span className={cn(
                "px-1.5 py-0.5 rounded text-xs",
                activeTab === tab.id ? "bg-cyan-600" : "bg-zinc-700"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Concert List */}
        {currentConcerts.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No concerts in this category yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentConcerts.map((concert) => (
              <div
                key={concert.id}
                className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4 hover:border-zinc-700 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Concert Image */}
                  {concert.imageUrl && (
                    <Image
                      src={concert.imageUrl}
                      alt={concert.name}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  {/* Concert Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {concert.artists?.join(", ") || concert.name}
                    </h3>
                    {concert.venue?.name && (
                      <p className="text-sm text-zinc-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {concert.venue.name}
                      </p>
                    )}
                    {concert.date && (
                      <p className="text-sm text-zinc-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(concert.date)}
                      </p>
                    )}

                    {/* Shared status indicator */}
                    {activeTab === "shared" && (
                      <div className="flex gap-2 mt-2">
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          concert.friendStatus === "going" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                        )}>
                          {profile.profile.name}: {concert.friendStatus}
                        </span>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded",
                          concert.yourStatus === "going" ? "bg-green-500/20 text-green-400" : "bg-amber-500/20 text-amber-400"
                        )}>
                          You: {concert.yourStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge & Link */}
                  <div className="flex flex-col items-end gap-2">
                    {activeTab !== "shared" && (
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        (concert.status === "going" || activeTab === "going")
                          ? "bg-green-500/20 text-green-400"
                          : "bg-amber-500/20 text-amber-400"
                      )}>
                        {activeTab === "past" ? concert.status : activeTab === "going" ? "Going" : "Interested"}
                      </span>
                    )}
                    {concert.ticketUrl && (
                      <a
                        href={concert.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
