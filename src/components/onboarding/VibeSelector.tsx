"use client";

import { cn } from "@/lib/utils";

interface VibeSelectorProps {
  values: {
    dance: number;
    lyrical: number;
    spectacle: number;
    community: number;
  };
  onChange: (values: {
    dance: number;
    lyrical: number;
    spectacle: number;
    community: number;
  }) => void;
}

const VIBES = [
  {
    key: "dance" as const,
    label: "Dance & move",
    emoji: "💃",
    description: "I go to move my body",
    color: "from-pink-500 to-rose-500",
  },
  {
    key: "lyrical" as const,
    label: "Emotional lyrics",
    emoji: "🎤",
    description: "I go for the words",
    color: "from-blue-500 to-indigo-500",
  },
  {
    key: "spectacle" as const,
    label: "Visual spectacle",
    emoji: "🎆",
    description: "I go for the production",
    color: "from-purple-500 to-violet-500",
  },
  {
    key: "community" as const,
    label: "Community vibe",
    emoji: "🤝",
    description: "I go for the people",
    color: "from-green-500 to-emerald-500",
  },
];

export function VibeSelector({ values, onChange }: VibeSelectorProps) {
  const toggleVibe = (key: keyof typeof values) => {
    // Toggle between 0.2 and 0.8
    const newValue = values[key] > 0.5 ? 0.2 : 0.8;
    onChange({ ...values, [key]: newValue });
  };
  
  return (
    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
      <h3 className="font-medium mb-2">Why do you go out?</h3>
      <p className="text-sm text-zinc-400 mb-6">
        Select all that apply
      </p>
      
      <div className="grid grid-cols-2 gap-3">
        {VIBES.map((vibe) => {
          const isActive = values[vibe.key] > 0.5;
          
          return (
            <button
              key={vibe.key}
              onClick={() => toggleVibe(vibe.key)}
              className={cn(
                "relative p-4 rounded-xl border-2 transition-all text-left",
                isActive
                  ? "border-transparent bg-gradient-to-br " + vibe.color + " text-white"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 text-zinc-300"
              )}
            >
              <span className="text-2xl mb-2 block">{vibe.emoji}</span>
              <span className="font-medium text-sm block">{vibe.label}</span>
              <span className={cn(
                "text-xs mt-1 block",
                isActive ? "text-white/80" : "text-zinc-500"
              )}>
                {vibe.description}
              </span>
              
              {isActive && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
