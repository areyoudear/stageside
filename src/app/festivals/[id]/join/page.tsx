"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Users, Music, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface CrewInfo {
  id: string;
  name: string;
  festival_id: string;
  member_count: number;
  festival_name?: string;
}

export default function JoinCrewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const festivalId = params.id as string;
  const inviteCode = searchParams.get("code");
  
  const [crewInfo, setCrewInfo] = useState<CrewInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Validate invite code on mount
  useEffect(() => {
    async function validateCode() {
      if (!inviteCode) {
        setError("No invite code provided");
        setLoading(false);
        return;
      }

      try {
        // Fetch crew info to validate code
        const res = await fetch(`/api/festivals/${festivalId}/crew?inviteCode=${inviteCode}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Invalid invite link");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setCrewInfo(data.crew);
        setLoading(false);
      } catch (err) {
        setError("Failed to validate invite link");
        setLoading(false);
      }
    }

    validateCode();
  }, [festivalId, inviteCode]);

  const handleJoin = async () => {
    if (!session?.user) {
      // Redirect to sign in with callback
      signIn("spotify", { callbackUrl: window.location.href });
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/festivals/${festivalId}/crew/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to join crew");
        setJoining(false);
        return;
      }

      setJoined(true);
      toast.success(`Welcome to ${data.crew.name}!`);
      
      // Redirect to festival page after a moment
      setTimeout(() => {
        router.push(`/festivals/${festivalId}`);
      }, 1500);
    } catch (err) {
      toast.error("Failed to join crew");
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-zinc-400">Validating invite...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Invalid Invite</h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <Link
            href="/festivals"
            className="inline-flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full transition-colors"
          >
            <Music className="w-4 h-4" />
            Browse Festivals
          </Link>
        </div>
      </main>
    );
  }

  if (joined) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">You're In!</h1>
          <p className="text-zinc-400 mb-4">
            Welcome to <span className="text-white font-semibold">{crewInfo?.name || "the crew"}</span>
          </p>
          <p className="text-sm text-zinc-500">Redirecting to festival...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Join Crew
          </h1>
          <p className="text-zinc-400">
            You've been invited to join
          </p>
        </div>

        <div className="bg-zinc-800/50 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            {crewInfo?.name || "Festival Crew"}
          </h2>
          <p className="text-zinc-400 text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            {crewInfo?.member_count || 1} member{(crewInfo?.member_count || 1) > 1 ? 's' : ''}
          </p>
        </div>

        {status === "loading" ? (
          <div className="text-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mx-auto" />
          </div>
        ) : session?.user ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Users className="w-5 h-5" />
                Join Crew
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => signIn("spotify", { callbackUrl: window.location.href })}
            className="w-full py-4 bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            Sign in with Spotify to Join
          </button>
        )}

        <p className="text-center text-sm text-zinc-500 mt-6">
          Plan your festival together and avoid schedule conflicts
        </p>
      </div>
    </main>
  );
}
