/**
 * useAnalytics Hook
 * 
 * Provides easy access to analytics tracking from any component.
 * Includes convenience methods for common tracking patterns.
 */

import { useCallback, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import analytics, { 
  track, 
  startTimer, 
  endTimer,
  type AnalyticsEvents 
} from "@/lib/analytics";

export function useAnalytics() {
  const pathname = usePathname();
  const hoverTimers = useRef<Map<string, number>>(new Map());

  /**
   * Track any event with typed properties
   */
  const trackEvent = useCallback(<E extends keyof AnalyticsEvents>(
    event: E,
    properties: AnalyticsEvents[E]
  ) => {
    track(event, properties);
  }, []);

  /**
   * Track a CTA click with location context
   */
  const trackCTA = useCallback((
    cta: AnalyticsEvents['cta_click']['cta'],
    location?: string
  ) => {
    track('cta_click', {
      cta,
      location: location || pathname,
    });
  }, [pathname]);

  /**
   * Track hover interactions (with debounce)
   * Returns onMouseEnter and onMouseLeave handlers
   */
  const trackHover = useCallback((
    concertId: string,
    artist: string,
    matchScore: number
  ) => {
    const timerId = `hover-${concertId}`;
    
    return {
      onMouseEnter: () => {
        hoverTimers.current.set(timerId, Date.now());
      },
      onMouseLeave: () => {
        const startTime = hoverTimers.current.get(timerId);
        hoverTimers.current.delete(timerId);
        
        // Only track if hovered for more than 500ms
        if (startTime && Date.now() - startTime > 500) {
          track('concert_card_hovered', {
            concert_id: concertId,
            artist,
            match_score: matchScore,
          });
        }
      },
    };
  }, []);

  /**
   * Track ticket source expansion with timing
   * Returns handlers for the dropdown
   */
  const trackTicketDropdown = useCallback((concertId: string, sourcesCount: number) => {
    const timerId = `ticket-dropdown-${concertId}`;
    
    return {
      onOpen: () => {
        track('ticket_source_expanded', {
          concert_id: concertId,
          sources_count: sourcesCount,
        });
        startTimer(timerId);
      },
      onClose: () => {
        const timeSpent = endTimer(timerId);
        if (timeSpent > 1000) { // Only track if open for more than 1s
          track('price_compared', {
            concert_id: concertId,
            time_spent_ms: timeSpent,
            sources_viewed: sourcesCount,
          });
        }
      },
    };
  }, []);

  /**
   * Track search with debounce (to avoid tracking every keystroke)
   */
  const trackSearch = useCallback((query: string) => {
    // Only track meaningful searches (3+ chars)
    if (query.length >= 3) {
      track('artist_search', { query });
    }
  }, []);

  /**
   * Track API call timing
   * Returns a wrapper function
   */
  const trackApiCall = useCallback(async <T>(
    apiName: AnalyticsEvents['api_call']['api'],
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    
    try {
      const result = await apiCall();
      track('api_call', {
        api: apiName,
        response_time_ms: Date.now() - startTime,
        success: true,
      });
      return result;
    } catch (error) {
      track('api_call', {
        api: apiName,
        response_time_ms: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }, []);

  return {
    track: trackEvent,
    trackCTA,
    trackHover,
    trackTicketDropdown,
    trackSearch,
    trackApiCall,
    pathname,
  };
}

/**
 * Hook to track focus/blur on email inputs
 */
export function useEmailSignupTracking(location: string) {
  const hasFocused = useRef(false);

  const onFocus = useCallback(() => {
    if (!hasFocused.current) {
      hasFocused.current = true;
      track('email_signup_started', { location });
    }
  }, [location]);

  const onSubmit = useCallback((hasLocation?: boolean) => {
    track('email_signup_completed', { 
      location, 
      has_location: hasLocation 
    });
    hasFocused.current = false;
  }, [location]);

  return { onFocus, onSubmit };
}

/**
 * Hook to track time spent on a page/section
 */
export function useTimeTracking(sectionName: string) {
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      if (startTime.current) {
        const timeSpent = Date.now() - startTime.current;
        // Could track this if needed
        // track('time_spent', { section: sectionName, time_ms: timeSpent });
      }
    };
  }, [sectionName]);
}

export default useAnalytics;
