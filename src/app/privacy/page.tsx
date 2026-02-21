import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Stageside",
  description: "How Stageside handles your data",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link 
          href="/"
          className="text-blue-400 hover:text-blue-300 text-sm mb-8 inline-block"
        >
          ← Back to Stageside
        </Link>
        
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-zinc-400 mb-12">Last updated: February 21, 2025</p>

        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">What Stageside Does</h2>
            <p>
              Stageside connects to your music streaming services (Spotify, YouTube Music, Apple Music, etc.) 
              to learn your music taste and recommend upcoming concerts from artists you love.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data We Collect</h2>
            <p className="mb-3">When you connect a music service, we access:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Your top artists and listening history</strong> — to understand your music taste</li>
              <li><strong>Your email address</strong> — to create your account and send concert alerts</li>
              <li><strong>Your location (optional)</strong> — to show concerts near you</li>
            </ul>
            <p className="mt-3">
              We do <strong>not</strong> access your playlists, payment info, or any data beyond what&apos;s needed 
              for concert recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">How We Use Your Data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Match your favorite artists to upcoming concert tours</li>
              <li>Send you notifications when artists you like announce shows nearby</li>
              <li>Improve our concert matching algorithms</li>
            </ul>
            <p className="mt-3">
              We <strong>never</strong> sell your data to third parties or use it for advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Data Storage & Security</h2>
            <p>
              Your data is stored securely on Supabase (our database provider) with encryption at rest 
              and in transit. Access tokens for music services are encrypted and only used to sync your 
              artist preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Third-Party Services</h2>
            <p className="mb-3">We integrate with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Spotify, YouTube Music, Apple Music, Tidal, Deezer</strong> — to read your music preferences</li>
              <li><strong>Ticketmaster, SeatGeek, Eventbrite</strong> — to find concert listings</li>
              <li><strong>Supabase</strong> — database and authentication</li>
              <li><strong>PostHog</strong> — privacy-friendly analytics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Your Rights</h2>
            <p className="mb-3">You can:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Disconnect services</strong> — Remove any connected music service from your dashboard</li>
              <li><strong>Delete your account</strong> — Email us and we&apos;ll delete all your data within 30 days</li>
              <li><strong>Export your data</strong> — Request a copy of all data we have about you</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">YouTube API Services</h2>
            <p>
              Stageside uses YouTube API Services to access your YouTube Music data. By using this feature, 
              you agree to be bound by the{" "}
              <a 
                href="https://www.youtube.com/t/terms" 
                className="text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                YouTube Terms of Service
              </a>
              . You can revoke Stageside&apos;s access to your data via{" "}
              <a 
                href="https://security.google.com/settings/security/permissions" 
                className="text-blue-400 hover:text-blue-300 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Security Settings
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
            <p>
              Questions? Email us at{" "}
              <a 
                href="mailto:privacy@stageside.app" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                privacy@stageside.app
              </a>
            </p>
          </section>

          <section className="pt-8 border-t border-zinc-800">
            <p className="text-zinc-500 text-sm">
              Stageside is operated by Rudr Tandon. San Francisco, CA.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
