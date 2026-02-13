"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Users,
  Copy,
  Check,
  ArrowLeft,
  Search,
  MapPin,
  Calendar,
  Loader2,
  Music,
  ExternalLink,
  Share2,
  Settings,
  UserPlus,
  Sparkles,
  Heart,
} from "lucide-react";

interface GroupMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "member";
  topArtists: string[];
  topGenres: string[];
}

interface ConcertGroup {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  members: GroupMember[];
  location?: { lat: number; lng: number; city: string };
  dateRange?: { type: string; start?: string; end?: string };
  createdAt: string;
}

interface GroupConcert {
  id: string;
  name: string;
  artists: string[];
  date: string;
  time?: string;
  venue: string;
  city: string;
  state?: string;
  image?: string;
  ticketUrl?: string;
  match: {
    score: number;
    type: "universal" | "majority" | "some";
    members: Array<{ userId: string; username: string; matchReason: string }>;
  };
}

interface GroupMatchData {
  group: {
    id: string;
    name: string;
    memberCount: number;
    overlapArtists: string[];
    overlapGenres: string[];
  };
  concerts: GroupConcert[];
  totalCount: number;
  universalMatches: number;
  majorityMatches: number;
}

export default function GroupDetailPage({
  params,
}: {
  params: { groupId: string };
}) {
  const { groupId } = params;
  const { status } = useSession();
  const router = useRouter();

  const [group, setGroup] = useState<ConcertGroup | null>(null);
  const [matchData, setMatchData] = useState<GroupMatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [location, setLocation] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    city: string;
  } | null>(null);
  const [locationResults, setLocationResults] = useState<
    Array<{ city: string; state: string; country: string; lat: number; lng: number }>
  >([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/groups/" + groupId);
    } else if (status === "authenticated") {
      fetchGroup();
    }
  }, [status, router, groupId]);

  const fetchGroup = async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) {
        router.push("/groups");
        return;
      }
      const data = await res.json();
      setGroup(data.group);

      if (data.group.location) {
        setSelectedLocation(data.group.location);
        setLocation(data.group.location.city);
      }
    } catch (error) {
      console.error("Error fetching group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchConcerts = async () => {
    if (!selectedLocation) return;

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        lat: selectedLocation.lat.toString(),
        lng: selectedLocation.lng.toString(),
      });

      const res = await fetch(`/api/groups/${groupId}/matches?${params}`);
      if (res.ok) {
        const data = await res.json();
        setMatchData(data);
      }
    } catch (error) {
      console.error("Error searching concerts:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setLocation(query);
    setSelectedLocation(null);

    if (query.length < 2) {
      setLocationResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/location/autocomplete?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setLocationResults(data.suggestions || []);
      }
    } catch (error) {
      console.error("Error searching location:", error);
    }
  };

  const handleSelectLocation = (loc: typeof locationResults[0]) => {
    setSelectedLocation({
      city: `${loc.city}, ${loc.state || loc.country}`,
      lat: loc.lat,
      lng: loc.lng,
    });
    setLocation(`${loc.city}, ${loc.state || loc.country}`);
    setLocationResults([]);
  };

  const copyInviteCode = () => {
    if (group) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <nav className="border-b border-white/10 bg-gray-950/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/groups"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Groups
          </Link>
          <button
            onClick={copyInviteCode}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
            <span className="font-mono text-white">{group.inviteCode}</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Group Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{group.name}</h1>
          {group.description && (
            <p className="text-gray-400 mb-4">{group.description}</p>
          )}

          {/* Members */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {group.members.map((member, i) => (
                  <div
                    key={member.userId}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 border-2 border-gray-900 flex items-center justify-center text-white text-sm font-medium"
                    style={{ zIndex: 10 - i }}
                    title={member.displayName}
                  >
                    {member.avatarUrl ? (
                      <Image
                        src={member.avatarUrl}
                        alt={member.displayName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      member.displayName[0].toUpperCase()
                    )}
                  </div>
                ))}
              </div>
              <span className="ml-4 text-gray-400">
                {group.members.length} member{group.members.length !== 1 && "s"}
              </span>
            </div>

            <button className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors">
              <UserPlus className="w-4 h-4" />
              Invite Friends
            </button>
          </div>
        </div>

        {/* Overlap Section */}
        {group.members.length > 1 && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              What You Have in Common
            </h2>

            {matchData?.group ? (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Shared Artists */}
                <div>
                  <h3 className="text-sm text-gray-400 mb-3">Shared Artists</h3>
                  {matchData.group.overlapArtists.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matchData.group.overlapArtists.map((artist) => (
                        <span
                          key={artist}
                          className="bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full text-sm"
                        >
                          {artist}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Search for concerts to see overlap
                    </p>
                  )}
                </div>

                {/* Shared Genres */}
                <div>
                  <h3 className="text-sm text-gray-400 mb-3">Shared Genres</h3>
                  {matchData.group.overlapGenres.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {matchData.group.overlapGenres.map((genre) => (
                        <span
                          key={genre}
                          className="bg-pink-500/20 text-pink-300 px-3 py-1 rounded-full text-sm capitalize"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Search for concerts to see overlap
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-400">
                Search for concerts below to see what music tastes you share!
              </p>
            )}
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">
            Find Concerts for Everyone
          </h2>

          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px] relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => handleLocationSearch(e.target.value)}
                placeholder="Enter a city..."
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              {locationResults.length > 0 && (
                <div className="absolute w-full mt-2 bg-gray-800 rounded-xl border border-white/20 overflow-hidden z-10">
                  {locationResults.map((loc, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/10 flex items-center gap-3"
                    >
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {loc.city}, {loc.state || loc.country}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={searchConcerts}
              disabled={!selectedLocation || isSearching}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Find Concerts
            </button>
          </div>
        </div>

        {/* Results */}
        {matchData && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20 text-center">
                <div className="text-3xl font-bold text-green-400">
                  {matchData.universalMatches}
                </div>
                <div className="text-green-300/70 text-sm">Everyone Loves</div>
              </div>
              <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/20 text-center">
                <div className="text-3xl font-bold text-yellow-400">
                  {matchData.majorityMatches}
                </div>
                <div className="text-yellow-300/70 text-sm">Most Will Love</div>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20 text-center">
                <div className="text-3xl font-bold text-blue-400">
                  {matchData.totalCount}
                </div>
                <div className="text-blue-300/70 text-sm">Total Concerts</div>
              </div>
            </div>

            {/* Concert List */}
            <div className="space-y-4">
              {matchData.concerts.map((concert) => (
                <ConcertCard key={concert.id} concert={concert} members={group.members} />
              ))}

              {matchData.concerts.length === 0 && (
                <div className="text-center py-12">
                  <Music className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">
                    No concerts found
                  </h3>
                  <p className="text-gray-400">
                    Try searching a different location or date range
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ConcertCard({
  concert,
  members,
}: {
  concert: GroupConcert;
  members: GroupMember[];
}) {
  const matchColors = {
    universal: "from-green-500 to-emerald-500",
    majority: "from-yellow-500 to-orange-500",
    some: "from-blue-500 to-cyan-500",
  };

  const matchLabels = {
    universal: "Everyone!",
    majority: "Most of you",
    some: "Some match",
  };

  return (
    <div className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:bg-white/[0.07] transition-colors">
      <div className="flex">
        {/* Image */}
        <div className="w-32 h-32 flex-shrink-0 relative">
          {concert.image ? (
            <Image
              src={concert.image}
              alt={concert.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-800 to-pink-800 flex items-center justify-center">
              <Music className="w-8 h-8 text-white/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-white text-lg">
                {concert.artists.slice(0, 2).join(", ")}
                {concert.artists.length > 2 && ` +${concert.artists.length - 2}`}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(concert.date).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {concert.venue}
                </span>
              </div>
            </div>

            {/* Match Badge */}
            <div
              className={`bg-gradient-to-r ${matchColors[concert.match.type]} px-3 py-1 rounded-full text-sm font-medium text-white`}
            >
              {matchLabels[concert.match.type]}
            </div>
          </div>

          {/* Who matches */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {concert.match.members.map((m) => (
              <span
                key={m.userId}
                className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full"
              >
                @{m.username}: {m.matchReason}
              </span>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-3">
            {concert.ticketUrl && (
              <a
                href={concert.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-purple-400 hover:text-purple-300 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Get Tickets
              </a>
            )}
            <button className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
              <Heart className="w-4 h-4" />
              Save
            </button>
            <button className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
