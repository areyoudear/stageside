"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MusicServiceButton,
  MusicServicesGrid,
  MusicServiceType,
} from "@/components/MusicServiceButton";
import { RefreshCw, Plus, Settings, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Connection {
  id: string;
  service: MusicServiceType;
  service_username: string | null;
  is_active: boolean;
  error: string | null;
  connected_at: string;
  last_synced: string | null;
}

interface ConnectedServicesPanelProps {
  initialConnections?: Connection[];
  onConnectionsChange?: (connections: Connection[]) => void;
  className?: string;
}

export function ConnectedServicesPanel({
  initialConnections = [],
  onConnectionsChange,
  className,
}: ConnectedServicesPanelProps) {
  const [connections, setConnections] = useState<Connection[]>(initialConnections);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = async () => {
    setIsLoadingConnections(true);
    setError(null);

    try {
      const response = await fetch("/api/music/connections");
      if (!response.ok) throw new Error("Failed to fetch connections");

      const data = await response.json();
      setConnections(data.connections || []);
      onConnectionsChange?.(data.connections || []);
    } catch (err) {
      console.error("Error fetching connections:", err);
      setError("Failed to load connected services");
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // Fetch connections on mount
  useEffect(() => {
    fetchConnections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async (service: MusicServiceType) => {
    // Services that have custom OAuth connect endpoints
    const supportedServices = ["spotify", "youtube_music"];

    if (supportedServices.includes(service)) {
      // Redirect to our OAuth connect endpoint (doesn't require re-login)
      window.location.href = `/api/music/connect/${service}?callbackUrl=/settings`;
    } else {
      // For other services, show a message
      alert(
        `${service} integration coming soon! For now, connect with Spotify or YouTube Music.`
      );
    }
  };

  const handleDisconnect = async (service: MusicServiceType) => {
    if (!confirm(`Disconnect ${service}? You can reconnect anytime.`)) {
      return;
    }

    try {
      const response = await fetch("/api/music/connections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });

      if (!response.ok) throw new Error("Failed to disconnect");

      // Refresh connections
      await fetchConnections();
    } catch (err) {
      console.error("Error disconnecting:", err);
      setError("Failed to disconnect service");
    }
  };

  const handleSync = async (service?: MusicServiceType) => {
    setIsSyncing(true);
    setError(null);

    try {
      const response = await fetch("/api/music/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(service ? { service } : {}),
      });

      if (!response.ok) throw new Error("Failed to sync");

      const data = await response.json();

      // Refresh connections to show updated sync times
      await fetchConnections();

      // Show success feedback
      if (data.artistCount) {
        console.log(`Synced ${data.artistCount} artists from ${data.syncedServices.join(", ")}`);
      }
    } catch (err) {
      console.error("Error syncing:", err);
      setError("Failed to sync music data");
    } finally {
      setIsSyncing(false);
    }
  };

  const activeConnections = connections.filter((c) => c.is_active);
  const connectedServices = activeConnections.map((c) => c.service);

  return (
    <div
      className={`bg-zinc-900/50 rounded-2xl border border-zinc-800 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-zinc-500" />
          <div>
            <h3 className="font-medium text-white">Connected Music Services</h3>
            <p className="text-sm text-zinc-500">
              {activeConnections.length === 0
                ? "Connect a service to get personalized recommendations"
                : `${activeConnections.length} service${activeConnections.length > 1 ? "s" : ""} connected`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeConnections.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSync()}
              disabled={isSyncing}
              className="text-zinc-400 hover:text-white"
            >
              {isSyncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-2 hidden sm:inline">Sync All</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-zinc-400"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {isLoadingConnections && (
        <div className="p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500 mx-auto" />
          <p className="text-sm text-zinc-500 mt-2">Loading services...</p>
        </div>
      )}

      {/* Connected services list */}
      {!isLoadingConnections && activeConnections.length > 0 && (
        <div className="p-4 space-y-3">
          {activeConnections.map((conn) => (
            <MusicServiceButton
              key={conn.id}
              service={conn.service}
              isConnected={true}
              error={conn.error}
              lastSynced={conn.last_synced}
              onDisconnect={() => handleDisconnect(conn.service)}
              showStatus={true}
            />
          ))}
        </div>
      )}

      {/* Expanded: Add more services */}
      {isExpanded && (
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/50">
          <div className="flex items-center gap-2 mb-4">
            <Plus className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-400">
              Connect more services
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(
              [
                "spotify",
                "apple_music",
                "youtube_music",
                "tidal",
                "deezer",
              ] as MusicServiceType[]
            )
              .filter((s) => !connectedServices.includes(s))
              .map((service) => (
                <MusicServiceButton
                  key={service}
                  service={service}
                  isConnected={false}
                  onConnect={() => handleConnect(service)}
                  showStatus={false}
                  size="sm"
                />
              ))}
          </div>

          {connectedServices.length === 5 && (
            <p className="text-sm text-green-400 text-center mt-4">
              🎉 All services connected! You&apos;re getting the best recommendations.
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {activeConnections.length === 0 && !isExpanded && !isLoadingConnections && (
        <div className="p-6 text-center">
          <p className="text-zinc-500 mb-4">
            Connect a music service to see personalized concert recommendations
          </p>
          <MusicServicesGrid
            connectedServices={[]}
            onConnect={handleConnect}
            size="sm"
            className="max-w-md mx-auto"
          />
        </div>
      )}
    </div>
  );
}

// Compact version for nav/sidebar
export function ConnectedServicesBadges({
  connections,
  className,
}: {
  connections: Connection[];
  className?: string;
}) {
  const activeConnections = connections.filter((c) => c.is_active && !c.error);

  if (activeConnections.length === 0) {
    return null;
  }

  const serviceColors: Record<MusicServiceType, string> = {
    spotify: "#1DB954",
    apple_music: "#FA243C",
    youtube_music: "#FF0000",
    tidal: "#000000",
    deezer: "#FF0092",
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {activeConnections.map((conn) => (
        <div
          key={conn.id}
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: serviceColors[conn.service] }}
          title={conn.service}
        >
          <span className="text-white text-xs font-bold">
            {conn.service[0].toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  );
}
