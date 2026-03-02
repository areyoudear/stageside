/**
 * Festival Schedule Planner - Phase 2
 * 
 * Handles crew schedule calculations:
 * - Conflict detection
 * - Meetup point identification
 * - Free slot detection
 * - Schedule optimization
 */

export interface ScheduledArtist {
  id: string;
  artistName: string;
  stage: string;
  day: string;
  startTime: string; // "14:00"
  endTime: string;   // "15:30"
  headliner: boolean;
  genres: string[];
  imageUrl?: string;
  spotifyId?: string;
}

export interface CrewMemberInterest {
  userId: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  artistId: string;
  interestLevel: 'must-see' | 'interested' | 'maybe';
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  startMinutes: number; // minutes from midnight for sorting
  endMinutes: number;
}

export interface ScheduleConflict {
  type: 'split' | 'overlap';
  timeSlot: TimeSlot;
  options: {
    artist: ScheduledArtist;
    crewMembers: {
      userId: string;
      displayName: string;
      avatarUrl?: string;
      interestLevel: string;
    }[];
  }[];
  suggestedMeetup?: {
    time: string;
    message: string;
  };
}

export interface CrewMeetup {
  artist: ScheduledArtist;
  crewMembers: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    interestLevel: string;
  }[];
  type: 'all-crew' | 'majority' | 'some';
  message: string;
}

export interface FreeSlot {
  day: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  suggestion: string;
}

export interface CrewSchedule {
  day: string;
  slots: ScheduleSlot[];
  conflicts: ScheduleConflict[];
  meetups: CrewMeetup[];
  freeSlots: FreeSlot[];
}

export interface ScheduleSlot {
  artist: ScheduledArtist;
  timeSlot: TimeSlot;
  crewAttending: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    interestLevel: string;
  }[];
  isConflict: boolean;
  conflictWith?: ScheduledArtist[];
  isMeetup: boolean;
  meetupType?: 'all-crew' | 'majority' | 'some';
}

/**
 * Parse time string "14:00" to minutes from midnight
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Format time for display "2:00 PM"
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if two time slots overlap
 */
export function slotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.startMinutes < slot2.endMinutes && slot2.startMinutes < slot1.endMinutes;
}

/**
 * Build time slot from artist
 */
export function buildTimeSlot(artist: ScheduledArtist): TimeSlot {
  return {
    startTime: artist.startTime,
    endTime: artist.endTime,
    startMinutes: timeToMinutes(artist.startTime),
    endMinutes: timeToMinutes(artist.endTime),
  };
}

/**
 * Find conflicts in a crew's schedule for a given day
 */
export function findConflicts(
  artists: ScheduledArtist[],
  crewInterests: Map<string, CrewMemberInterest[]>, // artistId -> crew members interested
  crewSize: number
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  
  // Get artists with any crew interest
  const interestedArtists = artists.filter(a => crewInterests.has(a.id));
  
  // Check each pair for overlaps
  for (let i = 0; i < interestedArtists.length; i++) {
    for (let j = i + 1; j < interestedArtists.length; j++) {
      const artist1 = interestedArtists[i];
      const artist2 = interestedArtists[j];
      
      const slot1 = buildTimeSlot(artist1);
      const slot2 = buildTimeSlot(artist2);
      
      if (slotsOverlap(slot1, slot2)) {
        const crew1 = crewInterests.get(artist1.id) || [];
        const crew2 = crewInterests.get(artist2.id) || [];
        
        // Check if crew is actually split (different people want different artists)
        const users1 = new Set(crew1.map(c => c.userId));
        const users2 = new Set(crew2.map(c => c.userId));
        
        const onlyAt1 = crew1.filter(c => !users2.has(c.userId));
        const onlyAt2 = crew2.filter(c => !users1.has(c.userId));
        const atBoth = crew1.filter(c => users2.has(c.userId));
        
        // It's a real split if some people want different things
        if (onlyAt1.length > 0 && onlyAt2.length > 0) {
          // Find the end time of the earlier set
          const earlierEnd = Math.min(slot1.endMinutes, slot2.endMinutes);
          
          conflicts.push({
            type: 'split',
            timeSlot: {
              startTime: minutesToTime(Math.max(slot1.startMinutes, slot2.startMinutes)),
              endTime: minutesToTime(Math.min(slot1.endMinutes, slot2.endMinutes)),
              startMinutes: Math.max(slot1.startMinutes, slot2.startMinutes),
              endMinutes: Math.min(slot1.endMinutes, slot2.endMinutes),
            },
            options: [
              {
                artist: artist1,
                crewMembers: crew1.map(c => ({
                  userId: c.userId,
                  displayName: c.displayName,
                  avatarUrl: c.avatarUrl,
                  interestLevel: c.interestLevel,
                })),
              },
              {
                artist: artist2,
                crewMembers: crew2.map(c => ({
                  userId: c.userId,
                  displayName: c.displayName,
                  avatarUrl: c.avatarUrl,
                  interestLevel: c.interestLevel,
                })),
              },
            ],
            suggestedMeetup: {
              time: minutesToTime(earlierEnd + 15), // 15 min after earlier set ends
              message: `Split up & recap at ${formatTime(minutesToTime(earlierEnd + 15))}?`,
            },
          });
        }
      }
    }
  }
  
  return conflicts;
}

/**
 * Find crew meetup points (where most/all crew wants to see same artist)
 */
export function findMeetups(
  artists: ScheduledArtist[],
  crewInterests: Map<string, CrewMemberInterest[]>,
  crewSize: number
): CrewMeetup[] {
  const meetups: CrewMeetup[] = [];
  
  for (const artist of artists) {
    const interested = crewInterests.get(artist.id);
    if (!interested || interested.length === 0) continue;
    
    let type: 'all-crew' | 'majority' | 'some';
    let message: string;
    
    if (interested.length === crewSize) {
      type = 'all-crew';
      message = `ALL ${crewSize} — crew meetup! 📍`;
    } else if (interested.length >= Math.ceil(crewSize / 2)) {
      type = 'majority';
      message = `${interested.length}/${crewSize} crew members`;
    } else {
      type = 'some';
      message = `${interested.length} interested`;
    }
    
    // Only flag as meetup if majority or all
    if (type === 'all-crew' || type === 'majority') {
      meetups.push({
        artist,
        crewMembers: interested.map(c => ({
          userId: c.userId,
          displayName: c.displayName,
          avatarUrl: c.avatarUrl,
          interestLevel: c.interestLevel,
        })),
        type,
        message,
      });
    }
  }
  
  return meetups;
}

/**
 * Find free slots in the schedule
 */
export function findFreeSlots(
  artists: ScheduledArtist[],
  crewInterests: Map<string, CrewMemberInterest[]>,
  dayStart: number = 12 * 60, // 12:00 PM
  dayEnd: number = 24 * 60,   // Midnight
  minGapMinutes: number = 30
): FreeSlot[] {
  const freeSlots: FreeSlot[] = [];
  
  // Get artists someone wants to see, sorted by start time
  const attendedArtists = artists
    .filter(a => crewInterests.has(a.id))
    .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  
  if (attendedArtists.length === 0) return [];
  
  // Check gap before first set
  const firstStart = timeToMinutes(attendedArtists[0].startTime);
  if (firstStart - dayStart >= minGapMinutes) {
    freeSlots.push({
      day: attendedArtists[0].day,
      startTime: minutesToTime(dayStart),
      endTime: attendedArtists[0].startTime,
      durationMinutes: firstStart - dayStart,
      suggestion: 'Explore the grounds',
    });
  }
  
  // Check gaps between sets
  for (let i = 0; i < attendedArtists.length - 1; i++) {
    const current = attendedArtists[i];
    const next = attendedArtists[i + 1];
    
    const currentEnd = timeToMinutes(current.endTime);
    const nextStart = timeToMinutes(next.startTime);
    const gap = nextStart - currentEnd;
    
    if (gap >= minGapMinutes) {
      let suggestion: string;
      if (gap >= 90) {
        suggestion = 'Grab food & rest';
      } else if (gap >= 60) {
        suggestion = 'Perfect time for food';
      } else {
        suggestion = 'Quick break';
      }
      
      freeSlots.push({
        day: current.day,
        startTime: current.endTime,
        endTime: next.startTime,
        durationMinutes: gap,
        suggestion,
      });
    }
  }
  
  return freeSlots;
}

/**
 * Build complete crew schedule for a day
 */
export function buildCrewSchedule(
  day: string,
  artists: ScheduledArtist[],
  crewInterests: Map<string, CrewMemberInterest[]>,
  crewSize: number
): CrewSchedule {
  // Filter to this day's artists
  const dayArtists = artists.filter(a => a.day === day);
  
  // Find conflicts
  const conflicts = findConflicts(dayArtists, crewInterests, crewSize);
  
  // Find meetups
  const meetups = findMeetups(dayArtists, crewInterests, crewSize);
  
  // Find free slots
  const freeSlots = findFreeSlots(dayArtists, crewInterests);
  
  // Build schedule slots
  const conflictArtistIds = new Set(
    conflicts.flatMap(c => c.options.map(o => o.artist.id))
  );
  const meetupArtistIds = new Set(meetups.map(m => m.artist.id));
  
  const slots: ScheduleSlot[] = dayArtists
    .filter(a => crewInterests.has(a.id))
    .map(artist => {
      const interested = crewInterests.get(artist.id) || [];
      const isConflict = conflictArtistIds.has(artist.id);
      const meetup = meetups.find(m => m.artist.id === artist.id);
      
      return {
        artist,
        timeSlot: buildTimeSlot(artist),
        crewAttending: interested.map(c => ({
          userId: c.userId,
          displayName: c.displayName,
          avatarUrl: c.avatarUrl,
          interestLevel: c.interestLevel,
        })),
        isConflict,
        isMeetup: !!meetup,
        meetupType: meetup?.type,
      };
    })
    .sort((a, b) => a.timeSlot.startMinutes - b.timeSlot.startMinutes);
  
  return {
    day,
    slots,
    conflicts,
    meetups,
    freeSlots,
  };
}

/**
 * Generate schedule summary stats
 */
export function getScheduleSummary(schedules: CrewSchedule[]): {
  totalConflicts: number;
  totalMeetups: number;
  totalFreeSlots: number;
  allCrewMoments: number;
} {
  return {
    totalConflicts: schedules.reduce((sum, s) => sum + s.conflicts.length, 0),
    totalMeetups: schedules.reduce((sum, s) => sum + s.meetups.length, 0),
    totalFreeSlots: schedules.reduce((sum, s) => sum + s.freeSlots.length, 0),
    allCrewMoments: schedules.reduce(
      (sum, s) => sum + s.meetups.filter(m => m.type === 'all-crew').length, 
      0
    ),
  };
}
