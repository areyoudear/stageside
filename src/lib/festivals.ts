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
