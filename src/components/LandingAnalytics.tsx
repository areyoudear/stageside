"use client";

import { useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";

/**
 * Tracked link for landing page CTAs
 */
interface TrackedLinkProps {
  href: string;
  cta: 'connect_spotify' | 'pick_artists' | 'more_services' | 'get_started';
  children: ReactNode;
  className?: string;
}

export function TrackedLink({ href, cta, children, className }: TrackedLinkProps) {
  const handleClick = () => {
    track('cta_click', {
      cta,
      location: 'landing_page',
    });
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}

/**
 * Section visibility tracker
 * Wrap a section to track when it becomes visible
 */
interface TrackedSectionProps {
  sectionId: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function TrackedSection({ sectionId, children, className, id }: TrackedSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTracked.current) {
            hasTracked.current = true;
            track('section_visible', {
              section: sectionId,
              path: window.location.pathname,
            });
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% visible
      }
    );

    observer.observe(sectionRef.current);

    return () => observer.disconnect();
  }, [sectionId]);

  return (
    <section ref={sectionRef} className={className} id={id}>
      {children}
    </section>
  );
}

export default TrackedLink;
