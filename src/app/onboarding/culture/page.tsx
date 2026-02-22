"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Globe,
  Sparkles,
  Loader2,
  Check,
  Music,
  Languages,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingData, OnboardingSliderValues } from "@/lib/embeddings/types";

// Cultural/Regional music preferences
const CULTURAL_OPTIONS = [
  { id: "hindi_indie", label: "Hindi Indie", emoji: "🇮🇳", region: "South Asia" },
  { id: "latin", label: "Latin / Reggaeton", emoji: "🌴", region: "Latin America" },
  { id: "kpop", label: "K-Pop", emoji: "🇰🇷", region: "Korea" },
  { id: "afrobeats", label: "Afrobeats", emoji: "🌍", region: "Africa" },
  { id: "jpop", label: "J-Pop / J-Rock", emoji: "🇯🇵", region: "Japan" },
  { id: "french", label: "French Pop", emoji: "🇫🇷", region: "France" },
  { id: "german_techno", label: "German Techno", emoji: "🇩🇪", region: "Germany" },
  { id: "uk_garage", label: "UK Garage / Grime", emoji: "🇬🇧", region: "UK" },
  { id: "brazilian", label: "Brazilian", emoji: "🇧🇷", region: "Brazil" },
  { id: "arabic", label: "Arabic Pop", emoji: "🌙", region: "Middle East" },
  { id: "mandopop", label: "Mandopop", emoji: "🇨🇳", region: "China/Taiwan" },
  { id: "russian", label: "Russian", emoji: "🇷🇺", region: "Russia" },
];

// Language preferences
const LANGUAGE_OPTIONS = [
  { id: "english", label: "English", emoji: "🇺🇸" },
  { id: "spanish", label: "Spanish", emoji: "🇪🇸" },
  { id: "hindi", label: "Hindi", emoji: "🇮🇳" },
  { id: "korean", label: "Korean", emoji: "🇰🇷" },
  { id: "japanese", label: "Japanese", emoji: "🇯🇵" },
  { id: "french", label: "French", emoji: "🇫🇷" },
  { id: "portuguese", label: "Portuguese", emoji: "🇧🇷" },
  { id: "german", label: "German", emoji: "🇩🇪" },
];

export default function CulturePage() {
  const router = useRouter();
  
  const [culturalPreferences, setCulturalPreferences] = useState<string[]>([]);
  const [languagePreferences, setLanguagePreferences] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem("stageside_onboarding_culture");
    if (saved) {
      const data = JSON.parse(saved);
      if (data.cultural) setCulturalPreferences(data.cultural);
      if (data.language) setLanguagePreferences(data.language);
    }
  }, []);

  // Save preferences on change
  useEffect(() => {
    localStorage.setItem(
      "stageside_onboarding_culture",
      JSON.stringify({ 
        cultural: culturalPreferences, 
        language: languagePreferences 
      })
    );
  }, [culturalPreferences, languagePreferences]);

  const toggleCultural = (id: string) => {
    setCulturalPreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleLanguage = (id: string) => {
    setLanguagePreferences((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleBack = () => {
    router.push("/onboarding/artists");
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Load all saved onboarding data
      const preferencesData = localStorage.getItem("stageside_onboarding_preferences");
      const artistsData = localStorage.getItem("stageside_onboarding_artists");

      if (!artistsData) {
        setError("Please add some artists first");
        setIsSubmitting(false);
        return;
      }

      const preferences = preferencesData ? JSON.parse(preferencesData) : null;
      const artists = JSON.parse(artistsData);

      if (artists.length < 5) {
        setError("Please add at least 5 artists");
        setIsSubmitting(false);
        return;
      }

      // Build slider values from preferences
      const sliderValues: OnboardingSliderValues = {
        energy: preferences?.sliders?.energy ?? 0.5,
        crowdSize: preferences?.sliders?.crowdSize ?? 0.5,
        exploration: preferences?.sliders?.exploration ?? 0.5,
        vibes: {
          dance: preferences?.vibes?.dance ? 0.8 : 0.2,
          lyrical: preferences?.vibes?.lyrical ? 0.8 : 0.2,
          spectacle: preferences?.vibes?.spectacle ? 0.8 : 0.2,
          community: preferences?.vibes?.community ? 0.8 : 0.2,
        },
      };

      // Extract artist names
      const likedArtists = artists.map((a: { name: string }) => a.name);

      // Combine cultural + language preferences
      const allCulturalPrefs = [
        ...culturalPreferences,
        ...languagePreferences.map((l) => `lang_${l}`),
      ];

      // Build onboarding data
      const onboardingData: OnboardingData = {
        sliderValues,
        likedArtists,
        culturalPreferences: allCulturalPrefs,
        completedStages: [1, 2, 3],
      };

      // Submit to API
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboardingData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete onboarding");
      }

      // Clear localStorage
      localStorage.removeItem("stageside_onboarding_preferences");
      localStorage.removeItem("stageside_onboarding_artists");
      localStorage.removeItem("stageside_onboarding_culture");

      // Success - redirect to discover with celebration
      router.push("/discover?onboarding=complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pb-32">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 mb-6">
          <Globe className="w-10 h-10 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Finishing touches
        </h1>
        <p className="text-zinc-400 text-lg">
          Any cultural or regional preferences? <span className="text-zinc-500">(Optional)</span>
        </p>
      </motion.div>

      {/* Regional Music Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-purple-400" />
          <h3 className="font-semibold text-white">Regional Music</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          Do you follow any regional music scenes?
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CULTURAL_OPTIONS.map((option, index) => {
            const isSelected = culturalPreferences.includes(option.id);
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.02 }}
                onClick={() => toggleCultural(option.id)}
                className={cn(
                  "p-3 rounded-xl border transition-all text-left",
                  isSelected
                    ? "border-purple-500 bg-purple-500/10 text-white"
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 text-zinc-400 hover:text-white"
                )}
              >
                <span className="text-xl mr-2">{option.emoji}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Language Preferences Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center gap-2 mb-4">
          <Languages className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Language Preferences</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-4">
          What languages do you listen to music in?
        </p>

        <div className="flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((option, index) => {
            const isSelected = languagePreferences.includes(option.id);
            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + index * 0.02 }}
                onClick={() => toggleLanguage(option.id)}
                className={cn(
                  "px-4 py-2 rounded-full border transition-all",
                  isSelected
                    ? "border-blue-500 bg-blue-500/10 text-white"
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600 text-zinc-400 hover:text-white"
                )}
              >
                <span className="mr-2">{option.emoji}</span>
                <span className="text-sm font-medium">{option.label}</span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/50 rounded-2xl p-6 border border-zinc-800"
      >
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold text-white">Your Taste Profile</h3>
        </div>

        <div className="space-y-3 text-sm">
          <ProfileRow
            label="Preferences"
            value="✓ Set"
            status="complete"
          />
          <ProfileRow
            label="Artists"
            value={`${JSON.parse(localStorage.getItem("stageside_onboarding_artists") || "[]").length} added`}
            status="complete"
          />
          <ProfileRow
            label="Cultural"
            value={
              culturalPreferences.length + languagePreferences.length > 0
                ? `${culturalPreferences.length + languagePreferences.length} selected`
                : "None (that's fine!)"
            }
            status={
              culturalPreferences.length + languagePreferences.length > 0
                ? "complete"
                : "optional"
            }
          />
        </div>
      </motion.div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={handleBack}
            disabled={isSubmitting}
            className="px-6 py-4 rounded-xl font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={handleComplete}
            disabled={isSubmitting}
            className={cn(
              "flex-1 py-4 px-6 rounded-xl font-semibold text-lg",
              "flex items-center justify-center gap-3",
              "bg-gradient-to-r from-cyan-500 to-purple-500",
              "hover:from-cyan-400 hover:to-purple-400",
              "text-white shadow-lg shadow-cyan-500/25",
              "transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating profile...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Complete Setup
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for profile summary
function ProfileRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "complete" | "optional";
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-zinc-200">{value}</span>
        {status === "complete" ? (
          <Check className="w-4 h-4 text-green-400" />
        ) : (
          <span className="text-xs text-zinc-500">optional</span>
        )}
      </div>
    </div>
  );
}
