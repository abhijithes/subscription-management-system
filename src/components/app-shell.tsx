"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Nav } from "@/components/nav";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { UserRole } from "@/lib/nav";

type AppShellProps = {
  role: UserRole;
  children: React.ReactNode;
};

export function AppShell({
  role,
  children,
}: AppShellProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-svh w-full overflow-x-clip">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r bg-background md:flex md:flex-col">
        <div className="flex h-16 items-center border-b px-5">
          <span className="font-semibold tracking-tight">
            Subscription Manager
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <Nav role={role} />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
          {/* Mobile navigation */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open navigation menu"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>

            <SheetContent side="left" className="w-72">
              <SheetTitle className="mb-6">
                Subscription Manager
              </SheetTitle>

              <Nav
                role={role}
                onNavigate={() => setOpen(false)}
              />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-medium">
              Workspace
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}