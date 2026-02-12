"use client";

import { useEffect, useRef } from "react";

interface MusicVisualizerProps {
  className?: string;
  variant?: "bars" | "wave" | "circular";
  color?: "purple" | "green" | "mixed" | "cyan";
  intensity?: "low" | "medium" | "high";
}

/**
 * Animated music visualizer for hero backgrounds
 * Uses CSS animations for performance (no heavy JS)
 */
export function MusicVisualizer({
  className = "",
  variant = "bars",
  color = "mixed",
  intensity = "medium",
}: MusicVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate random animation delays and heights
  useEffect(() => {
    if (!containerRef.current) return;

    const bars = containerRef.current.querySelectorAll(".visualizer-bar");
    bars.forEach((bar, index) => {
      const htmlBar = bar as HTMLElement;
      // Randomize initial delay
      htmlBar.style.animationDelay = `${Math.random() * 1.5}s`;
      // Randomize duration slightly for organic feel
      const baseDuration = intensity === "high" ? 0.4 : intensity === "low" ? 0.8 : 0.6;
      htmlBar.style.animationDuration = `${baseDuration + Math.random() * 0.3}s`;
    });
  }, [intensity]);

  const getColorClasses = () => {
    switch (color) {
      case "purple":
        return "from-violet-500/40 to-fuchsia-500/40";
      case "green":
        return "from-green-500/40 to-emerald-500/40";
      case "cyan":
        return "from-cyan-500/40 to-blue-500/40";
      case "mixed":
      default:
        return "from-cyan-500/30 via-blue-500/30 to-teal-500/30";
    }
  };

  if (variant === "wave") {
    return <WaveVisualizer className={className} color={color} intensity={intensity} />;
  }

  if (variant === "circular") {
    return <CircularVisualizer className={className} color={color} intensity={intensity} />;
  }

  // Default: bars visualizer
  const barCount = 48;
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 flex items-end justify-center gap-[2px] overflow-hidden opacity-30 ${className}`}
      aria-hidden="true"
    >
      {bars.map((_, index) => {
        // Create a wave-like pattern for initial heights
        const baseHeight = 20 + Math.sin(index * 0.3) * 15 + Math.random() * 20;
        const maxHeight = 40 + Math.sin(index * 0.2) * 30 + Math.random() * 30;

        return (
          <div
            key={index}
            className={`visualizer-bar w-1 sm:w-1.5 rounded-t-full bg-gradient-to-t ${getColorClasses()} animate-visualizer`}
            style={{
              height: `${baseHeight}%`,
              "--max-height": `${maxHeight}%`,
              "--min-height": `${baseHeight * 0.3}%`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

/**
 * Wave variant - smooth flowing waves
 */
function WaveVisualizer({
  className = "",
  color = "mixed",
  intensity = "medium",
}: Omit<MusicVisualizerProps, "variant">) {
  const getColorStops = () => {
    switch (color) {
      case "purple":
        return "rgba(139, 92, 246, 0.3), rgba(217, 70, 239, 0.2), rgba(139, 92, 246, 0.3)";
      case "green":
        return "rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.2), rgba(34, 197, 94, 0.3)";
      case "cyan":
        return "rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.3)";
      case "mixed":
      default:
        return "rgba(6, 182, 212, 0.3), rgba(59, 130, 246, 0.2), rgba(20, 184, 166, 0.3)";
    }
  };

  const speed = intensity === "high" ? 8 : intensity === "low" ? 15 : 12;

  return (
    <div className={`absolute inset-0 overflow-hidden opacity-40 ${className}`} aria-hidden="true">
      {/* Multiple wave layers for depth */}
      {[1, 2, 3].map((layer) => (
        <svg
          key={layer}
          className="absolute w-[200%] h-full animate-wave-flow"
          style={{
            animationDuration: `${speed + layer * 2}s`,
            animationDelay: `${layer * -2}s`,
            opacity: 1 - layer * 0.2,
            bottom: `${layer * 5}%`,
          }}
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`wave-gradient-${layer}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={getColorStops().split(", ")[0]} />
              <stop offset="50%" stopColor={getColorStops().split(", ")[1]} />
              <stop offset="100%" stopColor={getColorStops().split(", ")[2]} />
            </linearGradient>
          </defs>
          <path
            fill={`url(#wave-gradient-${layer})`}
            d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </svg>
      ))}
    </div>
  );
}

/**
 * Circular variant - pulsing rings like a speaker
 */
function CircularVisualizer({
  className = "",
  color = "mixed",
  intensity = "medium",
}: Omit<MusicVisualizerProps, "variant">) {
  const ringCount = 6;
  const rings = Array.from({ length: ringCount }, (_, i) => i);

  const getColorClass = (index: number) => {
    if (color === "purple") return "border-violet-500/30";
    if (color === "green") return "border-green-500/30";
    if (color === "cyan") return "border-cyan-500/30";
    // Mixed - alternate colors
    return index % 2 === 0 ? "border-cyan-500/30" : "border-blue-500/20";
  };

  const baseSpeed = intensity === "high" ? 2 : intensity === "low" ? 4 : 3;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center overflow-hidden opacity-40 ${className}`}
      aria-hidden="true"
    >
      {rings.map((_, index) => {
        const size = 200 + index * 120;
        const delay = index * 0.5;
        const duration = baseSpeed + index * 0.5;

        return (
          <div
            key={index}
            className={`absolute rounded-full border-2 ${getColorClass(index)} animate-pulse-ring-out`}
            style={{
              width: `${size}px`,
              height: `${size}px`,
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}

      {/* Center glow */}
      <div className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-xl animate-pulse" />
    </div>
  );
}

/**
 * Compact visualizer for smaller spaces (e.g., cards, headers)
 */
export function MiniVisualizer({ className = "" }: { className?: string }) {
  const bars = Array.from({ length: 5 }, (_, i) => i);

  return (
    <div className={`flex items-end gap-0.5 h-4 ${className}`} aria-hidden="true">
      {bars.map((_, index) => (
        <div
          key={index}
          className="w-0.5 rounded-full bg-gradient-to-t from-green-500 to-emerald-400 animate-mini-visualizer"
          style={{
            height: "60%",
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
