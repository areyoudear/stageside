"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function AccessForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(redirectTo);
        router.refresh();
      } else {
        setError("Invalid password. Please try again.");
        setIsLoading(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
            <Music className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-white">Stageside</span>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              Early Access Preview
            </h1>
            <p className="text-zinc-400 text-sm">
              Stageside is currently in private beta. Enter the access code to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter access code"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={!password || isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-pink-500 hover:from-blue-700 hover:to-pink-600 h-12"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-zinc-500 text-xs">
            Don&apos;t have an access code?{" "}
            <a
              href="mailto:hello@getstageside.com"
              className="text-blue-400 hover:text-blue-300"
            >
              Request early access
            </a>
          </p>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-zinc-600 text-xs">
          © 2026 Stageside. All rights reserved.
        </p>
      </div>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center px-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <AccessForm />
    </Suspense>
  );
}
