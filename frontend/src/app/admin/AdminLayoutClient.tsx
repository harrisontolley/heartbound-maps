"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RedirectToSignIn, SignedIn, SignedOut } from "@neondatabase/auth/react/ui";
import { useResource } from "@/lib/account/useResource";
import { AccountMenu } from "@/components/account/AccountMenu";
import { Loading } from "@/components/account/States";

// Admin chrome + double gate. Signed-out → sign in. Signed-in but not on the
// server's ADMIN_EMAILS allowlist → the /admin/me probe 403s and we show a plain
// "not authorized" panel. The real enforcement is requireAdmin on every backend
// route; this gate is only so non-admins don't see an admin shell full of errors.

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
];

function AdminGate({ children }: { children: ReactNode }) {
  const { data, loading, error } = useResource<{ email: string; admin: boolean }>("/admin/me");

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1100px] px-6 py-10">
        <Loading rows={3} />
      </div>
    );
  }
  if (error || !data?.admin) {
    return (
      <div className="mx-auto w-full max-w-[640px] px-6 py-20 text-center">
        <h1 className="font-display text-2xl text-ink">Not authorized</h1>
        <p className="mt-2 text-body">
          This area is for store operators. If you think you should have access, ask an admin to
          add your email to the allowlist.
        </p>
        <Link href="/" className="mt-6 inline-block text-ink underline">
          Back to Heartbound Maps
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
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
              <div className="flex items-center gap-3">
                <Link href="/" className="font-display text-2xl tracking-[-0.32px] text-ink">
                  Heartbound Maps
                </Link>
                <span className="rounded-full border border-hairline bg-surface-strong px-2 py-0.5 text-xs font-medium text-muted">
                  Admin
                </span>
              </div>
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

            <main className="min-w-0">
              <AdminGate>{children}</AdminGate>
            </main>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
