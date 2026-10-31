export type UserRole = "ADMIN" | "STAFF" | "CUSTOMER";

export type NavItem = {
  title: string;
  href: string;
  exact?: boolean;
};

const adminNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    exact: true,
  },
  {
    title: "Products",
    href: "/products",
  },
  {
    title: "Subscriptions",
    href: "/subscriptions",
  },
  {
    title: "Team",
    href: "/team",
  },
];

const staffNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    exact: true,
  },
  {
    title: "Subscriptions",
    href: "/subscriptions",
  },
];

const customerNav: NavItem[] = [
  {
    title: "Portal",
    href: "/portal",
    exact: true,
  },
  {
    title: "Invoices",
    href: "/portal/invoices",
  },
];

export function navFor(role: UserRole): NavItem[] {
  switch (role) {
    case "ADMIN":
      return adminNav;

    case "STAFF":
      return staffNav;

    case "CUSTOMER":
      return customerNav;

    default: {
      const exhaustiveCheck: never = role;
      return exhaustiveCheck;
    }
  }
}