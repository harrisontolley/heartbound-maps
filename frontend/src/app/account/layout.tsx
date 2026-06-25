"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RedirectToSignIn, SignedIn, SignedOut } from "@neondatabase/auth/react/ui";
import { AccountMenu } from "@/components/account/AccountMenu";

// Account chrome + route protection. Signed-out visitors are redirected to
// /auth/sign-in; signed-in users get the wordmark bar, a sidebar, and the page
// content. Client component because gating + active-nav need the session/pathname.

const NAV = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/rewards", label: "Rewards" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/settings", label: "Settings" },
];

export default function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
      <SignedIn>
        <div className="min-h-full bg-canvas">
          <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/85 backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-[1100px] items-center justify-between px-6">
              <Link href="/" className="font-display text-2xl tracking-[-0.32px] text-ink">
                Pinprint
              </Link>
              <AccountMenu />
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-[1100px] gap-8 px-6 py-8 lg:grid-cols-[200px_1fr]">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {NAV.map((item) => {
                const active = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shrink-0 rounded-md px-3 py-2 text-[15px] transition-colors ${
                      active
                        ? "bg-surface-strong font-medium text-ink"
                        : "text-body hover:bg-surface-strong hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
