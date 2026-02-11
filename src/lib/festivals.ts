/**
 * Festival data operations and matching logic
 */

import { createAdminClient } from './supabase';
import type { MusicServiceType, StoredArtist } from './music-types';
import type {
  Festival,
  FestivalArtist,
  FestivalWithMatch,
  FestivalArtistMatch,
  ScheduleDay,
  ScheduleSlot,
  UserFestivalAgenda,
  ScheduleConflict,
} from './festival-types';

// ============================================
// FESTIVAL CRUD OPERATIONS
// ============================================

/**
 * Get all festivals with optional filters
 */
export async function getFestivals(options?: {
  genre?: string;
  upcoming?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Festival[]> {
  const adminClient = createAdminClient();
  
  let query = adminClient
    .from('festivals')
    .select('*')
    .order('dates->start', { ascending: true });
  
  if (options?.upcoming) {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('dates->end', today);
  }
  
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching festivals:', error);
    return [];
  }
  
  // Filter by genre if specified (done in JS since JSONB array filtering is complex)
  let festivals = data as Festival[];
  if (options?.genre) {
    const genreLower = options.genre.toLowerCase();
    festivals = festivals.filter(f => 
      f.genres.some(g => g.toLowerCase().includes(genreLower))
    );
  }
  
  return festivals;
}

/**
 * Get a single festival by ID or slug
 */
export async function getFestival(idOrSlug: string): Promise<Festival | null> {
  const adminClient = createAdminClient();
  
  // Try by ID first, then by slug
  let { data, error } = await adminClient
    .from('festivals')
    .select('*')
    .eq('id', idOrSlug)
    .single();
  
  if (error || !data) {
    const slugResult = await adminClient
      .from('festivals')
      .select('*')
      .eq('slug', idOrSlug)
      .single();
    
    data = slugResult.data;
    error = slugResult.error;
  }
  
  if (error) {
    console.error('Error fetching festival:', error);
    return null;
  }
  
  return data as Festival;
}

/**
 * Get festival lineup (all artists)
 */
export async function getFestivalLineup(festivalId: string): Promise<FestivalArtist[]> {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient
    .from('festival_artists')
    .select('*')
    .eq('festival_id', festivalId)
    .order('headliner', { ascending: false })
    .order('day')
    .order('start_time');
  
  if (error) {
    console.error('Error fetching festival lineup:', error);
    return [];
  }
  
  return data as FestivalArtist[];
}

// ============================================
// MATCHING LOGIC
// ============================================

/**
 * Normalize artist name for comparison
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate match score for a single artist
 */
export function calculateArtistMatch(
  artist: FestivalArtist,
  userArtists: StoredArtist[],
  userGenres: string[]
): FestivalArtistMatch {
  const normalized = normalizeArtistName(artist.artist_name);
  
  // Check if in user's top artists (perfect match)
  const topArtistMatch = userArtists.find(ua => 
    normalizeArtistName(ua.artist_name) === normalized
  );
  
  if (topArtistMatch) {
    return {
      ...artist,
      matchType: 'perfect',
      matchScore: 100,
      matchReason: 'In your top artists',
    };
  }
  
  // Check genre overlap
  const artistGenres = artist.genres || [];
  const genreOverlap = artistGenres.filter(g => 
    userGenres.some(ug => ug.toLowerCase().includes(g.toLowerCase()) || 
                         g.toLowerCase().includes(ug.toLowerCase()))
  );
  
  if (genreOverlap.length > 0) {
    return {
      ...artist,
      matchType: 'genre',
      matchScore: Math.min(70, 30 + genreOverlap.length * 15),
      matchReason: `Matches your ${genreOverlap[0]} taste`,
    };
  }
  
  // Check if similar to user's artists (would need Spotify API)
  // For MVP, we'll use genre proximity as a proxy
  const hasRelatedGenre = artistGenres.some(ag =>
    userGenres.some(ug => {
      const agLower = ag.toLowerCase();
      const ugLower = ug.toLowerCase();
      // Check for related genres (e.g., "indie rock" matches "rock")
      return agLower.includes(ugLower.split(' ')[0]) || 
             ugLower.includes(agLower.split(' ')[0]);
    })
  );
  
  if (hasRelatedGenre) {
    return {
      ...artist,
      matchType: 'discovery',
      matchScore: 40,
      matchReason: 'You might discover',
    };
  }
  
  return {
    ...artist,
    matchType: 'none',
    matchScore: 0,
  };
}

/**
 * Calculate overall festival match percentage
 */
export function calculateFestivalMatch(
  lineup: FestivalArtist[],
  userArtists: StoredArtist[],
  userGenres: string[]
): {
  matchPercentage: number;
  matchedArtistCount: number;
  perfectMatches: FestivalArtistMatch[];
  discoveryMatches: FestivalArtistMatch[];
  allMatches: FestivalArtistMatch[];
} {
  if (lineup.length === 0 || userArtists.length === 0) {
    return {
      matchPercentage: 0,
      matchedArtistCount: 0,
      perfectMatches: [],
      discoveryMatches: [],
      allMatches: lineup.map(a => ({ ...a, matchType: 'none' as const, matchScore: 0 })),
    };
  }
  
  const matchedArtists = lineup.map(artist => 
    calculateArtistMatch(artist, userArtists, userGenres)
  );
  
  const perfectMatches = matchedArtists.filter(a => a.matchType === 'perfect');
  const discoveryMatches = matchedArtists.filter(a => 
    a.matchType === 'discovery' || a.matchType === 'genre'
  );
  
  // Calculate weighted score
  let totalScore = 0;
  for (const match of matchedArtists) {
    totalScore += match.matchScore;
  }
  
  // Normalize to percentage (with some bonuses)
  const maxPossible = lineup.length * 100;
  let percentage = (totalScore / maxPossible) * 100;
  
  // Bonus for having multiple perfect matches
  if (perfectMatches.length >= 5) percentage = Math.min(95, percentage + 10);
  if (perfectMatches.length >= 10) percentage = Math.min(98, percentage + 5);
  
  return {
    matchPercentage: Math.round(percentage),
    matchedArtistCount: perfectMatches.length + discoveryMatches.length,
    perfectMatches: perfectMatches.sort((a, b) => b.matchScore - a.matchScore),
    discoveryMatches: discoveryMatches.sort((a, b) => b.matchScore - a.matchScore),
    allMatches: matchedArtists.sort((a, b) => b.matchScore - a.matchScore),
  };
}

/**
 * Get festival with match data for a user
 */
export async function getFestivalWithMatch(
  festivalId: string,
  userArtists: StoredArtist[],
  userGenres: string[]
): Promise<FestivalWithMatch | null> {
  const festival = await getFestival(festivalId);
  if (!festival) return null;
  
  const lineup = await getFestivalLineup(festivalId);
  const matchData = calculateFestivalMatch(lineup, userArtists, userGenres);
  
  return {
    ...festival,
    matchPercentage: matchData.matchPercentage,
    matchedArtistCount: matchData.matchedArtistCount,
    totalArtistCount: lineup.length,
    perfectMatches: matchData.perfectMatches,
    discoveryMatches: matchData.discoveryMatches,
  };
}

/**
 * Get all festivals with match percentages for a user
 */
export async function getFestivalsWithMatches(
  userArtists: StoredArtist[],
  userGenres: string[],
  options?: { upcoming?: boolean; limit?: number }
): Promise<FestivalWithMatch[]> {
  const festivals = await getFestivals({
    upcoming: options?.upcoming ?? true,
    limit: options?.limit,
  });
  
  const festivalsWithMatches: FestivalWithMatch[] = [];
  
  for (const festival of festivals) {
    const lineup = await getFestivalLineup(festival.id);
    const matchData = calculateFestivalMatch(lineup, userArtists, userGenres);
    
    festivalsWithMatches.push({
      ...festival,
      matchPercentage: matchData.matchPercentage,
      matchedArtistCount: matchData.matchedArtistCount,
      totalArtistCount: lineup.length,
      perfectMatches: matchData.perfectMatches.slice(0, 5),
      discoveryMatches: matchData.discoveryMatches.slice(0, 5),
    });
  }
  
  // Sort by match percentage
  return festivalsWithMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);
}

// ============================================
// SCHEDULE BUILDING
// ============================================

/**
 * Build schedule grid from lineup
 */
export function buildScheduleGrid(
  lineup: FestivalArtistMatch[],
  festivalDates: { start: string; end: string }
): ScheduleDay[] {
  // Get unique days and stages
  const days = new Set<string>();
  const stagesByDay = new Map<string, Set<string>>();
  
  lineup.forEach(artist => {
    if (artist.day) {
      days.add(artist.day);
      if (!stagesByDay.has(artist.day)) {
        stagesByDay.set(artist.day, new Set());
      }
      if (artist.stage) {
        stagesByDay.get(artist.day)!.add(artist.stage);
      }
    }
  });
  
  // If no day info, create generic days from dates
  if (days.size === 0) {
    const start = new Date(festivalDates.start);
    const end = new Date(festivalDates.end);
    const dayNames = ['Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    
    let current = new Date(start);
    while (current <= end) {
      const dayName = dayNames[current.getDay()];
      days.add(dayName);
      current.setDate(current.getDate() + 1);
    }
  }
  
  // Build schedule for each day
  const scheduleDays: ScheduleDay[] = [];
  
  for (const dayName of Array.from(days)) {
    const stages = stagesByDay.get(dayName) || new Set(['Main Stage']);
    const stageArray = Array.from(stages);
    
    // Get artists for this day
    const dayArtists = lineup.filter(a => a.day === dayName);
    
    // Create time slots (every 30 mins from 12pm to 12am)
    const slots: ScheduleSlot[][] = [];
    for (let hour = 12; hour <= 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const timeSlots: ScheduleSlot[] = stageArray.map(stage => {
          const artist = dayArtists.find(a => 
            a.stage === stage && a.start_time === time
          );
          return {
            time,
            stage,
            artist,
            isEmpty: !artist,
          };
        });
        slots.push(timeSlots);
      }
    }
    
    scheduleDays.push({
      date: dayName, // Would be actual date in production
      dayName,
      stages: stageArray,
      slots,
    });
  }
  
  return scheduleDays;
}

/**
 * Detect conflicts in user's agenda
 */
export function detectConflicts(
  agenda: FestivalArtistMatch[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  
  for (let i = 0; i < agenda.length; i++) {
    for (let j = i + 1; j < agenda.length; j++) {
      const a1 = agenda[i];
      const a2 = agenda[j];
      
      // Skip if different days
      if (a1.day !== a2.day) continue;
      
      // Skip if no time info
      if (!a1.start_time || !a1.end_time || !a2.start_time || !a2.end_time) continue;
      
      // Check for overlap
      const a1Start = timeToMinutes(a1.start_time);
      const a1End = timeToMinutes(a1.end_time);
      const a2Start = timeToMinutes(a2.start_time);
      const a2End = timeToMinutes(a2.end_time);
      
      if (a1Start < a2End && a2Start < a1End) {
        const overlapStart = Math.max(a1Start, a2Start);
        const overlapEnd = Math.min(a1End, a2End);
        
        conflicts.push({
          artist1: a1,
          artist2: a2,
          overlapMinutes: overlapEnd - overlapStart,
          day: a1.day!,
        });
      }
    }
  }
  
  return conflicts;
}

function timeToMinutes(time: string): number {
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

// ============================================
// USER AGENDA OPERATIONS
// ============================================

/**
 * Get user's festival agenda
 */
export async function getUserAgenda(
  userId: string,
  festivalId: string
): Promise<UserFestivalAgenda | null> {
  const adminClient = createAdminClient();
  
  const { data, error } = await adminClient
    .from('user_festival_agendas')
    .select('*')
    .eq('user_id', userId)
    .eq('festival_id', festivalId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    console.error('Error fetching agenda:', error);
    return null;
  }
  
  return data as UserFestivalAgenda;
}

/**
 * Save user's festival agenda
 */
export async function saveUserAgenda(
  userId: string,
  festivalId: string,
  artistIds: string[]
): Promise<boolean> {
  const adminClient = createAdminClient();
  
  const { error } = await adminClient
    .from('user_festival_agendas')
    .upsert({
      user_id: userId,
      festival_id: festivalId,
      artist_ids: artistIds,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,festival_id',
    });
  
  if (error) {
    console.error('Error saving agenda:', error);
    return false;
  }
  
  return true;
}

/**
 * Add artist to agenda
 */
export async function addToAgenda(
  userId: string,
  festivalId: string,
  artistId: string
): Promise<boolean> {
  const existing = await getUserAgenda(userId, festivalId);
  const currentIds = existing?.artist_ids || [];
  
  if (currentIds.includes(artistId)) return true;
  
  return saveUserAgenda(userId, festivalId, [...currentIds, artistId]);
}

/**
 * Remove artist from agenda
 */
export async function removeFromAgenda(
  userId: string,
  festivalId: string,
  artistId: string
): Promise<boolean> {
  const existing = await getUserAgenda(userId, festivalId);
  if (!existing) return true;
  
  const newIds = existing.artist_ids.filter(id => id !== artistId);
  return saveUserAgenda(userId, festivalId, newIds);
}

// ============================================
// CALENDAR EXPORT
// ============================================

/**
 * Generate ICS calendar file content
 */
export function generateICS(
  festival: Festival,
  agenda: FestivalArtistMatch[]
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stageside//Festival Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  
  for (const artist of agenda) {
    if (!artist.start_time || !artist.day) continue;
    
    // Build date from day name and festival dates
    const startDate = getDateFromDayName(artist.day, festival.dates.start);
    if (!startDate) continue;
    
    const [startHour, startMin] = artist.start_time.split(':').map(Number);
    startDate.setHours(startHour, startMin, 0, 0);
    
    const endDate = new Date(startDate);
    if (artist.end_time) {
      const [endHour, endMin] = artist.end_time.split(':').map(Number);
      endDate.setHours(endHour, endMin, 0, 0);
    } else {
      endDate.setMinutes(endDate.getMinutes() + 60); // Default 1 hour
    }
    
    const uid = `${festival.id}-${artist.id}@setlist.app`;
    const dtStart = formatICSDate(startDate);
    const dtEnd = formatICSDate(endDate);
    
    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${artist.artist_name}`,
      `LOCATION:${artist.stage || festival.location.venue || festival.name}`,
      `DESCRIPTION:${artist.matchReason || ''} - ${festival.name}`,
      'END:VEVENT'
    );
  }
  
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function getDateFromDayName(dayName: string, festivalStart: string): Date | null {
  const dayMap: Record<string, number> = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6,
  };
  
  const targetDay = dayMap[dayName.toLowerCase()];
  if (targetDay === undefined) return null;
  
  const start = new Date(festivalStart);
  const startDay = start.getDay();
  
  // Find the date that matches the day name
  let diff = targetDay - startDay;
  if (diff < 0) diff += 7;
  
  const result = new Date(start);
  result.setDate(result.getDate() + diff);
  return result;
}

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
