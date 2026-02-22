"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Music, 
  Users, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check,
  Loader2,
  Volume2,
  Users2,
  Compass,
  Heart,
  Mic2,
  Zap,
  Globe
} from "lucide-react";

import { OnboardingSliderValues, OnboardingData } from "@/lib/embeddings/types";
import { EnergySlider } from "@/components/onboarding/EnergySlider";
import { CrowdSizeSlider } from "@/components/onboarding/CrowdSizeSlider";
import { VibeSelector } from "@/components/onboarding/VibeSelector";
import { ArtistInput } from "@/components/onboarding/ArtistInput";
import { CulturalPreferences } from "@/components/onboarding/CulturalPreferences";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: 1, title: "Your Vibe", icon: Volume2 },
  { id: 2, title: "Your Artists", icon: Music },
  { id: 3, title: "Finishing Touches", icon: Sparkles },
];

export default function OnboardingV2Page() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentStage, setCurrentStage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Onboarding state
  const [sliderValues, setSliderValues] = useState<OnboardingSliderValues>({
    energy: 0.5,
    crowdSize: 0.5,
    exploration: 0.5,
    vibes: {
      dance: 0.5,
      lyrical: 0.5,
      spectacle: 0.5,
      community: 0.5,
    },
  });
  
  const [likedArtists, setLikedArtists] = useState<string[]>([]);
  const [culturalPreferences, setCulturalPreferences] = useState<string[]>([]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);
  
  // Check if user already completed onboarding
  useEffect(() => {
    if (session?.user?.id) {
      checkOnboardingStatus();
    }
  }, [session]);
  
  async function checkOnboardingStatus() {
    try {
      const res = await fetch("/api/user/onboarding-status");
      const data = await res.json();
      
      if (data.hasCompletedEmbeddingOnboarding) {
        router.push("/discover");
      }
    } catch (error) {
      console.error("Error checking onboarding status:", error);
    }
  }
  
  // Stage navigation
  function goToNextStage() {
    if (currentStage < STAGES.length) {
      setCurrentStage(currentStage + 1);
    }
  }
  
  function goToPreviousStage() {
    if (currentStage > 1) {
      setCurrentStage(currentStage - 1);
    }
  }
  
  // Validation
  function canProceed(): boolean {
    switch (currentStage) {
      case 1:
        return true; // Sliders always have values
      case 2:
        return likedArtists.length >= 3; // Need at least 3 artists
      case 3:
        return true; // Cultural preferences are optional
      default:
        return false;
    }
  }
  
  // Submit onboarding
  async function handleSubmit() {
    if (!session?.user?.id) return;
    
    setIsSubmitting(true);
    setError(null);
    
    const onboardingData: OnboardingData = {
      sliderValues,
      likedArtists,
      culturalPreferences,
      completedStages: [1, 2, 3],
    };
    
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardingData),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete onboarding");
      }
      
      // Success - redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold">Set up your taste profile</h1>
            <span className="text-sm text-zinc-400">
              Step {currentStage} of {STAGES.length}
            </span>
          </div>
          
          {/* Stage indicators */}
          <div className="flex gap-2">
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all duration-300",
                  stage.id <= currentStage
                    ? "bg-gradient-to-r from-cyan-500 to-purple-500"
                    : "bg-zinc-800"
                )}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pt-28 pb-32 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Stage 1: Vibe Preferences */}
            {currentStage === 1 && (
              <motion.div
                key="stage-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <Volume2 className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">What's your vibe?</h2>
                  <p className="text-zinc-400">
                    Tell us about the live music experiences you love
                  </p>
                </div>
                
                {/* Energy Slider */}
                <EnergySlider
                  value={sliderValues.energy}
                  onChange={(value) => 
                    setSliderValues({ ...sliderValues, energy: value })
                  }
                />
                
                {/* Crowd Size Slider */}
                <CrowdSizeSlider
                  value={sliderValues.crowdSize}
                  onChange={(value) => 
                    setSliderValues({ ...sliderValues, crowdSize: value })
                  }
                />
                
                {/* Vibe Selector */}
                <VibeSelector
                  values={sliderValues.vibes}
                  onChange={(vibes) => 
                    setSliderValues({ ...sliderValues, vibes })
                  }
                />
              </motion.div>
            )}
            
            {/* Stage 2: Artist Input */}
            {currentStage === 2 && (
              <motion.div
                key="stage-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                    <Music className="w-8 h-8 text-pink-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Who do you love?</h2>
                  <p className="text-zinc-400">
                    Add at least 5 artists you'd see live
                  </p>
                </div>
                
                <ArtistInput
                  artists={likedArtists}
                  onChange={setLikedArtists}
                  minArtists={5}
                  maxArtists={20}
                />
              </motion.div>
            )}
            
            {/* Stage 3: Finishing Touches */}
            {currentStage === 3 && (
              <motion.div
                key="stage-3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mx-auto mb-4">
                    <Globe className="w-8 h-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Finishing touches</h2>
                  <p className="text-zinc-400">
                    Any cultural or language preferences? (Optional)
                  </p>
                </div>
                
                <CulturalPreferences
                  selected={culturalPreferences}
                  onChange={setCulturalPreferences}
                />
                
                {/* Summary */}
                <div className="mt-8 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    Your taste profile
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Energy level</span>
                      <span className="text-zinc-200">
                        {sliderValues.energy < 0.3 ? "Chill" : 
                         sliderValues.energy < 0.7 ? "Balanced" : "High energy"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Venue preference</span>
                      <span className="text-zinc-200">
                        {sliderValues.crowdSize < 0.3 ? "Intimate venues" : 
                         sliderValues.crowdSize < 0.7 ? "Mid-size venues" : "Big festivals"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Artists</span>
                      <span className="text-zinc-200">{likedArtists.length} added</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={goToPreviousStage}
            disabled={currentStage === 1}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
              currentStage === 1
                ? "opacity-0 pointer-events-none"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          
          {/* Error Message */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
          
          {/* Next/Submit Button */}
          {currentStage < STAGES.length ? (
            <button
              onClick={goToNextStage}
              disabled={!canProceed()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                canProceed()
                  ? "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90"
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              )}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all",
                isSubmitting
                  ? "bg-zinc-800 text-zinc-500"
                  : "bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating profile...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Complete setup
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
