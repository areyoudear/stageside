"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, Music2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface SpotifyConnectButtonProps {
  size?: "default" | "sm" | "lg" | "xl";
  showName?: boolean;
  className?: string;
}

export function SpotifyConnectButton({
  size = "default",
  showName = true,
  className,
}: SpotifyConnectButtonProps) {
  const { data: session, status } = useSession();

  // Size-specific styles
  const sizeStyles = {
    sm: "h-9 px-3 text-sm",
    default: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    xl: "h-14 px-8 text-lg",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    default: "w-5 h-5",
    lg: "w-5 h-5",
    xl: "w-6 h-6",
  };

  if (status === "loading") {
    return (
      <Button 
        disabled 
        className={cn(
          "bg-[#1DB954] text-white font-semibold",
          sizeStyles[size],
          className
        )}
      >
        <Loader2 className={cn("animate-spin mr-2", iconSizes[size])} />
        Loading...
      </Button>
    );
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-3">
        {showName && (
          <div className="flex items-center gap-2">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
                <Music2 className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <span className="text-sm text-zinc-300 hidden sm:inline">
              {session.user.name}
            </span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => signIn("spotify", { callbackUrl: "/dashboard" })}
      className={cn(
        "bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all",
        sizeStyles[size],
        className
      )}
    >
      <svg
        className={cn("mr-2", iconSizes[size])}
        viewBox="0 0 24 24"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
      Connect Spotify
    </Button>
  );
}
