import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";
// import { requireRole } from "@/server/auth/require-role";

export default async function ProtectedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Authenticate and authorize before rendering protected content.
//   const user = await requireRole(["ADMIN", "STAFF"]);

  return (
    <AppShell role="ADMIN">
      {children}
    </AppShell>
  );
}