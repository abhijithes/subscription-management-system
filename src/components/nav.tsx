"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  CreditCard,
  FileText,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { navFor, type UserRole } from "@/lib/nav";

const icons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Products: Package,
  Subscriptions: CreditCard,
  Team: Users,
  Portal: LayoutDashboard,
  Invoices: FileText,
};

type NavProps = {
  role: UserRole;
  onNavigate?: () => void;
  variant?: "sidebar" | "top";
};

export function Nav({
  role,
  onNavigate,
  variant = "sidebar",
}: NavProps) {
  const pathname = usePathname();
  const items = navFor(role);

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "flex gap-1",
        variant === "sidebar"
          ? "flex-col"
          : "flex-row flex-wrap items-center"
      )}
    >
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

        const Icon = icons[item.title];

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-md px-3 py-2",
              "text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )}
          >
            {Icon && <Icon className="size-4 shrink-0" />}
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}