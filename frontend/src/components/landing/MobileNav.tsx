"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@neondatabase/auth/react/ui";
import { authClient } from "@/lib/auth/client";
import { ACCOUNT_LINKS } from "@/components/account/links";
import { copy } from "./copy";

/**
 * Mobile-only nav menu. The desktop bar keeps the primary "Create your poster"
 * CTA as the single filled action; on small screens the in-page anchors and the
 * low-priority "Sign in" link move behind this hamburger so the CTA stands alone.
 * A small client island (state for open/close) so SiteHeader can stay a server
 * component. Hidden from md: up, where the inline desktop nav takes over.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // The avatar dropdown is hidden on mobile (see AccountNav), so the account
  // links + sign out live here instead. Full reload after sign out mirrors the
  // auth library's own behaviour and guarantees the session UI fully resets.
  async function handleSignOut() {
    setOpen(false);
    await authClient.signOut();
    window.location.href = "/";
  }

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex size-11 items-center justify-center rounded-pill text-ink transition-colors hover:bg-surface-strong"
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          aria-hidden
        >
          {open ? (
            <path d="M5 5l14 14M19 5L5 19" />
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      {open && (
        <>
          {/* Click-away layer (sits under the panel, above page content). */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            id={panelId}
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-2xl border border-hairline bg-canvas shadow-[0_12px_32px_rgba(0,0,0,0.12)]"
          >
            <nav className="flex flex-col py-1">
              {copy.nav.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="px-4 py-3 text-[15px] font-medium text-body transition-colors hover:bg-surface-strong hover:text-ink"
                >
                  {link.label}
                </a>
              ))}
              <SignedOut>
                <Link
                  href="/auth/sign-in"
                  onClick={() => setOpen(false)}
                  className="border-t border-hairline px-4 py-3 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-strong"
                >
                  Sign in
                </Link>
              </SignedOut>
              <SignedIn>
                {ACCOUNT_LINKS.map((link, i) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`${i === 0 ? "border-t border-hairline " : ""}px-4 py-3 text-[15px] font-medium text-body transition-colors hover:bg-surface-strong hover:text-ink`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="border-t border-hairline px-4 py-3 text-left text-[15px] font-semibold text-ink transition-colors hover:bg-surface-strong"
                >
                  Sign out
                </button>
              </SignedIn>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
