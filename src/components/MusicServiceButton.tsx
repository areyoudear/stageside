"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2, Check, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type MusicServiceType =
  | "spotify"
  | "apple_music"
  | "youtube_music"
  | "tidal"
  | "deezer";

interface ServiceConfig {
  name: string;
  color: string;
  bgColor: string;
  hoverColor: string;
  icon: React.ReactNode;
  provider: string;
}

const SERVICE_CONFIGS: Record<MusicServiceType, ServiceConfig> = {
  spotify: {
    name: "Spotify",
    color: "#1DB954",
    bgColor: "bg-[#1DB954]",
    hoverColor: "hover:bg-[#1ed760]",
    provider: "spotify",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
  apple_music: {
    name: "Apple Music",
    color: "#FA243C",
    bgColor: "bg-[#FA243C]",
    hoverColor: "hover:bg-[#ff3b4f]",
    provider: "apple",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.997 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.988c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.802.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03a12.5 12.5 0 0 0 1.57-.1c.822-.106 1.596-.35 2.295-.81a5.046 5.046 0 0 0 1.88-2.208c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.8-.6-1.965-1.49-.18-.972.498-1.96 1.494-2.175.407-.088.822-.104 1.226-.178.357-.065.617-.26.74-.613.018-.052.033-.104.033-.16.007-.94.003-1.88.003-2.82v-.164H12.64v7.035c0 .396-.05.784-.212 1.15-.287.646-.77 1.07-1.453 1.27-.34.1-.69.148-1.05.162-.93.033-1.745-.58-1.93-1.448-.2-1.007.494-2.002 1.527-2.216.394-.08.794-.098 1.186-.163.373-.063.642-.27.762-.642.017-.053.025-.107.025-.162v-9.63c0-.065.008-.127.025-.19.063-.252.2-.447.417-.58.3-.185.643-.19.988-.18.58.017 1.16.01 1.74.01h2.65c.076 0 .153.002.228.01.297.025.54.178.693.46.08.143.105.302.108.46z" />
      </svg>
    ),
  },
  youtube_music: {
    name: "YouTube Music",
    color: "#FF0000",
    bgColor: "bg-[#FF0000]",
    hoverColor: "hover:bg-[#cc0000]",
    provider: "google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z" />
      </svg>
    ),
  },
  tidal: {
    name: "Tidal",
    color: "#000000",
    bgColor: "bg-black",
    hoverColor: "hover:bg-zinc-800",
    provider: "tidal",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.012 3.992L8.008 7.996 12.012 12l4.004-4.004L12.012 3.992zM4.004 12L0 16.004 4.004 20.008l4.004-4.004L4.004 12zm7.996 0l-4.004 4.004L12 20.008l4.004-4.004L12 12zm7.996-4.004L16.008 12l3.988 3.988L24 12l-4.004-4.004z" />
      </svg>
    ),
  },
  deezer: {
    name: "Deezer",
    color: "#FF0092",
    bgColor: "bg-[#FF0092]",
    hoverColor: "hover:bg-[#e6008a]",
    provider: "deezer",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.81 4.16v3.03H24V4.16zM6.27 8.38v3.027h5.189V8.38zm12.54 0v3.027H24V8.38zM6.27 12.5v3.03h5.189V12.5zm6.27 0v3.03h5.19V12.5zm6.27 0v3.03H24V12.5zM0 16.62v3.03h5.19v-3.03zm6.27 0v3.03h5.189v-3.03zm6.27 0v3.03h5.19v-3.03zm6.27 0v3.03H24v-3.03z" />
      </svg>
    ),
  },
};

interface MusicServiceButtonProps {
  service: MusicServiceType;
  isConnected?: boolean;
  isLoading?: boolean;
  error?: string | null;
  lastSynced?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  size?: "sm" | "default" | "lg";
  showStatus?: boolean;
  className?: string;
}

export function MusicServiceButton({
  service,
  isConnected = false,
  isLoading = false,
  error = null,
  lastSynced = null,
  onConnect,
  onDisconnect,
  size = "default",
  showStatus = true,
  className,
}: MusicServiceButtonProps) {
  const [isHovering, setIsHovering] = useState(false);
  const config = SERVICE_CONFIGS[service];

  const handleClick = () => {
    if (isLoading) return;

    if (isConnected && onDisconnect) {
      onDisconnect();
    } else if (!isConnected) {
      if (onConnect) {
        onConnect();
      } else {
        // Default: use NextAuth sign in
        signIn(config.provider, { callbackUrl: "/dashboard" });
      }
    }
  };

  const sizeClasses = {
    sm: "h-9 px-2 text-xs min-w-0",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-lg",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    default: "w-5 h-5",
    lg: "w-6 h-6",
  };

  // Format last synced date
  const formatLastSynced = () => {
    if (!lastSynced) return null;
    const date = new Date(lastSynced);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  };

  if (isConnected && showStatus) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors",
            error
              ? "border-red-500/50 bg-red-500/10"
              : "border-green-500/50 bg-green-500/10"
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full",
              iconSizeClasses[size]
            )}
            style={{ color: config.color }}
          >
            {config.icon}
          </div>
          <span className="text-sm font-medium text-white">{config.name}</span>
          {error ? (
            <AlertCircle className="w-4 h-4 text-red-400" />
          ) : (
            <Check className="w-4 h-4 text-green-400" />
          )}
        </div>

        <div className="flex flex-col text-xs text-zinc-500">
          {error ? (
            <span className="text-red-400">{error}</span>
          ) : (
            lastSynced && <span>Synced {formatLastSynced()}</span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleClick}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="ml-auto text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
        >
          <X className="w-4 h-4" />
          {isHovering && <span className="ml-1">Disconnect</span>}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        config.bgColor,
        config.hoverColor,
        "text-white font-medium transition-all flex items-center gap-2",
        sizeClasses[size],
        className
      )}
    >
      {isLoading ? (
        <Loader2 className={cn("animate-spin flex-shrink-0", iconSizeClasses[size])} />
      ) : (
        <span className={cn("flex-shrink-0", iconSizeClasses[size])}>{config.icon}</span>
      )}
      <span className="truncate">
        {isLoading ? "..." : size === "sm" ? config.name : `Connect ${config.name}`}
      </span>
    </Button>
  );
}

// Grid of all service buttons for landing page
interface MusicServicesGridProps {
  connectedServices?: MusicServiceType[];
  onConnect?: (service: MusicServiceType) => void;
  onDisconnect?: (service: MusicServiceType) => void;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function MusicServicesGrid({
  connectedServices = [],
  onConnect,
  onDisconnect,
  size = "default",
  className,
}: MusicServicesGridProps) {
  const services: MusicServiceType[] = [
    "spotify",
    "apple_music",
    "youtube_music",
    "tidal",
    "deezer",
  ];

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 gap-2", className)}>
      {services.map((service) => (
        <MusicServiceButton
          key={service}
          service={service}
          isConnected={connectedServices.includes(service)}
          onConnect={() => onConnect?.(service)}
          onDisconnect={() => onDisconnect?.(service)}
          size={size}
          showStatus={false}
        />
      ))}
    </div>
  );
}

// Compact list of connected services
interface ConnectedServicesListProps {
  connections: Array<{
    service: MusicServiceType;
    isActive: boolean;
    error?: string | null;
    lastSynced?: string | null;
  }>;
  onDisconnect?: (service: MusicServiceType) => void;
  onReconnect?: (service: MusicServiceType) => void;
  className?: string;
}

export function ConnectedServicesList({
  connections,
  onDisconnect,
  onReconnect,
  className,
}: ConnectedServicesListProps) {
  if (connections.length === 0) {
    return (
      <div className={cn("text-center py-8 text-zinc-500", className)}>
        <p>No music services connected</p>
        <p className="text-sm mt-1">Connect a service to get personalized concert recommendations</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {connections.map((conn) => (
        <MusicServiceButton
          key={conn.service}
          service={conn.service}
          isConnected={true}
          error={conn.error}
          lastSynced={conn.lastSynced}
          onDisconnect={() => onDisconnect?.(conn.service)}
          onConnect={() => onReconnect?.(conn.service)}
          showStatus={true}
        />
      ))}
    </div>
  );
}
