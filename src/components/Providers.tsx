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
      refetchOnWindowFocus={false} // Disable aggressive refetch - causes multiple calls
      refetchInterval={0} // Disable interval refetch - session is persisted via JWT
    >
      <Suspense fallback={null}>
        <AnalyticsProvider>{children}</AnalyticsProvider>
      </Suspense>
    </SessionProvider>
  );
}
