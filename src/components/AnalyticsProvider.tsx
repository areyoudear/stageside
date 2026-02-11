"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import analytics, { trackScrollDepth, resetScrollDepthTracking, track } from "@/lib/analytics";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * AnalyticsProvider - Wraps the app to provide automatic tracking
 * 
 * Handles:
 * - PostHog initialization
 * - Automatic page view tracking
 * - Scroll depth tracking (25%, 50%, 75%, 100%)
 * - Section visibility tracking via IntersectionObserver
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);

  // Initialize PostHog on mount
  useEffect(() => {
    if (!hasInitialized.current) {
      analytics.init();
      hasInitialized.current = true;
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (!hasInitialized.current) return;
    
    // Reset scroll depth tracking on new page
    resetScrollDepthTracking();
    
    // Track page view
    analytics.trackPageView(pathname);
  }, [pathname, searchParams]);

  // Set up scroll depth tracking
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (docHeight <= 0) return;
      
      const scrollPercent = (scrollTop / docHeight) * 100;

      if (scrollPercent >= 100) {
        trackScrollDepth(100);
      } else if (scrollPercent >= 75) {
        trackScrollDepth(75);
      } else if (scrollPercent >= 50) {
        trackScrollDepth(50);
      } else if (scrollPercent >= 25) {
        trackScrollDepth(25);
      }
    };

    // Throttle scroll handler
    let ticking = false;
    const throttledScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", throttledScroll, { passive: true });
    
    return () => {
      window.removeEventListener("scroll", throttledScroll);
    };
  }, [pathname]);

  return <>{children}</>;
}

/**
 * Hook to track when a section becomes visible
 * Use this for tracking "How it works" section visibility, etc.
 */
export function useTrackSectionVisibility(sectionId: string) {
  const hasTracked = useRef(false);
  const pathname = usePathname();

  const ref = useCallback(
    (node: HTMLElement | null) => {
      if (!node || hasTracked.current) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !hasTracked.current) {
              hasTracked.current = true;
              track("section_visible", {
                section: sectionId,
                path: pathname,
              });
              observer.disconnect();
            }
          });
        },
        {
          threshold: 0.5, // Trigger when 50% visible
        }
      );

      observer.observe(node);

      return () => observer.disconnect();
    },
    [sectionId, pathname]
  );

  // Reset tracking on pathname change
  useEffect(() => {
    hasTracked.current = false;
  }, [pathname]);

  return ref;
}

/**
 * Component to create invisible scroll depth markers
 * Place these at 25%, 50%, 75%, 100% of your page content
 */
export function ScrollDepthMarker({ depth }: { depth: 25 | 50 | 75 | 100 }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            trackScrollDepth(depth);
          }
        });
      },
      {
        threshold: 0,
      }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [depth]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: "absolute",
        width: "1px",
        height: "1px",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}

export default AnalyticsProvider;
