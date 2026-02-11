import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SpotifyConnectButton } from "@/components/SpotifyConnectButton";
import { MusicServicesGrid } from "@/components/MusicServiceButton";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { Music, MapPin, Calendar, Sparkles, ArrowRight, Zap, Shield, Plane, Music2, Heart, TrendingUp, Clock, Star } from "lucide-react";

export default async function LandingPage() {
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      redirect("/dashboard");
    }
  } catch {
    // During build, session check will fail
  }

  return (
    <main className="min-h-screen bg-zinc-950 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25 group-hover:shadow-purple-500/40 transition-shadow">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Stageside</span>
            </Link>
            <SpotifyConnectButton size="sm" showName={false} />
          </div>
        </div>
      </nav>

      {/* Hero Section - Emotion First */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        {/* Immersive background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Animated gradient mesh */}
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/30 rounded-full blur-[120px] animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-fuchsia-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/3 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[80px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
          
          {/* Subtle grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Micro badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm mb-8 backdrop-blur-sm animate-fade-in">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Powered by your actual listening history</span>
          </div>

          {/* Emotional headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight animate-slide-up">
            Concerts you&apos;ll{" "}
            <span className="relative">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-[length:200%_auto] animate-gradient-x">
                feel
              </span>
              <span className="absolute -inset-1 bg-gradient-to-r from-violet-500/20 via-fuchsia-500/20 to-violet-500/20 blur-2xl -z-10" />
            </span>
            , not just find.
          </h1>

          {/* Subheadline - benefit focused */}
          <p className="text-xl sm:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.15s' }}>
            Turn your music taste into unforgettable live experiences.
            We match you with shows that actually fit your vibe.
          </p>

          {/* Primary CTA cluster */}
          <div className="flex flex-col items-center gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            {/* Main CTA */}
            <Link
              href="/discover"
              className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-lg shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span>See Your Concerts</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>

            {/* Secondary options */}
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <span>or connect</span>
            </div>
            
            <div className="flex items-center gap-3">
              <SpotifyConnectButton size="md" />
            </div>
            
            <MusicServicesGrid 
              connectedServices={[]}
              size="sm"
              className="max-w-md opacity-60 hover:opacity-100 transition-opacity"
            />
          </div>

          {/* Trust signals */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-zinc-500 text-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 border-2 border-zinc-950"
                    style={{ zIndex: 4 - i }}
                  />
                ))}
              </div>
              <span>2,000+ music fans</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Privacy-first</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
            <div className="w-1 h-2 rounded-full bg-white/40 animate-scroll-down" />
          </div>
        </div>
      </section>

      {/* Discovery Preview - Dynamic blocks */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-900/50 to-zinc-950" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Discovery that feels personal
            </h2>
            <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
              Not just a list of concerts. Curated moments waiting to happen.
            </p>
          </div>

          {/* Preview cards - showing what discovery looks like */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Near You Card */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-orange-500/10 via-zinc-900/80 to-zinc-900/80 border border-orange-500/20 hover:border-orange-500/40 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Near you this week</h3>
                  <p className="text-sm text-zinc-500">San Francisco</p>
                </div>
              </div>
              <div className="space-y-3">
                {['Indie Night at The Chapel', 'Electronic @ Mezzanine', 'Jazz at SFJAZZ'].map((show, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-pink-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{show}</p>
                      <p className="text-xs text-zinc-500">{['Tomorrow', 'Friday', 'Saturday'][i]}</p>
                    </div>
                    <span className="text-xs text-orange-400 font-medium">{[95, 88, 82][i]}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Vibe Card */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-violet-500/10 via-zinc-900/80 to-zinc-900/80 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Your vibe this month</h3>
                  <p className="text-sm text-zinc-500">Based on your taste</p>
                </div>
              </div>
              <div className="space-y-3">
                {['Bonobo Live', 'Khruangbin', 'Japanese Breakfast'].map((show, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{show}</p>
                      <p className="text-xs text-zinc-500">Perfect match</p>
                    </div>
                    <span className="text-xs text-violet-400 font-medium">{[98, 94, 91][i]}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trending Card */}
            <div className="group p-6 rounded-3xl bg-gradient-to-br from-emerald-500/10 via-zinc-900/80 to-zinc-900/80 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Selling fast</h3>
                  <p className="text-sm text-zinc-500">Don&apos;t miss out</p>
                </div>
              </div>
              <div className="space-y-3">
                {['Tyler, The Creator', 'Dua Lipa', 'Bad Bunny'].map((show, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{show}</p>
                      <p className="text-xs text-emerald-400">{['80%', '65%', '45%'][i]} sold</p>
                    </div>
                    <Clock className="w-4 h-4 text-zinc-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              Start discovering
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Three steps to your next favorite show
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Music, title: "Connect", desc: "Link your music services. We learn your taste from what you actually listen to.", color: "violet" },
              { icon: MapPin, title: "Locate", desc: "Tell us where you are or where you're going. We find shows nearby.", color: "fuchsia" },
              { icon: Sparkles, title: "Discover", desc: "Get concerts ranked by how well they match you. With match scores and vibes.", color: "purple" },
            ].map((step, i) => (
              <div key={i} className="relative text-center group">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-400">
                  {i + 1}
                </div>
                
                <div className={`pt-8 p-6 rounded-3xl bg-zinc-900/50 border border-zinc-800 group-hover:border-${step.color}-500/30 transition-all duration-300`}>
                  <div className={`w-16 h-16 rounded-2xl bg-${step.color}-500/10 border border-${step.color}-500/20 flex items-center justify-center mx-auto mb-4`}>
                    <step.icon className={`w-8 h-8 text-${step.color}-400`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-zinc-400">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for music lovers
            </h2>
            <p className="text-zinc-400 text-lg">
              Not another ticket aggregator. A discovery experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Music2, title: "Multi-Service Magic", desc: "Connect Spotify, Apple Music, YouTube Music, Tidal, or Deezer. Mix them for the fullest picture of your taste.", color: "violet", gradient: "from-violet-500/10 to-purple-500/10" },
              { icon: Zap, title: "Smart Matching", desc: "Every concert gets a match score. See exactly why we think you'll love it—genre, artist similarity, listening patterns.", color: "green", gradient: "from-green-500/10 to-emerald-500/10" },
              { icon: Plane, title: "Travel Mode", desc: "Planning a trip? Search any city. Perfect for music tourism—find shows wherever you're going.", color: "blue", gradient: "from-blue-500/10 to-cyan-500/10" },
              { icon: Shield, title: "Privacy First", desc: "We only read listening history. Never post, never share, never access your playlists. Just concerts.", color: "amber", gradient: "from-amber-500/10 to-orange-500/10" },
            ].map((feature, i) => (
              <div 
                key={i}
                className={`group p-8 rounded-3xl bg-gradient-to-br ${feature.gradient} border border-${feature.color}-500/10 hover:border-${feature.color}-500/30 transition-all duration-300`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-${feature.color}-500/10 border border-${feature.color}-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <feature.icon className={`w-7 h-7 text-${feature.color}-400`} />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-violet-600/20 via-fuchsia-600/20 to-violet-600/20 rounded-full blur-[120px]" />
        </div>
        
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to feel the music?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Stop scrolling through endless event listings.<br />
            Start discovering shows made for you.
          </p>
          <Link
            href="/discover"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-semibold text-lg shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all duration-300"
          >
            <span>Find Your Concerts</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          
          <div className="mt-8">
            <EmailSignupForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-white">Stageside</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <Link href="/discover" className="hover:text-white transition-colors">Discover</Link>
              <span className="text-zinc-700">•</span>
              <span>Concert data by Ticketmaster</span>
            </div>
            
            <div className="text-sm text-zinc-600">
              © 2026 Stageside
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
