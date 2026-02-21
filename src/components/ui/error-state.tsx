"use client";

import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorType = "network" | "server" | "auth" | "notFound" | "generic";

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

const errorConfigs: Record<ErrorType, { icon: typeof AlertTriangle; title: string; message: string }> = {
  network: {
    icon: WifiOff,
    title: "Connection problem",
    message: "Please check your internet connection and try again.",
  },
  server: {
    icon: ServerCrash,
    title: "Something went wrong",
    message: "We're having trouble loading this. Please try again in a moment.",
  },
  auth: {
    icon: ShieldAlert,
    title: "Session expired",
    message: "Please sign in again to continue.",
  },
  notFound: {
    icon: AlertTriangle,
    title: "Not found",
    message: "The content you're looking for doesn't exist or has been removed.",
  },
  generic: {
    icon: AlertTriangle,
    title: "Oops! Something went wrong",
    message: "We couldn't complete your request. Please try again.",
  },
};

export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  retryLabel = "Try Again",
  className,
  compact = false,
}: ErrorStateProps) {
  const config = errorConfigs[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "text-center rounded-xl",
        compact ? "py-8" : "py-16",
        className
      )}
    >
      <div
        className={cn(
          "rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6",
          compact ? "w-14 h-14" : "w-20 h-20"
        )}
      >
        <Icon
          className={cn(
            "text-red-400",
            compact ? "w-7 h-7" : "w-10 h-10"
          )}
        />
      </div>
      <h2
        className={cn(
          "font-semibold text-white mb-2",
          compact ? "text-lg" : "text-xl"
        )}
      >
        {title || config.title}
      </h2>
      <p
        className={cn(
          "text-zinc-400 max-w-md mx-auto",
          compact ? "text-sm mb-4" : "text-base mb-6"
        )}
      >
        {message || config.message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="border-zinc-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          {retryLabel}
        </Button>
      )}
      {type === "auth" && (
        <a href="/login">
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            Sign In
          </Button>
        </a>
      )}
    </div>
  );
}

// Inline error message for form fields and smaller contexts
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg",
        className
      )}
    >
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Toast-style error notification
interface ErrorToastProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorToast({ message, onDismiss }: ErrorToastProps) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2 fade-in">
      <div className="bg-red-500/90 backdrop-blur-sm text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-white/70 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
