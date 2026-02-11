/**
 * Types for Festival Planner feature
 */

export interface Festival {
  id: string;
  name: string;
  slug: string;
  location: {
    city: string;
    state?: string;
    country: string;
    venue?: string;
  };
  dates: {
    start: string;
    end: string;
    year: number;
  };
  genres: string[];
  website_url?: string;
  ticket_url?: string;
  image_url: string;
  description?: string;
  capacity?: 'small' | 'medium' | 'large' | 'massive';
  camping: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FestivalArtist {
  id: string;
  festival_id: string;
  artist_name: string;
  normalized_name: string;
  day?: string; // "Friday", "Saturday", etc.
  stage?: string;
  start_time?: string; // "14:00"
  end_time?: string; // "15:30"
  set_length_minutes?: number;
  headliner: boolean;
  spotify_id?: string;
  image_url?: string;
  genres?: string[];
}

export interface FestivalWithMatch extends Festival {
  matchPercentage: number;
  matchedArtistCount: number;
  totalArtistCount: number;
  perfectMatches: FestivalArtistMatch[];
  discoveryMatches: FestivalArtistMatch[];
}

export interface FestivalArtistMatch extends FestivalArtist {
  matchType: 'perfect' | 'discovery' | 'genre' | 'none';
  matchScore: number;
  matchReason?: string;
  similarTo?: string; // "Similar to Doja Cat"
}

export interface UserFestivalAgenda {
  id: string;
  user_id: string;
  festival_id: string;
  artist_ids: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AgendaItem {
  artist: FestivalArtistMatch;
  day: string;
  startTime: string;
  endTime: string;
  stage: string;
  hasConflict: boolean;
  conflictsWith?: string[];
}

export interface ScheduleConflict {
  artist1: FestivalArtistMatch;
  artist2: FestivalArtistMatch;
  overlapMinutes: number;
  day: string;
}

export interface ScheduleDay {
  date: string;
  dayName: string;
  stages: string[];
  slots: ScheduleSlot[][];
}

export interface ScheduleSlot {
  time: string;
  artist?: FestivalArtistMatch;
  stage: string;
  isEmpty: boolean;
}

// API Response types
export interface FestivalsResponse {
  festivals: FestivalWithMatch[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FestivalDetailResponse {
  festival: FestivalWithMatch;
  lineup: FestivalArtistMatch[];
  schedule: ScheduleDay[];
  userAgenda?: string[];
}

// For calendar export
export interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  url?: string;
}
