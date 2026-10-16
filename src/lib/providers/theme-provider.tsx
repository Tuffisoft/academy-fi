"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({
  children,
  scriptProps,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      scriptProps={{
        ...scriptProps,
        // The bootstrap runs from server HTML. Client mounts use next-themes'
        // effects instead; executable script elements trigger a React warning.
        type: typeof window === "undefined" ? scriptProps?.type : "text/plain",
      }}
    >
      {children}
    </NextThemesProvider>
  );
}
