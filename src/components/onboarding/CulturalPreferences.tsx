"use client";

import { cn } from "@/lib/utils";

interface CulturalPreferencesProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

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
];

export function CulturalPreferences({ selected, onChange }: CulturalPreferencesProps) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };
  
  return (
    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
      <h3 className="font-medium mb-2">Cultural preferences</h3>
      <p className="text-sm text-zinc-400 mb-6">
        Do you have any language or regional preferences? (Optional)
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CULTURAL_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.id);
          
          return (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className={cn(
                "p-3 rounded-lg border transition-all text-left",
                isSelected
                  ? "border-cyan-500 bg-cyan-500/10 text-white"
                  : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 text-zinc-400"
              )}
            >
              <span className="text-lg mr-2">{option.emoji}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
      
      {selected.length > 0 && (
        <p className="text-xs text-zinc-500 mt-4">
          Selected: {selected.length} preference{selected.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
