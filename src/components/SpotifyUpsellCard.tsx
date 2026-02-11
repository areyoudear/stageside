"use client";

import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SpotifyUpsellCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-900/20 via-zinc-900 to-zinc-900 p-6 flex flex-col items-center justify-center text-center min-h-[300px]">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7 text-green-400" />
        </div>
        
        <h3 className="text-lg font-semibold text-white mb-2">
          Want more accurate matches?
        </h3>
        
        <p className="text-sm text-zinc-400 mb-5 max-w-[200px]">
          Connect Spotify to match concerts to your full listening history
        </p>
        
        <Link href="/">
          <Button className="bg-green-600 hover:bg-green-500 text-white font-medium">
            Connect Spotify
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
