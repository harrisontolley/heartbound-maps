// Account links shown in both the desktop avatar dropdown (AccountMenu) and the
// mobile hamburger menu (MobileNav). Single source so the two never drift.
export const ACCOUNT_LINKS = [
  { href: "/account", label: "Overview" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/profile", label: "Profile" },
] as const;
