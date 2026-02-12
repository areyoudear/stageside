/**
 * Concert Buddy - Match multiple users' music preferences
 * Find concerts that everyone in a group would enjoy
 */

import { createAdminClient, getUnifiedMusicProfile } from "./supabase";
import { normalizeArtistName, isSameArtist } from "./music-aggregator";

export interface GroupMember {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "member";
  topArtists: string[];
  topGenres: string[];
}

export interface ConcertGroup {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  createdBy: string;
  members: GroupMember[];
  location?: { lat: number; lng: number; city: string };
  dateRange?: { type: string; start?: string; end?: string };
  createdAt: string;
}

export interface GroupMatchResult {
  concertId: string;
  score: number;
  matchType: "universal" | "majority" | "some";
  matchedMembers: Array<{
    userId: string;
    username: string;
    matchReason: string;
  }>;
  overlapArtists: string[];
  overlapGenres: string[];
}

/**
 * Create a new concert group
 */
export async function createConcertGroup(
  userId: string,
  name: string,
  description?: string
): Promise<ConcertGroup | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("concert_groups")
    .insert({
      name,
      description: description || null,
      created_by: userId,
      is_active: true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Error creating concert group:", error);
    return null;
  }

  // Add creator as owner
  await adminClient.from("concert_group_members").insert({
    group_id: data.id,
    user_id: userId,
    role: "owner",
  });

  // Fetch full group with members
  return getGroupById(data.id);
}

/**
 * Get a concert group by ID
 */
export async function getGroupById(groupId: string): Promise<ConcertGroup | null> {
  const adminClient = createAdminClient();

  const { data: group, error: groupError } = await adminClient
    .from("concert_groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (groupError || !group) {
    console.error("Error fetching group:", groupError);
    return null;
  }

  // Get members with user info
  const { data: members, error: membersError } = await adminClient
    .from("concert_group_members")
    .select(`
      role,
      user:users (id, username, display_name, avatar_url)
    `)
    .eq("group_id", groupId);

  if (membersError) {
    console.error("Error fetching group members:", membersError);
    return null;
  }

  // Get music profiles for each member
  const memberProfiles: GroupMember[] = [];
  for (const member of members || []) {
    const user = member.user as { id: string; username: string; display_name: string; avatar_url?: string };
    const profile = await getUnifiedMusicProfile(user.id);

    memberProfiles.push({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: member.role as "owner" | "admin" | "member",
      topArtists: profile?.topArtists.slice(0, 20).map((a) => a.name) || [],
      topGenres: profile?.topGenres.slice(0, 10) || [],
    });
  }

  return {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.invite_code,
    createdBy: group.created_by,
    members: memberProfiles,
    location: group.location,
    dateRange: group.date_range,
    createdAt: group.created_at,
  };
}

/**
 * Get a group by invite code
 */
export async function getGroupByInviteCode(inviteCode: string): Promise<ConcertGroup | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("concert_groups")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase())
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return null;
  }

  return getGroupById(data.id);
}

/**
 * Join a group via invite code
 */
export async function joinGroup(
  userId: string,
  inviteCode: string
): Promise<{ success: boolean; group?: ConcertGroup; error?: string }> {
  const adminClient = createAdminClient();

  // Find group by invite code
  const { data: group, error: groupError } = await adminClient
    .from("concert_groups")
    .select("id")
    .eq("invite_code", inviteCode.toUpperCase())
    .eq("is_active", true)
    .single();

  if (groupError || !group) {
    return { success: false, error: "Invalid invite code" };
  }

  // Check if already a member
  const { data: existing } = await adminClient
    .from("concert_group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    return { success: false, error: "You're already in this group" };
  }

  // Add member
  const { error: joinError } = await adminClient
    .from("concert_group_members")
    .insert({
      group_id: group.id,
      user_id: userId,
      role: "member",
    });

  if (joinError) {
    console.error("Error joining group:", joinError);
    return { success: false, error: "Failed to join group" };
  }

  const fullGroup = await getGroupById(group.id);
  return { success: true, group: fullGroup! };
}

/**
 * Leave a group
 */
export async function leaveGroup(userId: string, groupId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("concert_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error leaving group:", error);
    return false;
  }

  return true;
}

/**
 * Get all groups for a user
 */
export async function getUserGroups(userId: string): Promise<ConcertGroup[]> {
  const adminClient = createAdminClient();

  const { data: memberships, error } = await adminClient
    .from("concert_group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (error || !memberships) {
    console.error("Error fetching user groups:", error);
    return [];
  }

  const groups: ConcertGroup[] = [];
  for (const membership of memberships) {
    const group = await getGroupById(membership.group_id);
    if (group) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Find overlapping artists between group members
 */
export function findOverlapArtists(members: GroupMember[]): string[] {
  if (members.length < 2) return [];

  const artistCounts = new Map<string, number>();
  const normalizedToOriginal = new Map<string, string>();

  for (const member of members) {
    const seenArtists = new Set<string>();

    for (const artist of member.topArtists) {
      const normalized = normalizeArtistName(artist);

      // Find if this artist already exists (with slight name variation)
      let matchedKey: string | null = null;
      for (const [key] of artistCounts) {
        if (isSameArtist(artist, normalizedToOriginal.get(key) || key)) {
          matchedKey = key;
          break;
        }
      }

      const key = matchedKey || normalized;
      if (!normalizedToOriginal.has(key)) {
        normalizedToOriginal.set(key, artist);
      }

      if (!seenArtists.has(key)) {
        seenArtists.add(key);
        artistCounts.set(key, (artistCounts.get(key) || 0) + 1);
      }
    }
  }

  // Return artists that appear in multiple members' lists
  return Array.from(artistCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([key]) => normalizedToOriginal.get(key) || key);
}

/**
 * Find overlapping genres between group members
 */
export function findOverlapGenres(members: GroupMember[]): string[] {
  if (members.length < 2) return [];

  const genreCounts = new Map<string, number>();

  for (const member of members) {
    const seenGenres = new Set<string>();

    for (const genre of member.topGenres) {
      const normalized = genre.toLowerCase();

      if (!seenGenres.has(normalized)) {
        seenGenres.add(normalized);
        genreCounts.set(normalized, (genreCounts.get(normalized) || 0) + 1);
      }
    }
  }

  // Return genres that appear in multiple members' lists
  return Array.from(genreCounts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
}

/**
 * Calculate group match score for a concert
 */
export function calculateGroupMatchScore(
  concertArtists: string[],
  concertGenres: string[],
  members: GroupMember[]
): GroupMatchResult {
  const matchedMembers: GroupMatchResult["matchedMembers"] = [];
  const overlapArtists = findOverlapArtists(members);
  const overlapGenres = findOverlapGenres(members);

  // Check each member for matches
  for (const member of members) {
    for (const concertArtist of concertArtists) {
      // Check if concert artist is in member's top artists
      const artistMatch = member.topArtists.find((a) => isSameArtist(a, concertArtist));

      if (artistMatch) {
        matchedMembers.push({
          userId: member.userId,
          username: member.username,
          matchReason: `Loves ${artistMatch}`,
        });
        break;
      }

      // Check genre match
      const normalizedConcertGenres = concertGenres.map((g) => g.toLowerCase());
      const genreMatch = member.topGenres.find((g) =>
        normalizedConcertGenres.some((cg) => cg.includes(g) || g.includes(cg))
      );

      if (genreMatch) {
        matchedMembers.push({
          userId: member.userId,
          username: member.username,
          matchReason: `Into ${genreMatch}`,
        });
        break;
      }
    }
  }

  // Determine match type
  let matchType: GroupMatchResult["matchType"];
  const matchRatio = matchedMembers.length / members.length;

  if (matchRatio === 1) {
    matchType = "universal"; // Everyone matches
  } else if (matchRatio >= 0.5) {
    matchType = "majority"; // More than half match
  } else {
    matchType = "some"; // Some people match
  }

  // Calculate score
  // Higher score for universal matches, bonus for overlap artists
  let score = matchRatio * 100;

  // Bonus for overlap artists being in concert
  for (const concertArtist of concertArtists) {
    if (overlapArtists.some((a) => isSameArtist(a, concertArtist))) {
      score += 50; // Big bonus for shared favorites
      break;
    }
  }

  // Bonus for overlap genres
  const normalizedConcertGenres = concertGenres.map((g) => g.toLowerCase());
  for (const genre of overlapGenres) {
    if (normalizedConcertGenres.some((cg) => cg.includes(genre) || genre.includes(cg))) {
      score += 20;
      break;
    }
  }

  return {
    concertId: "", // Will be set by caller
    score: Math.min(Math.round(score), 150), // Cap at 150
    matchType,
    matchedMembers,
    overlapArtists: overlapArtists.slice(0, 10),
    overlapGenres: overlapGenres.slice(0, 10),
  };
}
