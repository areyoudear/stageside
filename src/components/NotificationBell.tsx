"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  location: {
    name: string;
    lat: number;
    lng: number;
  } | null;
  radius: number;
  minMatchScore: number;
  statusFilter: string;
  className?: string;
}

interface NotificationSettings {
  id?: string;
  enabled: boolean;
  frequency: "daily" | "weekly" | "instant";
  locationName: string;
}

export function NotificationBell({
  location,
  radius,
  minMatchScore,
  statusFilter,
  className,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch current notification settings
  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/notifications/filters");
        if (res.ok) {
          const data = await res.json();
          if (data.notification) {
            setSettings({
              id: data.notification.id,
              enabled: data.notification.enabled,
              frequency: data.notification.frequency,
              locationName: data.notification.locationName,
            });
            setFrequency(data.notification.frequency);
          }
        }
      } catch (error) {
        console.error("Failed to fetch notification settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleEnable = async () => {
    if (!location) return;

    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationName: location.name,
          locationLat: location.lat,
          locationLng: location.lng,
          radiusMiles: radius,
          minMatchScore,
          statusFilter,
          enabled: true,
          frequency,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings({
          id: data.notification.id,
          enabled: true,
          frequency,
          locationName: location.name,
        });
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Failed to enable notifications:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/notifications/filters", {
        method: "DELETE",
      });

      if (res.ok) {
        setSettings(null);
      }
    } catch (error) {
      console.error("Failed to disable notifications:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isEnabled = settings?.enabled === true;

  return (
    <div className={cn("relative", className)}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={cn(
          "relative p-2 rounded-lg transition-all",
          isEnabled
            ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
            : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
        title={isEnabled ? "Notifications enabled" : "Enable email notifications"}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isEnabled ? (
          <>
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-zinc-900" />
          </>
        ) : (
          <BellOff className="w-5 h-5" />
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popover Content */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-cyan-400" />
                <span className="font-medium text-white">Email Notifications</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              {showSuccess ? (
                <div className="flex items-center gap-2 text-green-400 py-4 justify-center">
                  <Check className="w-5 h-5" />
                  <span>Notifications enabled!</span>
                </div>
              ) : isEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="w-4 h-4" />
                    <span className="text-sm">Notifications are enabled</span>
                  </div>

                  <div className="text-sm text-zinc-400 space-y-1">
                    <p>
                      <span className="text-zinc-300">Location:</span>{" "}
                      {settings?.locationName}
                    </p>
                    <p>
                      <span className="text-zinc-300">Frequency:</span>{" "}
                      {settings?.frequency === "daily" ? "Daily" : "Weekly"}
                    </p>
                  </div>

                  <p className="text-xs text-zinc-500">
                    You&apos;ll receive emails when new concerts match your current filters.
                  </p>

                  <button
                    onClick={handleDisable}
                    disabled={isSaving}
                    className="w-full py-2 px-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Disabling..." : "Disable Notifications"}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-zinc-300">
                    Get email alerts when new concerts match your filters:
                  </p>

                  {location ? (
                    <>
                      <div className="text-sm text-zinc-400 bg-zinc-800/50 rounded-lg p-3 space-y-1">
                        <p>
                          <span className="text-zinc-300">📍 Location:</span>{" "}
                          {location.name}
                        </p>
                        <p>
                          <span className="text-zinc-300">📏 Radius:</span>{" "}
                          {radius} miles
                        </p>
                        {minMatchScore > 0 && (
                          <p>
                            <span className="text-zinc-300">🎯 Min match:</span>{" "}
                            {minMatchScore}%
                          </p>
                        )}
                      </div>

                      {/* Frequency Selector */}
                      <div>
                        <label className="text-sm text-zinc-400 mb-2 block">
                          How often?
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setFrequency("daily")}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                              frequency === "daily"
                                ? "bg-cyan-500 text-white"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            )}
                          >
                            Daily
                          </button>
                          <button
                            onClick={() => setFrequency("weekly")}
                            className={cn(
                              "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors",
                              frequency === "weekly"
                                ? "bg-cyan-500 text-white"
                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                            )}
                          >
                            Weekly
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleEnable}
                        disabled={isSaving}
                        className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Enabling...
                          </>
                        ) : (
                          <>
                            <Bell className="w-4 h-4" />
                            Enable Notifications
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500 italic">
                      Set a location first to enable notifications.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
