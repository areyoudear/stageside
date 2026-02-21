import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Stageside",
  description: "Terms of service for using Stageside",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link 
          href="/"
          className="text-blue-400 hover:text-blue-300 text-sm mb-8 inline-block"
        >
          ← Back to Stageside
        </Link>
        
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-zinc-400 mb-12">Last updated: February 21, 2025</p>

        <div className="space-y-8 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-3">1. What Stageside Is</h2>
            <p>
              Stageside is a concert discovery platform that connects to your music streaming services 
              to recommend live shows from artists you listen to. It&apos;s a free service provided as-is.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">2. Your Account</h2>
            <p>
              You&apos;re responsible for keeping your account secure. Don&apos;t share your login credentials. 
              If you think someone has accessed your account, let us know immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">3. Music Service Connections</h2>
            <p>
              When you connect Spotify, YouTube Music, or other services, you&apos;re authorizing Stageside 
              to access your listening data through their official APIs. You can disconnect any service 
              at any time from your dashboard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">4. Concert Information</h2>
            <p>
              We aggregate concert data from various sources (Ticketmaster, SeatGeek, etc.). While we 
              try to keep information accurate, concert details can change. Always verify with the 
              official ticket seller before purchasing.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable Use</h2>
            <p className="mb-3">Don&apos;t:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use bots or automated tools to scrape our service</li>
              <li>Attempt to access other users&apos; accounts or data</li>
              <li>Abuse the service in ways that affect other users</li>
              <li>Violate any applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual Property</h2>
            <p>
              Stageside&apos;s design, code, and branding are ours. Artist images, concert listings, and 
              music data belong to their respective owners and are displayed under their API terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">7. Disclaimers</h2>
            <p>
              Stageside is provided &quot;as is&quot; without warranties. We&apos;re not responsible for missed 
              concerts, incorrect listings, or any damages arising from use of the service. We&apos;re 
              not affiliated with or endorsed by any music streaming service or ticket vendor.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">8. Changes</h2>
            <p>
              We may update these terms. If we make significant changes, we&apos;ll notify you via email 
              or in-app notification. Continued use after changes means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
            <p>
              You can delete your account anytime. We can suspend or terminate accounts that violate 
              these terms or abuse the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">10. Contact</h2>
            <p>
              Questions? Email{" "}
              <a 
                href="mailto:hello@stageside.app" 
                className="text-blue-400 hover:text-blue-300 underline"
              >
                hello@stageside.app
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
