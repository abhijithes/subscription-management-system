import type { Role } from "@/generated/prisma/enums";

export type NavLink = { label: string; href: string };
export type NavGroup = { title: string; links: NavLink[] };

const sales: NavGroup = {
  title: "Sales",
  links: [
    { label: "Subscriptions", href: "/subscriptions" },
    { label: "Quotation templates", href: "/templates" },
    { label: "Invoices", href: "/invoices" },
    { label: "Billing run", href: "/billing" },
  ],
};

/** The sidebar for each role (spec section 7). Admin-only areas never reach Staff or Customers. */
export function navFor(role: Role): NavGroup[] {
  if (role === "CUSTOMER") return [{ title: "Your account", links: [{ label: "Subscriptions", href: "/portal" }, { label: "Invoices", href: "/portal/invoices" }] }];
  const common: NavGroup[] = [{ title: "Overview", links: [{ label: "Dashboard", href: "/dashboard" }] }, sales];
  if (role === "STAFF") return common;
  return [
    ...common,
    {
      title: "Catalog",
      links: [
        { label: "Products", href: "/products" },
        { label: "Plans", href: "/plans" },
        { label: "Taxes", href: "/taxes" },
        { label: "Discounts", href: "/discounts" },
      ],
    },
    { title: "Administration", links: [{ label: "Team", href: "/team" }] },
  ];
}

export const roleLabel = (role: Role) => role.charAt(0) + role.slice(1).toLowerCase();
