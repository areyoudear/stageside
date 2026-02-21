import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/Providers";
import { FeedbackButton } from "@/components/FeedbackButton";
import { CookieConsent } from "@/components/CookieConsent";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#a855f7",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://getstageside.com"),
  title: "Stageside - Discover Concerts You'll Actually Love",
  description:
    "Connect your Spotify and find upcoming concerts from artists you already listen to. Personalized concert discovery powered by your music taste.",
  other: {
    'impact-site-verification': 'ef070b3e-c823-4143-8d3b-ab020704771f',
  },
  keywords: [
    "concerts",
    "live music",
    "spotify",
    "concert discovery",
    "music events",
    "local concerts",
    "ticket finder",
  ],
  authors: [{ name: "Stageside" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Stageside",
  },
  openGraph: {
    title: "Stageside - Discover Concerts You'll Actually Love",
    description:
      "Connect your Spotify and find upcoming concerts from artists you already listen to.",
    type: "website",
    locale: "en_US",
    siteName: "Stageside",
    url: "https://getstageside.com",
    images: [
      {
        url: "https://getstageside.com/api/og",
        width: 1200,
        height: 630,
        alt: "Stageside - Personalized Concert Discovery",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stageside - Discover Concerts You'll Actually Love",
    description:
      "Connect your Spotify and find upcoming concerts from artists you already listen to.",
    images: ["https://getstageside.com/api/og"],
    creator: "@getstageside",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-zinc-950 text-white antialiased`}>
        <Providers>
          {children}
          <FeedbackButton />
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
