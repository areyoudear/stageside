"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode, Suspense } from "react";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider 
      refetchOnWindowFocus={true}
      refetchInterval={5 * 60} // Refetch session every 5 minutes
    >
      <Suspense fallback={null}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </Suspense>
    </SessionProvider>
  );
}
