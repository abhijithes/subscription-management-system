"use client";

import { createTheme, MantineProvider } from "@mantine/core";

// One neutral family (the app's own sans), one accent used for actions and selection only.
// Colour scheme follows the operating system, like the rest of the app.
const theme = createTheme({
  primaryColor: "indigo",
  defaultRadius: "md",
  fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif",
  headings: { fontFamily: "var(--font-geist-sans), Arial, Helvetica, sans-serif", fontWeight: "600" },
});

export function AppMantineProvider({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {children}
    </MantineProvider>
  );
}
