import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | Stageside",
  description:
    "Sign in to Stageside to discover concerts from artists you love. Connect your Spotify, Apple Music, or YouTube Music.",
  openGraph: {
    title: "Sign In | Stageside",
    description:
      "Sign in to discover concerts from artists you love.",
    url: "https://getstageside.com/login",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
