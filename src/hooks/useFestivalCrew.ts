"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { CrewMember } from "@/components/crew/CrewAvatarStack";

interface CrewStats {
  allWant: number;
  someWant: number;
  youOnlyWant: number;
  discoverFromCrew: number;
}

interface Crew {
  id: string;
  name: string | null;
  inviteCode: string;
  festivalId: string;
  isAdmin: boolean;
}

interface CrewSummary {
  id: string;
  name: string | null;
  isAdmin: boolean;
}

interface ScheduleConflict {
  artist1Id: string;
  artist1Name: string;
  artist2Id: string;
  artist2Name: string;
  day: string;
  severity: "high" | "medium" | "low";
  affectedMembers: { id: string; displayName: string }[];
}

interface UseFestivalCrewReturn {
  crew: Crew | null;
  allCrews: CrewSummary[]; // All crews user belongs to for this festival
  members: CrewMember[];
  artistInterests: Record<string, CrewMember[]>; // artistId -> members interested
  stats: CrewStats | null;
  userInterests: Record<string, string>; // artistId -> interestLevel
  conflicts: ScheduleConflict[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createCrew: (name?: string) => Promise<boolean>;
  joinCrew: (inviteCode: string) => Promise<boolean>;
  leaveCrew: () => Promise<boolean>;
  updateCrewName: (name: string) => Promise<boolean>;
  switchCrew: (crewId: string) => Promise<void>;
  setArtistInterest: (artistId: string, artistName: string, level: string | null) => Promise<void>;
  refreshCrew: () => Promise<void>;
  refreshConflicts: () => Promise<void>;
}

export function useFestivalCrew(festivalId: string): UseFestivalCrewReturn {
  const { data: session, status } = useSession();
  const [crew, setCrew] = useState<Crew | null>(null);
  const [allCrews, setAllCrews] = useState<CrewSummary[]>([]);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [artistInterests, setArtistInterests] = useState<Record<string, CrewMember[]>>({});
  const [stats, setStats] = useState<CrewStats | null>(null);
  const [userInterests, setUserInterests] = useState<Record<string, string>>({});
  const [conflicts, setConflicts] = useState<ScheduleConflict[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCrewId, setActiveCrewId] = useState<string | null>(null);

  const fetchCrew = useCallback(async (crewId?: string) => {
    if (status !== "authenticated" || !session?.user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const url = crewId 
        ? `/api/festivals/${festivalId}/crew?crewId=${crewId}`
        : `/api/festivals/${festivalId}/crew`;
      const res = await fetch(url);
      const data = await res.json();

      // Always update all crews list
      setAllCrews(data.allCrews || []);

      if (data.crew) {
        setCrew(data.crew);
        setActiveCrewId(data.crew.id);
        setMembers(data.members?.map((m: any) => ({
          id: m.id,
          displayName: m.displayName || m.username || "Unknown",
          username: m.username,
          avatarUrl: m.avatarUrl,
        })) || []);
        
        // Convert artist interests to CrewMember format
        const interests: Record<string, CrewMember[]> = {};
        Object.entries(data.artistInterests || {}).forEach(([artistId, members]: [string, any]) => {
          interests[artistId] = members.map((m: any) => ({
            id: m.userId,
            displayName: m.displayName || m.username || "Unknown",
            username: m.username,
            avatarUrl: m.avatarUrl,
            interestLevel: m.interestLevel,
          }));
        });
        setArtistInterests(interests);
        setStats(data.stats);
      } else {
        setCrew(null);
        setActiveCrewId(null);
        setMembers([]);
        setArtistInterests({});
        setStats(null);
      }

      // Also fetch user's personal interests
      const interestsRes = await fetch(`/api/festivals/${festivalId}/artist-interest`);
      const interestsData = await interestsRes.json();
      setUserInterests(interestsData.interests || {});

    } catch (err) {
      console.error("Error fetching crew:", err);
      setError("Failed to load crew data");
    } finally {
      setIsLoading(false);
    }
  }, [festivalId, session?.user?.id, status]);

  const fetchConflicts = useCallback(async () => {
    if (!crew?.id) {
      setConflicts([]);
      return;
    }

    try {
      const res = await fetch(`/api/festivals/${festivalId}/crew/conflicts?crewId=${crew.id}`);
      const data = await res.json();
      
      if (data.conflicts) {
        setConflicts(data.conflicts.map((c: any) => ({
          artist1Id: c.artist1.id,
          artist1Name: c.artist1.name,
          artist2Id: c.artist2.id,
          artist2Name: c.artist2.name,
          day: c.day,
          severity: c.severity,
          affectedMembers: c.affectedMembers,
        })));
      } else {
        setConflicts([]);
      }
    } catch (err) {
      console.error("Error fetching conflicts:", err);
    }
  }, [festivalId, crew?.id]);

  // Fetch conflicts when crew changes
  useEffect(() => {
    if (crew?.id) {
      fetchConflicts();
    }
  }, [crew?.id, fetchConflicts]);

  useEffect(() => {
    fetchCrew();
  }, [fetchCrew]);

  const createCrew = useCallback(async (name?: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/festivals/${festivalId}/crew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create crew");
        return false;
      }

      await fetchCrew();
      return true;
    } catch (err) {
      setError("Failed to create crew");
      return false;
    }
  }, [festivalId, fetchCrew]);

  const joinCrew = useCallback(async (inviteCode: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/festivals/${festivalId}/crew/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to join crew");
        return false;
      }

      await fetchCrew();
      return true;
    } catch (err) {
      setError("Failed to join crew");
      return false;
    }
  }, [festivalId, fetchCrew]);

  const leaveCrew = useCallback(async (): Promise<boolean> => {
    if (!crew) return false;

    try {
      const res = await fetch(`/api/festivals/${festivalId}/crew/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to leave crew");
        return false;
      }

      setCrew(null);
      setMembers([]);
      setArtistInterests({});
      setStats(null);
      return true;
    } catch (err) {
      setError("Failed to leave crew");
      return false;
    }
  }, [festivalId, crew]);

  const updateCrewName = useCallback(async (name: string): Promise<boolean> => {
    if (!crew) return false;

    try {
      const res = await fetch(`/api/festivals/${festivalId}/crew`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update crew name");
        return false;
      }

      // Update local state
      setCrew(prev => prev ? { ...prev, name } : null);
      setAllCrews(prev => prev.map(c => c.id === crew.id ? { ...c, name } : c));
      return true;
    } catch (err) {
      setError("Failed to update crew name");
      return false;
    }
  }, [festivalId, crew]);

  const switchCrew = useCallback(async (crewId: string): Promise<void> => {
    setIsLoading(true);
    await fetchCrew(crewId);
  }, [fetchCrew]);

  const setArtistInterest = useCallback(async (
    artistId: string,
    artistName: string,
    level: string | null
  ): Promise<void> => {
    // Optimistic update
    setUserInterests(prev => {
      const next = { ...prev };
      if (level) {
        next[artistId] = level;
      } else {
        delete next[artistId];
      }
      return next;
    });

    try {
      await fetch(`/api/festivals/${festivalId}/artist-interest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artistId, artistName, interestLevel: level }),
      });

      // Refresh crew data to get updated interests from all members
      if (crew) {
        // Debounce the refresh slightly
        setTimeout(() => fetchCrew(), 500);
      }
    } catch (err) {
      console.error("Error setting interest:", err);
      // Revert on error
      setUserInterests(prev => {
        const next = { ...prev };
        delete next[artistId];
        return next;
      });
    }
  }, [festivalId, crew, fetchCrew]);

  return {
    crew,
    allCrews,
    members,
    artistInterests,
    stats,
    userInterests,
    conflicts,
    isLoading,
    error,
    createCrew,
    joinCrew,
    leaveCrew,
    updateCrewName,
    switchCrew,
    setArtistInterest,
    refreshCrew: () => fetchCrew(activeCrewId || undefined),
    refreshConflicts: fetchConflicts,
  };
}
