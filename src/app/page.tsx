import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { MusicServicesGrid } from "@/components/MusicServiceButton";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { Music, MapPin, Calendar, Sparkles, ArrowRight } from "lucide-react";

export default async function LandingPage() {
  // If user is already logged in, redirect to dashboard
  // Wrap in try-catch for build-time safety
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect("/dashboard");
    }
  } catch {
    // During build, session check will fail - that's okay
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>
            <SpotifyConnectButton size="sm" showName={false} />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            <span>Powered by your music streaming history</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Discover concerts{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              you&apos;ll actually love
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Connect your music streaming services, pick your city, and we&apos;ll show you 
            upcoming concerts from artists you already listen to. No more FOMO.
          </p>

          {/* Primary CTA - Spotify */}
          <div className="flex flex-col items-center gap-6">
            <SpotifyConnectButton size="xl" />
            
            {/* Quick Match Option */}
            <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-zinc-700" />
              <span className="text-zinc-500 text-sm">or</span>
              <div className="h-px w-12 bg-zinc-700" />
            </div>
            <Link
              href="/discover"
              className="group flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-800/50 border border-zinc-700 hover:border-purple-500/50 hover:bg-zinc-800 transition-all"
            >
              <Music className="w-5 h-5 text-purple-400" />
              <span className="text-white font-medium">Pick Your Artists</span>
              <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </Link>
            
            {/* Other services */}
            <div className="text-zinc-500 text-sm mt-4">Connect with other services</div>
            <MusicServicesGrid 
              connectedServices={[]}
              size="sm"
              className="max-w-lg"
            />
            
            <Link
              href="#how-it-works"
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2 mt-4"
            >
              See how it works
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-zinc-500 text-sm">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500"
                    style={{ zIndex: 4 - i }}
                  />
                ))}
              </div>
              <span>Join 1,000+ music fans</span>
            </div>
            <div>✓ 100% Free</div>
            <div>✓ No spam, ever</div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How Stageside Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                1. Connect Your Music
              </h3>
              <p className="text-zinc-400">
                Link Spotify, Apple Music, YouTube Music, Tidal, or Deezer. Connect multiple for better recommendations!
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                2. Set Your Location
              </h3>
              <p className="text-zinc-400">
                Tell us where you are or where you&apos;re traveling. We search concerts nearby.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                3. Get Matched
              </h3>
              <p className="text-zinc-400">
                See concerts ranked by how well they match your taste. Never miss your favorites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Why Music Fans Love Stageside
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-2">
                🎵 Multi-Service Support
              </h3>
              <p className="text-zinc-400">
                Connect Spotify, Apple Music, YouTube Music, Tidal, or Deezer. 
                The more services, the better we understand your taste.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-2">
                🎯 Personalized Matching
              </h3>
              <p className="text-zinc-400">
                We combine data from all your services to rank concerts by how well 
                they match your actual listening habits.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-2">
                📍 Travel-Friendly
              </h3>
              <p className="text-zinc-400">
                Planning a trip? Enter any city and date range to find concerts
                wherever you&apos;re going. Perfect for music tourism.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <h3 className="text-lg font-semibold text-white mb-2">
                🔒 Privacy First
              </h3>
              <p className="text-zinc-400">
                We only read your listening history. We never post anything,
                access your playlists, or share your data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-zinc-900/50">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Not ready to connect Spotify?
          </h2>
          <p className="text-zinc-400 mb-6">
            Get weekly concert recommendations delivered to your inbox.
          </p>
          <EmailSignupForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Stageside</span>
            </div>
            <div className="text-sm text-zinc-500">
              © 2026 Stageside. Concert data by Ticketmaster.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
