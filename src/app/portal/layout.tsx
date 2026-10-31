import type { ReactNode } from "react";

import { Nav } from "@/components/nav";
import { requireRole } from "@/server/auth/require-role";

export default async function PortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole("CUSTOMER");

  return (
    <div className="flex min-h-svh w-full flex-col overflow-x-clip">
      <header className="border-b bg-background">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span className="font-semibold tracking-tight">
            Customer Portal
          </span>

          <Nav role={user.role} variant="top" />
        </div>
      </header>

      <main className="mx-auto min-w-0 w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}