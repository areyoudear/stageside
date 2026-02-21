"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import Link from "next/link";

const COOKIE_CONSENT_KEY = "stageside_cookie_consent";

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay to avoid layout shift on load
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined");
    // Disable PostHog tracking
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.opt_out_capturing();
    }
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-shrink-0 p-2 bg-cyan-500/10 rounded-lg">
            <Cookie className="w-6 h-6 text-cyan-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300">
              We use cookies to improve your experience and analyze site usage.{" "}
              <Link href="/privacy" className="text-cyan-400 hover:underline">
                Learn more
              </Link>
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleDecline}
              className="flex-1 sm:flex-none px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 sm:flex-none px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Accept
            </button>
          </div>

          <button
            onClick={handleDecline}
            className="absolute top-2 right-2 sm:hidden p-1 text-gray-500 hover:text-white"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Add PostHog type to window
declare global {
  interface Window {
    posthog?: {
      opt_out_capturing: () => void;
      opt_in_capturing: () => void;
    };
  }
}
