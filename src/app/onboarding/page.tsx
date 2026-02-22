"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Main onboarding page - redirects to the multi-step flow
 * The actual onboarding flow is at:
 * - /onboarding/preferences (Step 1: Live Experience Sliders)
 * - /onboarding/artists (Step 2: Artist Input)
 * - /onboarding/culture (Step 3: Cultural Preferences)
 */
export default function OnboardingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/onboarding/preferences");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
        <p className="text-zinc-400">Loading...</p>
      </div>
    </div>
  );
}
