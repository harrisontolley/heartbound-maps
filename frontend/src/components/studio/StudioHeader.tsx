"use client";

import { type MouseEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { AccountNav } from "@/components/account/AccountNav";
import { CartNav } from "@/components/cart/CartNav";
import { usePosterStore } from "@/lib/store/posterStore";
import { isCustomized } from "@/lib/templates/customize";
import { DEFAULT_TEMPLATE_ID } from "@/lib/templates/registry";

/**
 * The studio's top bar: wordmark + tagline on the left, cart + account on the
 * right. Export lives on the Review step now (one calm header for the staged
 * flow). The single ink-pill primary is reserved for "Add to cart" in the buy
 * bar (DESIGN.md: one primary action).
 *
 * The wordmark is the studio's "leave" affordance. Once the buyer has done real
 * work we intercept it and confirm before navigating away. The draft is
 * auto-saved either way, so the copy reassures rather than warns; leaving keeps
 * the draft so they can resume.
 */
export function StudioHeader({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const home = usePosterStore((s) => s.home);
  const places = usePosterStore((s) => s.places);
  const templateId = usePosterStore((s) => s.templateId);
  const customization = usePosterStore((s) => s.customization);

  const hasWork =
    home != null ||
    places.length > 0 ||
    templateId !== DEFAULT_TEMPLATE_ID ||
    isCustomized(customization);

  function handleLeave(e: MouseEvent<HTMLAnchorElement>) {
    // Let modifier/middle clicks (open-in-new-tab) and the no-work case through.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!hasWork) return;
    e.preventDefault();
    setConfirming(true);
  }

  return (
    <header
      className={`relative z-20 shrink-0 overflow-hidden border-b border-hairline bg-canvas ${className}`}
    >
      <div className="relative z-10 flex items-center justify-between gap-4 px-5 py-3">
        <div className="flex items-baseline gap-3">
          <Link
            href="/"
            title="Back to home"
            onClick={handleLeave}
            className="rounded-sm transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <h1 className="font-display text-2xl leading-none text-ink">Heartbound Maps</h1>
          </Link>
          <span className="hidden text-sm text-muted sm:inline">
            fine art maps of the places that matter
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CartNav />
          <AccountNav />
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Leave the studio?"
        body="Your design is saved as a draft, so you can pick up right where you left off."
        confirmLabel="Leave"
        cancelLabel="Stay"
        emphasis="cancel"
        onConfirm={() => {
          setConfirming(false);
          router.push("/");
        }}
        onCancel={() => setConfirming(false)}
      />
    </header>
  );
}
