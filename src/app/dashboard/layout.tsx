import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Stageside",
  description:
    "Discover personalized concert recommendations based on your music taste. Find upcoming shows from artists you love.",
  openGraph: {
    title: "Dashboard | Stageside",
    description:
      "Discover personalized concert recommendations based on your music taste.",
  },
  robots: {
    index: false, // Dashboard is private, don't index
    follow: false,
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
