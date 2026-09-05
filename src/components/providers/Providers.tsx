"use client";

import { SessionProvider } from "next-auth/react";
import { PageTitleProvider } from "./PageTitleProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <PageTitleProvider>{children}</PageTitleProvider>
    </SessionProvider>
  );
}
