"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullScreen?: boolean;
}

export function LoadingState({
  message = "Loading...",
  className,
  fullScreen = false,
}: LoadingStateProps) {
  if (fullScreen) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-16", className)}>
      <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-4" />
      <p className="text-zinc-400 text-sm">{message}</p>
    </div>
  );
}

// Inline loading spinner
export function LoadingSpinner({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizes = {
    sm: "w-4 h-4",
    default: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2
      className={cn("animate-spin text-cyan-500", sizes[size], className)}
    />
  );
}
