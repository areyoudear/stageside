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

// ============================================
// SMART ITINERARY GENERATOR
// ============================================

export interface ItinerarySlot {
  artist: FestivalArtistMatch;
  priority: 'must-see' | 'recommended' | 'discovery' | 'filler';
  reason: string;
  alternatives?: FestivalArtistMatch[];
}

export interface GeneratedItinerary {
  days: Array<{
    dayName: string;
    date: string;
    slots: ItinerarySlot[];
    totalScore: number;
    mustSeeCount: number;
  }>;
  totalScore: number;
  coverage: number; // % of time with recommended acts
  conflicts: ScheduleConflict[];
  highlights: string[];
}

/**
 * Generate a smart itinerary based on user's music taste
 * Optimizes for:
 * 1. Must-see artists (perfect matches)
 * 2. Avoiding conflicts between top matches
 * 3. Including discovery artists during gaps
 * 4. Rest breaks (don't schedule back-to-back all day)
 */
export function generateSmartItinerary(
  lineup: FestivalArtistMatch[],
  festival: Festival,
  options?: {
    maxPerDay?: number;
    includeDiscoveries?: boolean;
    restBreakMinutes?: number;
  }
): GeneratedItinerary {
  const maxPerDay = options?.maxPerDay ?? 8;
  const includeDiscoveries = options?.includeDiscoveries ?? true;
  const restBreakMinutes = options?.restBreakMinutes ?? 90;

  // Group artists by day
  const artistsByDay = new Map<string, FestivalArtistMatch[]>();
  lineup.forEach(artist => {
    const day = artist.day || 'Day 1';
    if (!artistsByDay.has(day)) {
      artistsByDay.set(day, []);
    }
    artistsByDay.get(day)!.push(artist);
  });

  // Sort days chronologically
  const dayNames = Array.from(artistsByDay.keys()).sort();

  const generatedDays: GeneratedItinerary['days'] = [];
  const allConflicts: ScheduleConflict[] = [];
  let totalScore = 0;
  let totalSlots = 0;
  let scheduledSlots = 0;

  for (const dayName of dayNames) {
    const dayArtists = artistsByDay.get(dayName)!;
    
    // Categorize artists
    const mustSee = dayArtists
      .filter(a => a.matchType === 'perfect')
      .sort((a, b) => b.matchScore - a.matchScore);
    
    const recommended = dayArtists
      .filter(a => a.matchType === 'genre' && a.matchScore >= 50)
      .sort((a, b) => b.matchScore - a.matchScore);
    
    const discoveries = dayArtists
      .filter(a => a.matchType === 'discovery' || (a.matchType === 'genre' && a.matchScore < 50))
      .sort((a, b) => b.matchScore - a.matchScore);
    
    const filler = dayArtists
      .filter(a => a.matchType === 'none')
      .sort((a, b) => (b.headliner ? 1 : 0) - (a.headliner ? 1 : 0));

    // Build schedule for the day
    const daySlots: ItinerarySlot[] = [];
    const scheduledTimes = new Set<string>();
    
    // Helper to check if time slot is available (with rest buffer)
    const isTimeAvailable = (artist: FestivalArtistMatch): boolean => {
      if (!artist.start_time) return true;
      
      const startMins = timeToMinutes(artist.start_time);
      
      for (const scheduled of daySlots) {
        if (!scheduled.artist.start_time || !scheduled.artist.end_time) continue;
        
        const schedStart = timeToMinutes(scheduled.artist.start_time);
        const schedEnd = timeToMinutes(scheduled.artist.end_time);
        
        // Check for overlap including rest break
        if (startMins >= schedStart - restBreakMinutes && startMins < schedEnd + restBreakMinutes) {
          return false;
        }
      }
      
      return true;
    };

    // 1. Schedule all must-see artists first
    for (const artist of mustSee) {
      if (daySlots.length >= maxPerDay) break;
      
      if (isTimeAvailable(artist)) {
        daySlots.push({
          artist,
          priority: 'must-see',
          reason: artist.matchReason || 'In your top artists',
        });
        if (artist.start_time) scheduledTimes.add(artist.start_time);
      } else {
        // Find conflicting artist and note as alternative
        const conflicting = daySlots.find(s => {
          if (!s.artist.start_time || !artist.start_time) return false;
          const sStart = timeToMinutes(s.artist.start_time);
          const sEnd = timeToMinutes(s.artist.end_time || s.artist.start_time) + 60;
          const aStart = timeToMinutes(artist.start_time);
          return aStart >= sStart && aStart < sEnd;
        });
        
        if (conflicting) {
          if (!conflicting.alternatives) conflicting.alternatives = [];
          conflicting.alternatives.push(artist);
          
          allConflicts.push({
            artist1: conflicting.artist,
            artist2: artist,
            day: dayName,
            overlapMinutes: 60, // Approximate
          });
        }
      }
    }

    // 2. Add recommended artists in gaps
    for (const artist of recommended) {
      if (daySlots.length >= maxPerDay) break;
      
      if (isTimeAvailable(artist)) {
        daySlots.push({
          artist,
          priority: 'recommended',
          reason: artist.matchReason || 'Matches your taste',
        });
        if (artist.start_time) scheduledTimes.add(artist.start_time);
      }
    }

    // 3. Add discoveries if enabled and space available
    if (includeDiscoveries) {
      for (const artist of discoveries) {
        if (daySlots.length >= maxPerDay) break;
        
        if (isTimeAvailable(artist)) {
          daySlots.push({
            artist,
            priority: 'discovery',
            reason: 'Discover something new',
          });
          if (artist.start_time) scheduledTimes.add(artist.start_time);
        }
      }
    }

    // 4. Add notable headliners as filler if very sparse
    if (daySlots.length < 3) {
      for (const artist of filler) {
        if (daySlots.length >= 4) break;
        if (!artist.headliner) continue;
        
        if (isTimeAvailable(artist)) {
          daySlots.push({
            artist,
            priority: 'filler',
            reason: 'Popular headliner',
          });
          if (artist.start_time) scheduledTimes.add(artist.start_time);
        }
      }
    }

    // Sort by time
    daySlots.sort((a, b) => {
      if (!a.artist.start_time) return 1;
      if (!b.artist.start_time) return -1;
      return timeToMinutes(a.artist.start_time) - timeToMinutes(b.artist.start_time);
    });

    // Calculate day stats
    const dayScore = daySlots.reduce((sum, s) => sum + s.artist.matchScore, 0);
    const mustSeeCount = daySlots.filter(s => s.priority === 'must-see').length;
    
    totalScore += dayScore;
    totalSlots += dayArtists.filter(a => a.start_time).length;
    scheduledSlots += daySlots.length;

    generatedDays.push({
      dayName,
      date: getDayDate(dayName, festival.dates.start),
      slots: daySlots,
      totalScore: dayScore,
      mustSeeCount,
    });
  }

  // Generate highlights
  const highlights: string[] = [];
  const allMustSee = generatedDays.flatMap(d => d.slots.filter(s => s.priority === 'must-see'));
  
  if (allMustSee.length > 0) {
    highlights.push(`${allMustSee.length} must-see artists scheduled`);
  }
  
  if (allConflicts.length > 0) {
    highlights.push(`${allConflicts.length} schedule conflicts to consider`);
  }

  const discoveryCount = generatedDays.flatMap(d => d.slots.filter(s => s.priority === 'discovery')).length;
  if (discoveryCount > 0) {
    highlights.push(`${discoveryCount} new artists to discover`);
  }

  return {
    days: generatedDays,
    totalScore,
    coverage: totalSlots > 0 ? Math.round((scheduledSlots / totalSlots) * 100) : 0,
    conflicts: allConflicts,
    highlights,
  };
}

function getDayDate(dayName: string, festivalStart: string): string {
  const date = getDateFromDayName(dayName, festivalStart);
  return date?.toISOString().split('T')[0] || '';
}

/**
 * Regenerate itinerary with a swap - user wants to see artist2 instead of artist1
 */
export function swapItineraryArtist(
  itinerary: GeneratedItinerary,
  dayIndex: number,
  slotIndex: number,
  newArtist: FestivalArtistMatch
): GeneratedItinerary {
  const newItinerary = JSON.parse(JSON.stringify(itinerary)) as GeneratedItinerary;
  
  const day = newItinerary.days[dayIndex];
  if (!day || !day.slots[slotIndex]) return itinerary;

  const oldSlot = day.slots[slotIndex];
  
  // Move old artist to alternatives of new slot
  day.slots[slotIndex] = {
    artist: newArtist,
    priority: newArtist.matchType === 'perfect' ? 'must-see' : 'recommended',
    reason: newArtist.matchReason || 'Your choice',
    alternatives: [oldSlot.artist, ...(oldSlot.alternatives || [])],
  };

  // Recalculate day score
  day.totalScore = day.slots.reduce((sum, s) => sum + s.artist.matchScore, 0);
  day.mustSeeCount = day.slots.filter(s => s.priority === 'must-see').length;

  // Recalculate total
  newItinerary.totalScore = newItinerary.days.reduce((sum, d) => sum + d.totalScore, 0);

  return newItinerary;
}

// ============================================
// FESTIVAL BUDDY - GROUP ITINERARY GENERATOR
// ============================================

export interface GroupMemberMatch {
  userId: string;
  username: string;
  displayName: string;
  matchScore: number;
  matchType: 'perfect' | 'genre' | 'discovery' | 'none';
  matchReason?: string;
}

export interface GroupItinerarySlot {
  artist: FestivalArtistMatch;
  decidedBy: 'consensus' | 'strongest-match' | 'compromise';
  winningMember?: { userId: string; username: string; score: number };
  memberMatches: GroupMemberMatch[];
  groupScore: number; // Average of all member scores
  alternatives?: Array<{
    artist: FestivalArtistMatch;
    memberMatches: GroupMemberMatch[];
    groupScore: number;
  }>;
  conflictResolution?: {
    losingMember: { userId: string; username: string; preferredArtist: string };
    reason: string;
  };
}

export interface GroupItineraryDay {
  dayName: string;
  date: string;
  slots: GroupItinerarySlot[];
  groupScore: number;
  consensusCount: number; // Slots where everyone agrees
  compromiseCount: number; // Slots where someone "lost"
}

export interface GeneratedGroupItinerary {
  days: GroupItineraryDay[];
  totalGroupScore: number;
  consensusRate: number; // % of slots with consensus
  memberSatisfaction: Array<{
    userId: string;
    username: string;
    satisfactionScore: number; // % of their must-sees included
    mustSeesCovered: number;
    mustSeesTotal: number;
    compromises: number; // Times they "lost" a conflict
  }>;
  highlights: string[];
}

interface MemberProfile {
  userId: string;
  username: string;
  displayName: string;
  artistMatches: Map<string, { score: number; type: string; reason?: string }>;
}

/**
 * Generate a group festival itinerary
 * Resolves conflicts by strongest match score
 */
export function generateGroupFestivalItinerary(
  lineup: FestivalArtist[],
  festival: Festival,
  memberProfiles: MemberProfile[],
  options?: {
    maxPerDay?: number;
    restBreakMinutes?: number;
  }
): GeneratedGroupItinerary {
  const maxPerDay = options?.maxPerDay ?? 8;
  const restBreakMinutes = options?.restBreakMinutes ?? 60;

  // Calculate match scores for each artist for each member
  const artistGroupScores = new Map<string, {
    artist: FestivalArtist;
    memberMatches: GroupMemberMatch[];
    groupScore: number;
    maxScore: number;
    maxScoreMember: { userId: string; username: string };
  }>();

  for (const artist of lineup) {
    const normalizedName = artist.artist_name.toLowerCase();
    const memberMatches: GroupMemberMatch[] = [];
    let totalScore = 0;
    let maxScore = 0;
    let maxScoreMember = memberProfiles[0];

    for (const member of memberProfiles) {
      const match = member.artistMatches.get(normalizedName);
      const score = match?.score ?? 0;
      const matchType = (match?.type as GroupMemberMatch['matchType']) ?? 'none';

      memberMatches.push({
        userId: member.userId,
        username: member.username,
        displayName: member.displayName,
        matchScore: score,
        matchType,
        matchReason: match?.reason,
      });

      totalScore += score;

      if (score > maxScore) {
        maxScore = score;
        maxScoreMember = member;
      }
    }

    artistGroupScores.set(artist.id, {
      artist,
      memberMatches,
      groupScore: memberProfiles.length > 0 ? totalScore / memberProfiles.length : 0,
      maxScore,
      maxScoreMember: { userId: maxScoreMember.userId, username: maxScoreMember.username },
    });
  }

  // Group artists by day
  const artistsByDay = new Map<string, typeof lineup>();
  lineup.forEach(artist => {
    const day = artist.day || 'Day 1';
    if (!artistsByDay.has(day)) {
      artistsByDay.set(day, []);
    }
    artistsByDay.get(day)!.push(artist);
  });

  const dayNames = Array.from(artistsByDay.keys()).sort();
  const generatedDays: GroupItineraryDay[] = [];
  
  // Track member satisfaction
  const memberStats = new Map<string, {
    mustSeesCovered: number;
    mustSeesTotal: number;
    compromises: number;
  }>();
  
  for (const member of memberProfiles) {
    // Count must-sees (score >= 80)
    let mustSeesTotal = 0;
    member.artistMatches.forEach((match) => {
      if (match.score >= 80) mustSeesTotal++;
    });
    memberStats.set(member.userId, { mustSeesCovered: 0, mustSeesTotal, compromises: 0 });
  }

  let totalConsensus = 0;
  let totalCompromise = 0;
  let totalGroupScore = 0;

  for (const dayName of dayNames) {
    const dayArtists = artistsByDay.get(dayName)!;
    const daySlots: GroupItinerarySlot[] = [];
    const scheduledTimes = new Set<string>();

    // Sort artists by group score (highest first)
    const sortedArtists = dayArtists
      .map(artist => artistGroupScores.get(artist.id)!)
      .filter(Boolean)
      .sort((a, b) => b.groupScore - a.groupScore);

    // Helper to check time availability
    const isTimeAvailable = (artist: FestivalArtist): boolean => {
      if (!artist.start_time) return true;
      
      const startMins = timeToMinutes(artist.start_time);
      
      for (const slot of daySlots) {
        if (!slot.artist.start_time || !slot.artist.end_time) continue;
        
        const schedStart = timeToMinutes(slot.artist.start_time);
        const schedEnd = timeToMinutes(slot.artist.end_time);
        
        if (startMins >= schedStart - restBreakMinutes && startMins < schedEnd + restBreakMinutes) {
          return false;
        }
      }
      
      return true;
    };

    // Find conflicts at same time and resolve
    const getConflictingArtists = (artist: FestivalArtist) => {
      if (!artist.start_time) return [];
      
      const startMins = timeToMinutes(artist.start_time);
      
      return sortedArtists.filter(a => {
        if (a.artist.id === artist.id || !a.artist.start_time) return false;
        const aStart = timeToMinutes(a.artist.start_time);
        const aEnd = timeToMinutes(a.artist.end_time || a.artist.start_time) + 60;
        return startMins >= aStart && startMins < aEnd;
      });
    };

    // Schedule artists
    for (const artistData of sortedArtists) {
      if (daySlots.length >= maxPerDay) break;
      if (!isTimeAvailable(artistData.artist)) continue;

      // Check for conflicts at this time
      const conflicts = getConflictingArtists(artistData.artist);
      
      // Determine decision type
      let decidedBy: GroupItinerarySlot['decidedBy'] = 'consensus';
      let conflictResolution: GroupItinerarySlot['conflictResolution'];
      let winningMember: GroupItinerarySlot['winningMember'];

      // Check if everyone agrees (all have score > 0 or all have score 0)
      const hasSupport = artistData.memberMatches.filter(m => m.matchScore > 0);
      const isConsensus = hasSupport.length === memberProfiles.length || hasSupport.length === 0;

      if (!isConsensus && artistData.maxScore > 0) {
        // Someone specifically wanted this
        decidedBy = 'strongest-match';
        winningMember = {
          userId: artistData.maxScoreMember.userId,
          username: artistData.maxScoreMember.username,
          score: artistData.maxScore,
        };

        // Check if anyone else had a conflicting preference
        for (const conflict of conflicts) {
          const losingMembers = conflict.memberMatches.filter(m => 
            m.matchScore > artistData.memberMatches.find(am => am.userId === m.userId)?.matchScore!
          );
          
          if (losingMembers.length > 0) {
            decidedBy = 'compromise';
            const loser = losingMembers[0];
            conflictResolution = {
              losingMember: {
                userId: loser.userId,
                username: loser.username,
                preferredArtist: conflict.artist.artist_name,
              },
              reason: `${winningMember.username}'s ${artistData.maxScore}% match beats ${loser.username}'s ${loser.matchScore}% for ${conflict.artist.artist_name}`,
            };

            // Track compromise
            const stats = memberStats.get(loser.userId);
            if (stats) stats.compromises++;

            break;
          }
        }
      }

      // Build alternatives list
      const alternatives = conflicts.slice(0, 3).map(c => ({
        artist: c.artist as FestivalArtistMatch,
        memberMatches: c.memberMatches,
        groupScore: c.groupScore,
      }));

      // Track must-sees covered
      for (const member of artistData.memberMatches) {
        if (member.matchScore >= 80) {
          const stats = memberStats.get(member.userId);
          if (stats) stats.mustSeesCovered++;
        }
      }

      if (decidedBy === 'consensus') totalConsensus++;
      else totalCompromise++;

      daySlots.push({
        artist: artistData.artist as FestivalArtistMatch,
        decidedBy,
        winningMember,
        memberMatches: artistData.memberMatches,
        groupScore: artistData.groupScore,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
        conflictResolution,
      });

      if (artistData.artist.start_time) {
        scheduledTimes.add(artistData.artist.start_time);
      }
    }

    // Sort by time
    daySlots.sort((a, b) => {
      if (!a.artist.start_time) return 1;
      if (!b.artist.start_time) return -1;
      return timeToMinutes(a.artist.start_time) - timeToMinutes(b.artist.start_time);
    });

    const dayGroupScore = daySlots.reduce((sum, s) => sum + s.groupScore, 0);
    totalGroupScore += dayGroupScore;

    generatedDays.push({
      dayName,
      date: getDayDate(dayName, festival.dates.start),
      slots: daySlots,
      groupScore: dayGroupScore,
      consensusCount: daySlots.filter(s => s.decidedBy === 'consensus').length,
      compromiseCount: daySlots.filter(s => s.decidedBy === 'compromise').length,
    });
  }

  // Calculate member satisfaction
  const memberSatisfaction = memberProfiles.map(member => {
    const stats = memberStats.get(member.userId)!;
    const satisfactionScore = stats.mustSeesTotal > 0 
      ? Math.round((stats.mustSeesCovered / stats.mustSeesTotal) * 100)
      : 100;

    return {
      userId: member.userId,
      username: member.username,
      satisfactionScore,
      mustSeesCovered: stats.mustSeesCovered,
      mustSeesTotal: stats.mustSeesTotal,
      compromises: stats.compromises,
    };
  });

  // Generate highlights
  const highlights: string[] = [];
  const totalSlots = generatedDays.reduce((sum, d) => sum + d.slots.length, 0);
  const consensusRate = totalSlots > 0 ? Math.round((totalConsensus / totalSlots) * 100) : 0;

  highlights.push(`${consensusRate}% consensus - ${totalConsensus} slots everyone agrees on`);
  
  if (totalCompromise > 0) {
    highlights.push(`${totalCompromise} conflicts resolved by strongest match`);
  }

  const avgSatisfaction = memberSatisfaction.reduce((sum, m) => sum + m.satisfactionScore, 0) / memberSatisfaction.length;
  highlights.push(`${Math.round(avgSatisfaction)}% average satisfaction`);

  return {
    days: generatedDays,
    totalGroupScore,
    consensusRate,
    memberSatisfaction,
    highlights,
  };
}

function getDayDate(dayName: string, festivalStart: string): string {
  const date = getDateFromDayName(dayName, festivalStart);
  return date?.toISOString().split('T')[0] || '';
}
