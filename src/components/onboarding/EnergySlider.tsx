"use client";

import { useState } from "react";
import { Coffee, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnergySliderProps {
  value: number;
  onChange: (value: number) => void;
}

const ENERGY_LABELS = [
  { value: 0, label: "Chill vibes", emoji: "☕" },
  { value: 0.25, label: "Mellow", emoji: "🎸" },
  { value: 0.5, label: "Balanced", emoji: "🎵" },
  { value: 0.75, label: "Energetic", emoji: "🔥" },
  { value: 1, label: "Maximum energy", emoji: "⚡" },
];

export function EnergySlider({ value, onChange }: EnergySliderProps) {
  const getCurrentLabel = () => {
    const closest = ENERGY_LABELS.reduce((prev, curr) => 
      Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev
    );
    return closest;
  };
  
  const current = getCurrentLabel();
  
  return (
    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium">Energy level</h3>
        <span className="text-2xl">{current.emoji}</span>
      </div>
      
      <p className="text-sm text-zinc-400 mb-6">
        {current.label}
      </p>
      
      {/* Slider */}
      <div className="relative">
        <div className="flex items-center gap-4">
          <Coffee className="w-5 h-5 text-zinc-500" />
          
          <div className="flex-1 relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-6
                [&::-webkit-slider-thumb]:h-6
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-gradient-to-r
                [&::-webkit-slider-thumb]:from-cyan-500
                [&::-webkit-slider-thumb]:to-purple-500
                [&::-webkit-slider-thumb]:cursor-grab
                [&::-webkit-slider-thumb]:active:cursor-grabbing
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:border-2
                [&::-webkit-slider-thumb]:border-white/20
              "
            />
            
            {/* Gradient track */}
            <div 
              className="absolute top-0 left-0 h-2 rounded-full pointer-events-none bg-gradient-to-r from-cyan-500/50 to-purple-500/50"
              style={{ width: `${value * 100}%` }}
            />
          </div>
          
          <Zap className="w-5 h-5 text-yellow-500" />
        </div>
      </div>
      
      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-zinc-500">
        <span>Chill & intimate</span>
        <span>High-energy & explosive</span>
      </div>
    </div>
  );
}
