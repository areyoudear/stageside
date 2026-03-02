"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumFeatureGateProps {
  children: ReactNode;
  feature: string;
  description?: string;
  isAuthenticated: boolean;
  className?: string;
  showLock?: boolean;
}

/**
 * Wraps a feature to gray it out for anonymous users with a signup tooltip
 */
export function PremiumFeatureGate({
  children,
  feature,
  description,
  isAuthenticated,
  className,
  showLock = true,
}: PremiumFeatureGateProps) {
  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className={cn("relative group", className)}>
      {/* Grayed out content */}
      <div className="opacity-50 pointer-events-none select-none">
        {children}
      </div>
      
      {/* Lock overlay */}
      {showLock && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-zinc-800/90 flex items-center justify-center">
            <Lock className="w-4 h-4 text-zinc-400" />
          </div>
        </div>
      )}
      
      {/* Tooltip on hover */}
      <div className="absolute inset-0 cursor-pointer" onClick={(e) => e.stopPropagation()}>
        <Link href="/signup" className="absolute inset-0">
          <span className="sr-only">Sign up to unlock {feature}</span>
        </Link>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl border border-zinc-700 whitespace-nowrap">
          <p className="text-sm text-white font-medium">{feature}</p>
          {description && (
            <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
          )}
          <p className="text-xs text-cyan-400 mt-1">Sign up free →</p>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-800" />
        </div>
      </div>
    </div>
  );
}

/**
 * A simple badge/pill that shows a locked feature
 */
export function LockedFeatureBadge({
  feature,
  className,
}: {
  feature: string;
  className?: string;
}) {
  return (
    <Link href="/signup">
      <div className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700 text-zinc-500 text-sm cursor-pointer hover:border-cyan-500/50 hover:text-zinc-400 transition-colors group",
        className
      )}>
        <Lock className="w-3.5 h-3.5" />
        <span>{feature}</span>
        <span className="text-cyan-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1">
          Unlock →
        </span>
      </div>
    </Link>
  );
}

/**
 * Match score display that shows "?" for anonymous users
 */
export function MatchScoreDisplay({
  score,
  isAuthenticated,
  size = "md",
}: {
  score?: number;
  isAuthenticated: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "text-lg",
    md: "text-2xl", 
    lg: "text-3xl",
  };
  
  const containerClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-16 h-16",
  };

  if (!isAuthenticated) {
    return (
      <Link href="/signup" className="group relative">
        <div className={cn(
          "rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center group-hover:border-cyan-500/50 transition-colors",
          containerClasses[size]
        )}>
          <span className={cn("font-bold text-zinc-500", sizeClasses[size])}>?</span>
        </div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 shadow-xl border border-zinc-700 whitespace-nowrap">
          <p className="text-sm text-white">See your match score</p>
          <p className="text-xs text-cyan-400">Connect Spotify →</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-800" />
        </div>
      </Link>
    );
  }

  // Authenticated - show actual score
  const getScoreColor = (s: number) => {
    if (s >= 90) return "text-green-400 border-green-500/50";
    if (s >= 70) return "text-emerald-400 border-emerald-500/50";
    if (s >= 50) return "text-amber-400 border-amber-500/50";
    return "text-zinc-400 border-zinc-600";
  };

  return (
    <div className={cn(
      "rounded-full bg-zinc-900 border-2 flex items-center justify-center",
      containerClasses[size],
      score ? getScoreColor(score) : "border-zinc-700"
    )}>
      <span className={cn("font-bold", sizeClasses[size])}>
        {score ?? "—"}
      </span>
    </div>
  );
}
