import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings | Stageside",
  description:
    "Manage your Stageside account settings, connected music services, favorite artists, and notification preferences.",
  robots: {
    index: false, // Settings is private, don't index
    follow: false,
  },
};

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
