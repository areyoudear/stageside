import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account | Stageside",
  description:
    "Create your free Stageside account and start discovering concerts that match your music taste. Connect Spotify, Apple Music, or YouTube Music.",
  openGraph: {
    title: "Create Account | Stageside",
    description:
      "Create your free account and discover concerts that match your music taste.",
    url: "https://getstageside.com/signup",
  },
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
