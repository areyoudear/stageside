/**
 * Centralized Analytics Module for Stageside
 * Uses PostHog for event tracking, session recording, and feature flags
 */

import posthog from 'posthog-js';

// ============================================
// TYPES - All trackable events with their properties
// ============================================

export interface AnalyticsEvents {
  // Page & Navigation
  page_view: { path: string; referrer?: string };
  scroll_depth: { depth: 25 | 50 | 75 | 100; path: string };
  section_visible: { section: string; path: string };

  // Landing Page CTAs
  cta_click: { cta: 'connect_spotify' | 'pick_artists' | 'more_services' | 'get_started'; location: string };
  service_selected: { service: 'spotify' | 'apple_music' | 'youtube_music' | 'tidal' | 'deezer' };
  email_signup_started: { location: string };
  email_signup_completed: { location: string; has_location?: boolean };

  // Artist Picker
  artist_search: { query: string };
  artist_added: { artist_name: string; artist_id: string; source: 'search' | 'trending' };
  artist_removed: { artist_name: string; artist_id: string };
  trending_artist_clicked: { artist_name: string; artist_id: string };
  genre_detected: { genres: string[] };

  // Search Parameters
  location_set: { city: string; method: 'search' | 'autocomplete' };
  location_auto_detected: { city: string; lat: number; lng: number };
  date_range_selected: { range: string; start_date: string; end_date: string };
  find_concerts_clicked: { artist_count: number; location: string; date_range: string };

  // Results Interaction
  results_loaded: { count: number; perfect_matches: number; high_matches: number; location: string };
  filter_used: { filter: 'chill' | 'high_energy' | 'intimate' | 'big_shows' | 'all'; result_count: number };
  sort_changed: { sort: 'best_match' | 'date' | 'price' };
  concert_card_clicked: { concert_id: string; artist: string; match_score: number; position: number };
  concert_card_hovered: { concert_id: string; artist: string; match_score: number };
  match_tooltip_viewed: { concert_id: string };
  concert_saved: { concert_id: string; artist: string; match_score?: number };
  concert_unsaved: { concert_id: string; artist: string };
  concert_shared: { concert_id: string; artist: string; method: 'native' | 'clipboard' };

  // Ticket Behavior
  ticket_source_expanded: { concert_id: string; sources_count: number };
  ticket_link_clicked: { 
    vendor: 'ticketmaster' | 'seatgeek' | 'stubhub' | 'vividseats' | 'gametime' | 'other';
    concert_id: string;
    artist: string;
    price?: number;
    is_cheapest?: boolean;
  };
  price_compared: { concert_id: string; time_spent_ms: number; sources_viewed: number };

  // Conversion Funnel
  spotify_connect_started: { location: string };
  spotify_connect_completed: { artist_count: number };
  upsell_banner_shown: { location: string; trigger: 'low_matches' | 'scroll' | 'manual' };
  upsell_banner_clicked: { location: string };

  // API Tracking
  api_call: { 
    api: 'spotify' | 'ticketmaster' | 'bandsintown' | 'seatgeek' | 'artists_search';
    response_time_ms: number;
    success: boolean;
    error?: string;
  };

  // Feedback
  feedback_opened: { page: string };
  feedback_submitted: { page: string; rating?: number };

  // Auth & Signup
  user_signup_started: { method: 'email' | 'google' };
  user_signup_completed: { method: 'email' | 'google'; user_id: string };
  user_login: { method: 'email' | 'google' };

  // Invites & Groups
  invite_link_copied: { group_id: string; group_name: string };
  invite_code_shared: { group_id: string; method: 'native' | 'clipboard' };
  group_joined_via_invite: { group_id: string; invite_code: string };
  group_created: { group_id: string; group_name: string };

  // Settings
  settings_saved: { artist_count: number; genre_count: number };
  user_signed_out: Record<string, never>;
}

// ============================================
// INITIALIZATION
// ============================================

let isInitialized = false;

export function initAnalytics() {
  if (isInitialized) return;
  if (typeof window === 'undefined') return;
  
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

  if (!posthogKey) {
    console.warn('[Analytics] PostHog key not found. Analytics disabled.');
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    // Capture pageviews manually for more control
    capture_pageview: false,
    // Capture page leaves for session insights
    capture_pageleave: true,
    // Respect Do Not Track
    respect_dnt: true,
    // Session recording (optional - can enable later)
    disable_session_recording: true,
    // Persist across sessions
    persistence: 'localStorage+cookie',
    // Bootstrap with any existing distinct_id
    bootstrap: {},
    // Loaded callback
    loaded: (posthog) => {
      // In development, you can enable debug mode
      if (process.env.NODE_ENV === 'development') {
        // posthog.debug(); // Uncomment to see all events in console
      }
    },
  });

  isInitialized = true;
}

// ============================================
// CORE TRACKING FUNCTIONS
// ============================================

/**
 * Track an event with typed properties
 */
export function track<E extends keyof AnalyticsEvents>(
  event: E,
  properties: AnalyticsEvents[E]
) {
  if (typeof window === 'undefined') return;
  
  if (!isInitialized) {
    console.warn(`[Analytics] Not initialized. Event '${event}' not tracked.`);
    return;
  }

  // Add common properties
  const enrichedProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    path: window.location.pathname,
  };

  posthog.capture(event, enrichedProperties);
}

/**
 * Track a page view
 */
export function trackPageView(path?: string) {
  if (typeof window === 'undefined') return;
  
  const currentPath = path || window.location.pathname;
  
  track('page_view', {
    path: currentPath,
    referrer: document.referrer || undefined,
  });
}

/**
 * Identify a user (after Spotify connect, etc.)
 */
export function identify(userId: string, traits?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!isInitialized) return;

  posthog.identify(userId, traits);
}

/**
 * Reset user identity (on logout)
 */
export function reset() {
  if (typeof window === 'undefined') return;
  if (!isInitialized) return;

  posthog.reset();
}

/**
 * Set user properties without identifying
 */
export function setUserProperties(properties: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!isInitialized) return;

  posthog.people.set(properties);
}

// ============================================
// SCROLL DEPTH TRACKING
// ============================================

const scrollDepthsTracked = new Set<number>();

export function trackScrollDepth(depth: 25 | 50 | 75 | 100) {
  if (scrollDepthsTracked.has(depth)) return;
  
  scrollDepthsTracked.add(depth);
  track('scroll_depth', {
    depth,
    path: window.location.pathname,
  });
}

export function resetScrollDepthTracking() {
  scrollDepthsTracked.clear();
}

// ============================================
// TIMING HELPERS
// ============================================

const timers = new Map<string, number>();

/**
 * Start a timer for tracking durations
 */
export function startTimer(name: string) {
  timers.set(name, Date.now());
}

/**
 * End a timer and get elapsed time
 */
export function endTimer(name: string): number {
  const start = timers.get(name);
  timers.delete(name);
  
  if (!start) return 0;
  return Date.now() - start;
}

// ============================================
// CONVENIENCE WRAPPERS
// ============================================

export const analytics = {
  init: initAnalytics,
  track,
  trackPageView,
  identify,
  reset,
  setUserProperties,
  trackScrollDepth,
  resetScrollDepthTracking,
  startTimer,
  endTimer,
  
  // PostHog instance access for advanced usage
  get posthog() {
    return posthog;
  },
};

export default analytics;
