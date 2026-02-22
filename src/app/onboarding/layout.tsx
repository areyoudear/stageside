"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { path: "/onboarding/preferences", title: "Your Vibe", number: 1 },
  { path: "/onboarding/artists", title: "Your Artists", number: 2 },
  { path: "/onboarding/culture", title: "Finishing Touches", number: 3 },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isChecking, setIsChecking] = useState(true);

  // Get current stage from pathname
  const currentStageIndex = STAGES.findIndex((s) => s.path === pathname);
  const currentStage = currentStageIndex >= 0 ? currentStageIndex + 1 : 1;

  // Redirect if not authenticated or already completed
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    if (status === "authenticated" && session?.user?.id) {
      checkOnboardingStatus();
    }
  }, [status, session, router]);

  async function checkOnboardingStatus() {
    try {
      const res = await fetch("/api/user/onboarding-status");
      const data = await res.json();

      // If user already completed embedding onboarding, redirect to discover
      if (data.hasCompletedEmbeddingOnboarding) {
        router.push("/discover");
        return;
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    } finally {
      setIsChecking(false);
    }
  }

  if (status === "loading" || isChecking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Preparing your experience...</p>
        </div>
      </div>
    );
  }

  // Redirect to first step if at /onboarding
  if (pathname === "/onboarding") {
    router.push("/onboarding/preferences");
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-500/5 rounded-full blur-3xl animate-float" />
      </div>

      {/* Progress Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <div className="max-w-2xl mx-auto px-6 py-5">
          {/* Title & Stage */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-white">
                Set up your taste profile
              </h1>
              <p className="text-sm text-zinc-500">
                {STAGES[currentStageIndex]?.title || "Getting started"}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
              <span className="text-sm font-medium text-zinc-400">
                Step {currentStage}
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-sm text-zinc-500">{STAGES.length}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex gap-2">
            {STAGES.map((stage, index) => (
              <div key={stage.path} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    index < currentStage
                      ? "bg-gradient-to-r from-cyan-500 to-purple-500"
                      : index === currentStage - 1
                      ? "bg-gradient-to-r from-cyan-500/50 to-purple-500/50"
                      : "bg-zinc-800"
                  )}
                />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-32 pb-8 px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
