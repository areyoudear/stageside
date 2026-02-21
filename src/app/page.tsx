import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
  Music,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Users,
  Zap,
  Target,
  Heart,
  CheckCircle,
  Star,
  Play,
} from "lucide-react";
import { ConcertCrowdBackground } from "@/components/ConcertCrowdBackground";
import { MusicServiceLogos, MusicServiceLogosInline } from "@/components/MusicServiceLogos";

export default async function LandingPage() {
  // Check for session and redirect to dashboard if logged in
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // During build, session check will fail - that's ok
  }
  
  // Redirect must be outside try/catch because it throws a special error
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-950">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-gray-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/festivals"
                className="text-gray-400 hover:text-white transition-colors hidden sm:block"
              >
                Festivals
              </Link>
              <Link
                href="/login"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden min-h-[90vh] flex items-center">
        {/* Concert Crowd Background - like you're in the audience */}
        <ConcertCrowdBackground />
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative max-w-6xl mx-auto px-4 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300 text-sm">Powered by your music taste</span>
          </div>

          {/* Headline - Updated tagline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Your taste.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              Your concerts.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Stageside analyzes your Spotify, Apple Music, or YouTube Music to find concerts
            and festivals that actually match your taste. No more endless scrolling through
            events you don&apos;t care about.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="w-full sm:w-auto bg-white/10 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/20 transition-colors border border-white/20 flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              See How It Works
            </Link>
          </div>

          {/* Social Proof with Music Service Logos */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <MusicServiceLogosInline />
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span>No credit card required</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Three simple steps
            </h2>
            <p className="text-gray-400 text-lg">
              From signup to your perfect concert in under a minute
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 - Now with music service logos */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                1
              </div>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 h-full">
                <div className="flex justify-center gap-3 mb-6">
                  <MusicServiceLogos size="lg" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Connect your music
                </h3>
                <p className="text-gray-400">
                  Link Spotify, Apple Music, YouTube Music, Tidal, or Deezer. We analyze
                  your top artists and listening patterns.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                2
              </div>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <MapPin className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Set your location
                </h3>
                <p className="text-gray-400">
                  Tell us where you are (or where you&apos;re traveling). We&apos;ll find
                  concerts and festivals in your area.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                3
              </div>
              <div className="bg-white/5 rounded-2xl p-8 border border-white/10 h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 mx-auto">
                  <Target className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  Get matched concerts
                </h3>
                <p className="text-gray-400">
                  See concerts ranked by match percentage. &quot;95% Perfect Match&quot;
                  means you&apos;ll probably love it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 1: Concert Matching */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-cyan-500/20 text-cyan-300 rounded-full px-4 py-2 mb-6">
                <Target className="w-4 h-4" />
                <span className="text-sm font-medium">Personalized Matching</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Every concert scored for{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                  your taste
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                We don&apos;t just list concerts near you. We analyze your top 100 artists,
                your favorite genres, and even similar artists you haven&apos;t discovered yet
                to give each concert a personal match score.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300">&quot;You love The Weeknd&quot; — direct artist matches</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300">&quot;Similar to Tame Impala&quot; — related artist discovery</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300">&quot;Matches your indie rock taste&quot; — genre matching</span>
                </li>
              </ul>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl p-6 border border-white/10">
                {/* Mock concert card */}
                <div className="bg-gray-900/80 rounded-xl p-4 mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">The Weeknd</h4>
                      <p className="text-gray-400 text-sm">Chase Center • Mar 15</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">98%</div>
                      <div className="text-xs text-gray-500">Perfect</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-gray-300">In your top 5 artists</span>
                  </div>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 mb-4 opacity-80">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">Tame Impala</h4>
                      <p className="text-gray-400 text-sm">Bill Graham • Apr 2</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-400">87%</div>
                      <div className="text-xs text-gray-500">Great</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">Similar to MGMT you listen to</span>
                  </div>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 opacity-60">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">Glass Animals</h4>
                      <p className="text-gray-400 text-sm">The Warfield • Apr 18</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-amber-400">72%</div>
                      <div className="text-xs text-gray-500">Good</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-400" />
                    <span className="text-sm text-gray-300">Matches your indie taste</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Festival Itineraries */}
      <section className="py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-2xl p-6 border border-white/10">
                {/* Mock itinerary */}
                <div className="text-center mb-6">
                  <h4 className="text-white font-semibold text-lg">Your Coachella Schedule</h4>
                  <p className="text-gray-400 text-sm">Friday • 8 acts scheduled</p>
                </div>
                <div className="space-y-3">
                  <div className="bg-gray-900/80 rounded-lg p-3 flex items-center gap-4">
                    <div className="text-center w-16">
                      <div className="text-white font-bold">2:00</div>
                      <div className="text-xs text-gray-500">PM</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-0.5 rounded-full">Must-See</span>
                      </div>
                      <div className="text-white font-medium">Fred again..</div>
                      <div className="text-gray-400 text-sm">Main Stage</div>
                    </div>
                    <div className="text-emerald-400 font-bold">98%</div>
                  </div>
                  <div className="bg-gray-900/80 rounded-lg p-3 flex items-center gap-4 opacity-80">
                    <div className="text-center w-16">
                      <div className="text-white font-bold">4:30</div>
                      <div className="text-xs text-gray-500">PM</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-0.5 rounded-full">Recommended</span>
                      </div>
                      <div className="text-white font-medium">Khruangbin</div>
                      <div className="text-gray-400 text-sm">Outdoor Stage</div>
                    </div>
                    <div className="text-emerald-400 font-bold">85%</div>
                  </div>
                  <div className="bg-gray-900/80 rounded-lg p-3 flex items-center gap-4 opacity-60">
                    <div className="text-center w-16">
                      <div className="text-white font-bold">7:00</div>
                      <div className="text-xs text-gray-500">PM</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full">Discovery</span>
                      </div>
                      <div className="text-white font-medium">Remi Wolf</div>
                      <div className="text-gray-400 text-sm">Gobi Tent</div>
                    </div>
                    <div className="text-amber-400 font-bold">72%</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 rounded-full px-4 py-2 mb-6">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Festival Planner</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Auto-generated{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                  festival itineraries
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Going to Coachella? Outside Lands? Lollapalooza? We&apos;ll analyze the entire
                lineup against your music taste and create a personalized schedule—complete
                with must-sees, discoveries, and conflict warnings.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300">Optimized for your favorites + new discoveries</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300">Conflict detection between overlapping sets</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-gray-300">Export to your calendar app</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: Concert Buddy */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-300 rounded-full px-4 py-2 mb-6">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Concert Buddy</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Find concerts{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">
                  everyone loves
                </span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Going with friends who have different music taste? Create a group, share
                the invite code, and we&apos;ll find concerts that match EVERYONE—even if
                one person uses Spotify and another uses Apple Music.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">Works across different music services</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">Shows shared artists and genres</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-gray-300">&quot;Universal&quot; matches = everyone will love it</span>
                </li>
              </ul>
              <Link
                href="/groups"
                className="inline-flex items-center gap-2 mt-8 text-orange-400 hover:text-orange-300 font-medium"
              >
                Try Concert Buddy
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-900/50 to-amber-900/50 rounded-2xl p-6 border border-white/10">
                {/* Mock group */}
                <div className="text-center mb-6">
                  <h4 className="text-white font-semibold text-lg">SF Concert Crew</h4>
                  <div className="flex justify-center -space-x-2 mt-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 border-2 border-gray-900 flex items-center justify-center text-white font-medium">R</div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 border-2 border-gray-900 flex items-center justify-center text-white font-medium">S</div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 border-2 border-gray-900 flex items-center justify-center text-white font-medium">M</div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-red-500 border-2 border-gray-900 flex items-center justify-center text-white font-medium">J</div>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">4 members</p>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-white font-semibold">LCD Soundsystem</h5>
                    <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full">Everyone!</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@rudr: Loves them</span>
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@sarah: Top artist</span>
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@mike: Into dance</span>
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@jen: Genre match</span>
                  </div>
                </div>
                <div className="bg-gray-900/80 rounded-xl p-4 opacity-70">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-white font-semibold">Jungle</h5>
                    <span className="bg-amber-500/20 text-amber-300 text-xs px-2 py-1 rounded-full">Most of you</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@rudr: Similar artist</span>
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@sarah: Funk fan</span>
                    <span className="bg-white/10 text-gray-300 px-2 py-1 rounded">@mike: Discovery</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-cyan-900/20 to-transparent">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Your next favorite concert is waiting
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Join thousands of music fans who&apos;ve found their perfect shows with Stageside.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-semibold">Stageside</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-gray-400 text-sm">
              <Link href="/about" className="hover:text-white transition-colors py-2 px-2 min-h-[44px] flex items-center">About</Link>
              <Link href="/privacy" className="hover:text-white transition-colors py-2 px-2 min-h-[44px] flex items-center">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors py-2 px-2 min-h-[44px] flex items-center">Terms</Link>
              <a href="mailto:hello@getstageside.com" className="hover:text-white transition-colors py-2 px-2 min-h-[44px] flex items-center">Contact</a>
            </div>
            <div className="text-gray-500 text-sm">
              © 2026 Stageside. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
