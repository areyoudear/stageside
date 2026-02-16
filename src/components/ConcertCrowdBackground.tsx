"use client";

import { useEffect, useRef } from "react";

/**
 * Immersive concert crowd background animation
 * Simulates the view from the audience - stage lights, crowd silhouettes, atmosphere
 */
export function ConcertCrowdBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Dark gradient base */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/95 to-gray-900/90" />
      
      {/* Stage lights - animated beams */}
      <div className="absolute inset-0">
        {/* Main spotlight beam - left */}
        <div 
          className="absolute top-0 left-1/4 w-[300px] h-[600px] opacity-20 animate-spotlight-slow"
          style={{
            background: "linear-gradient(180deg, rgba(6, 182, 212, 0.4) 0%, transparent 100%)",
            clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
            transformOrigin: "top center",
          }}
        />
        
        {/* Main spotlight beam - right */}
        <div 
          className="absolute top-0 right-1/4 w-[300px] h-[600px] opacity-20 animate-spotlight-slow-reverse"
          style={{
            background: "linear-gradient(180deg, rgba(168, 85, 247, 0.4) 0%, transparent 100%)",
            clipPath: "polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)",
            transformOrigin: "top center",
            animationDelay: "-2s",
          }}
        />
        
        {/* Center spotlight */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[500px] opacity-15 animate-pulse-slow"
          style={{
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, transparent 100%)",
            clipPath: "polygon(45% 0%, 55% 0%, 100% 100%, 0% 100%)",
          }}
        />
      </div>
      
      {/* Stage glow at top */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent" />
      
      {/* Atmospheric haze */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px] animate-pulse-slow" />
      <div className="absolute top-32 left-1/3 w-[600px] h-[300px] bg-purple-500/5 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: "-1.5s" }} />
      
      {/* Crowd silhouettes - bottom */}
      <svg 
        className="absolute bottom-0 left-0 right-0 h-48 text-black/80"
        viewBox="0 0 1440 200"
        preserveAspectRatio="none"
      >
        {/* Back row - more heads, slightly smaller */}
        <g fill="currentColor" opacity="0.3">
          {Array.from({ length: 60 }).map((_, i) => {
            const x = (i * 24) + (Math.sin(i) * 4);
            const size = 12 + Math.random() * 4;
            const y = 100 + Math.sin(i * 0.5) * 8;
            return (
              <ellipse
                key={`back-${i}`}
                cx={x}
                cy={y}
                rx={size}
                ry={size * 1.2}
              />
            );
          })}
        </g>
        
        {/* Middle row */}
        <g fill="currentColor" opacity="0.5">
          {Array.from({ length: 45 }).map((_, i) => {
            const x = (i * 32) + 8 + (Math.sin(i * 1.2) * 6);
            const size = 14 + Math.random() * 5;
            const y = 130 + Math.sin(i * 0.7) * 10;
            return (
              <ellipse
                key={`mid-${i}`}
                cx={x}
                cy={y}
                rx={size}
                ry={size * 1.3}
              />
            );
          })}
        </g>
        
        {/* Front row - bigger, clearer silhouettes */}
        <g fill="currentColor" opacity="0.8">
          {Array.from({ length: 30 }).map((_, i) => {
            const x = (i * 48) + 16 + (Math.sin(i * 0.8) * 8);
            const size = 18 + Math.random() * 6;
            const y = 165 + Math.sin(i * 0.5) * 12;
            return (
              <ellipse
                key={`front-${i}`}
                cx={x}
                cy={y}
                rx={size}
                ry={size * 1.4}
              />
            );
          })}
        </g>
        
        {/* Raised hands */}
        <g fill="currentColor" opacity="0.6">
          {[120, 280, 450, 650, 820, 1000, 1150, 1320].map((x, i) => (
            <g key={`hand-${i}`} className={i % 2 === 0 ? "animate-hand-wave" : "animate-hand-wave-alt"}>
              <path
                d={`M${x},140 Q${x},100 ${x - 5},80 L${x + 5},80 Q${x},100 ${x},140`}
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            </g>
          ))}
        </g>
      </svg>
      
      {/* Phone lights in crowd */}
      <div className="absolute bottom-24 left-0 right-0 pointer-events-none">
        {[15, 28, 42, 55, 68, 82].map((left, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full animate-phone-light"
            style={{
              left: `${left}%`,
              bottom: `${20 + Math.random() * 40}px`,
              animationDelay: `${i * 0.7}s`,
            }}
          />
        ))}
      </div>
      
      {/* Subtle scan lines for that live video feel */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }}
      />
    </div>
  );
}

/**
 * Simplified version for smaller sections
 */
export function ConcertAtmosphere({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px] animate-pulse-slow" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-purple-600/15 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "-2s" }} />
    </div>
  );
}
