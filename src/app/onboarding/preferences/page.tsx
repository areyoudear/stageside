"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Sparkles,
  Coffee,
  Zap,
  Users,
  Building2,
  Compass,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";

// Types
interface SliderValues {
  energy: number;
  crowdSize: number;
  exploration: number;
}

interface VibeValues {
  dance: boolean;
  lyrical: boolean;
  spectacle: boolean;
  community: boolean;
}

// Energy labels
const ENERGY_LABELS = [
  { value: 0, label: "Chill & intimate", emoji: "☕" },
  { value: 0.25, label: "Mellow vibes", emoji: "🎸" },
  { value: 0.5, label: "Balanced energy", emoji: "🎵" },
  { value: 0.75, label: "High energy", emoji: "🔥" },
  { value: 1, label: "Maximum explosion", emoji: "⚡" },
];

// Crowd size labels
const CROWD_LABELS = [
  { value: 0, label: "Tiny clubs (<200)", emoji: "🏠" },
  { value: 0.33, label: "Mid-size venues", emoji: "🎭" },
  { value: 0.66, label: "Large arenas", emoji: "🏟️" },
  { value: 1, label: "Massive festivals", emoji: "🎪" },
];

// Exploration labels
const EXPLORATION_LABELS = [
  { value: 0, label: "My favorites only", emoji: "❤️" },
  { value: 0.5, label: "Mix of both", emoji: "🎲" },
  { value: 1, label: "New discoveries", emoji: "🔮" },
];

// Vibe options
const VIBE_OPTIONS = [
  {
    key: "dance" as const,
    label: "Dance",
    emoji: "💃",
    description: "I go to move my body",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    key: "lyrical" as const,
    label: "Emotional lyrics",
    emoji: "🎤",
    description: "I go for the words",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    key: "spectacle" as const,
    label: "Production spectacle",
    emoji: "🎆",
    description: "I go for the show",
    gradient: "from-purple-500 to-violet-500",
  },
  {
    key: "community" as const,
    label: "Community vibe",
    emoji: "🤝",
    description: "I go for the people",
    gradient: "from-green-500 to-emerald-500",
  },
];

// Slider component
function TheatricalSlider({
  value,
  onChange,
  labels,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  gradient = "from-cyan-500 to-purple-500",
}: {
  value: number;
  onChange: (value: number) => void;
  labels: { value: number; label: string; emoji: string }[];
  leftIcon: React.ElementType;
  rightIcon: React.ElementType;
  gradient?: string;
}) {
  const getCurrentLabel = () => {
    const closest = labels.reduce((prev, curr) =>
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
    return closest;
  };

  const current = getCurrentLabel();

  return (
    <div className="space-y-4">
      {/* Current value display */}
      <div className="flex items-center justify-center gap-3">
        <span className="text-3xl">{current.emoji}</span>
        <span className="text-lg font-medium text-white">{current.label}</span>
      </div>

      {/* Slider track */}
      <div className="relative px-2">
        <div className="flex items-center gap-4">
          <LeftIcon className="w-5 h-5 text-zinc-500 shrink-0" />

          <div className="flex-1 relative h-3">
            {/* Background track */}
            <div className="absolute inset-0 bg-zinc-800 rounded-full" />
            
            {/* Filled track */}
            <div
              className={cn("absolute left-0 top-0 h-full rounded-full bg-gradient-to-r", gradient)}
              style={{ width: `${value * 100}%` }}
            />

            {/* Input */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {/* Thumb */}
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full shadow-lg pointer-events-none",
                "bg-white border-2 border-zinc-200",
                "transition-transform active:scale-110"
              )}
              style={{ left: `calc(${value * 100}% - 12px)` }}
            />
          </div>

          <RightIcon className="w-5 h-5 text-zinc-500 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default function PreferencesPage() {
  const router = useRouter();
  const [sliders, setSliders] = useState<SliderValues>({
    energy: 0.5,
    crowdSize: 0.5,
    exploration: 0.5,
  });
  const [vibes, setVibes] = useState<VibeValues>({
    dance: false,
    lyrical: false,
    spectacle: false,
    community: false,
  });

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem("stageside_onboarding_preferences");
    if (saved) {
      const data = JSON.parse(saved);
      if (data.sliders) setSliders(data.sliders);
      if (data.vibes) setVibes(data.vibes);
    }
  }, []);

  // Save preferences on change
  useEffect(() => {
    localStorage.setItem(
      "stageside_onboarding_preferences",
      JSON.stringify({ sliders, vibes })
    );
  }, [sliders, vibes]);

  const toggleVibe = (key: keyof VibeValues) => {
    setVibes((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const selectedVibesCount = Object.values(vibes).filter(Boolean).length;

  const handleContinue = () => {
    router.push("/onboarding/artists");
  };

  return (
    <div className="max-w-xl mx-auto pb-32">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 mb-6">
          <Sparkles className="w-10 h-10 text-cyan-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          What's your live music vibe?
        </h1>
        <p className="text-zinc-400 text-lg">
          Tell us about the concert experiences you love
        </p>
      </motion.div>

      {/* Sliders Section */}
      <div className="space-y-8 mb-12">
        {/* Energy Slider */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 backdrop-blur-sm"
        >
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Energy Level
          </h3>
          <TheatricalSlider
            value={sliders.energy}
            onChange={(v) => setSliders((p) => ({ ...p, energy: v }))}
            labels={ENERGY_LABELS}
            leftIcon={Coffee}
            rightIcon={Zap}
            gradient="from-cyan-500 to-purple-500"
          />
        </motion.div>

        {/* Crowd Size Slider */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 backdrop-blur-sm"
        >
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Crowd Size
          </h3>
          <TheatricalSlider
            value={sliders.crowdSize}
            onChange={(v) => setSliders((p) => ({ ...p, crowdSize: v }))}
            labels={CROWD_LABELS}
            leftIcon={Users}
            rightIcon={Building2}
            gradient="from-pink-500 to-orange-500"
          />
        </motion.div>

        {/* Exploration Slider */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 backdrop-blur-sm"
        >
          <h3 className="text-sm font-medium text-zinc-400 mb-4 flex items-center gap-2">
            <Compass className="w-4 h-4" />
            Familiar vs Discovering
          </h3>
          <TheatricalSlider
            value={sliders.exploration}
            onChange={(v) => setSliders((p) => ({ ...p, exploration: v }))}
            labels={EXPLORATION_LABELS}
            leftIcon={Star}
            rightIcon={Compass}
            gradient="from-amber-500 to-rose-500"
          />
        </motion.div>
      </div>

      {/* Vibes Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <h3 className="text-lg font-semibold mb-2">Why do you go out?</h3>
        <p className="text-zinc-400 text-sm mb-6">Select all that apply</p>

        <div className="grid grid-cols-2 gap-3">
          {VIBE_OPTIONS.map((vibe, index) => {
            const isSelected = vibes[vibe.key];
            return (
              <motion.button
                key={vibe.key}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                onClick={() => toggleVibe(vibe.key)}
                className={cn(
                  "relative p-5 rounded-xl border-2 transition-all text-left group",
                  isSelected
                    ? `border-transparent bg-gradient-to-br ${vibe.gradient}`
                    : "border-zinc-700 bg-zinc-900/50 hover:border-zinc-600"
                )}
              >
                <span className="text-3xl mb-2 block">{vibe.emoji}</span>
                <span className="font-medium block text-white">{vibe.label}</span>
                <span
                  className={cn(
                    "text-sm mt-1 block",
                    isSelected ? "text-white/80" : "text-zinc-500"
                  )}
                >
                  {vibe.description}
                </span>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Continue Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handleContinue}
            className={cn(
              "w-full py-4 px-6 rounded-xl font-semibold text-lg",
              "flex items-center justify-center gap-3",
              "bg-gradient-to-r from-cyan-500 to-purple-500",
              "hover:from-cyan-400 hover:to-purple-400",
              "text-white shadow-lg shadow-cyan-500/25",
              "transition-all duration-300"
            )}
          >
            Continue
            <ArrowRight className="w-5 h-5" />
          </button>
          <p className="text-center text-xs text-zinc-500 mt-3">
            You can always update these preferences later
          </p>
        </div>
      </div>
    </div>
  );
}
