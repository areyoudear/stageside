import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Music Festivals | Stageside",
  description:
    "Explore music festivals and get personalized lineup recommendations based on your taste. Find your perfect festival experience.",
  openGraph: {
    title: "Music Festivals | Stageside",
    description:
      "Explore music festivals and get personalized lineup recommendations based on your taste.",
    url: "https://getstageside.com/festivals",
  },
};

export default function FestivalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
