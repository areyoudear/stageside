"use client";

import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  variant?: "default" | "error" | "warning" | "success";
  className?: string;
  compact?: boolean;
}

const variantStyles = {
  default: {
    container: "bg-zinc-900",
    icon: "text-zinc-600",
    iconBg: "bg-zinc-800",
  },
  error: {
    container: "bg-red-500/5",
    icon: "text-red-400",
    iconBg: "bg-red-500/10",
  },
  warning: {
    container: "bg-amber-500/5",
    icon: "text-amber-400",
    iconBg: "bg-amber-500/10",
  },
  success: {
    container: "bg-emerald-500/5",
    icon: "text-emerald-400",
    iconBg: "bg-emerald-500/10",
  },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
  compact = false,
}: EmptyStateProps) {
  const styles = variantStyles[variant];

  const ActionButton = action?.href ? (
    <a href={action.href}>
      <Button
        className={cn(
          variant === "error" && "bg-red-600 hover:bg-red-700",
          variant === "warning" && "bg-amber-600 hover:bg-amber-700",
          variant === "success" && "bg-emerald-600 hover:bg-emerald-700"
        )}
      >
        {action.icon && <action.icon className="w-4 h-4 mr-2" />}
        {action.label}
      </Button>
    </a>
  ) : action ? (
    <Button
      onClick={action.onClick}
      className={cn(
        variant === "error" && "bg-red-600 hover:bg-red-700",
        variant === "warning" && "bg-amber-600 hover:bg-amber-700",
        variant === "success" && "bg-emerald-600 hover:bg-emerald-700"
      )}
    >
      {action.icon && <action.icon className="w-4 h-4 mr-2" />}
      {action.label}
    </Button>
  ) : null;

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
          "rounded-full flex items-center justify-center mx-auto mb-6",
          compact ? "w-14 h-14" : "w-20 h-20",
          styles.iconBg
        )}
      >
        <Icon
          className={cn(
            compact ? "w-7 h-7" : "w-10 h-10",
            styles.icon
          )}
        />
      </div>
      <h2
        className={cn(
          "font-semibold text-white mb-2",
          compact ? "text-lg" : "text-xl"
        )}
      >
        {title}
      </h2>
      <p
        className={cn(
          "text-zinc-400 max-w-md mx-auto",
          compact ? "text-sm" : "text-base",
          (action || secondaryAction) && "mb-6"
        )}
      >
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {ActionButton}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
