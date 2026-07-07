"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut } from "@neondatabase/auth/react/ui";
import type { CreateCheckoutResponse } from "@pinprint/shared";
import { apiFetch } from "@/lib/apiClient";
import { AccountNav } from "@/components/account/AccountNav";
import { CartNav } from "@/components/cart/CartNav";
import { Card } from "@/components/account/Card";
import { Button } from "@/components/ui/Button";
import { copy } from "@/components/landing/copy";
import { formatUsd, FRAME_COLOR_LABELS } from "@/lib/commerce/price";
import { FREE_SHIPPING } from "@/lib/commerce/pricing";
import {
  cartSubtotalCents,
  useCartStore,
  type CartItem,
} from "@/lib/store/cartStore";
import { snapshotSummary } from "@/lib/commerce/posterConfig";
import { useCartHydrated } from "@/hooks/useCartHydrated";
import { useHydrated } from "@/hooks/useHydrated";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";
import { estimateDeliveryWindow, formatDeliveryWindow } from "@/lib/commerce/deliveryEstimate";
import { OccasionBanner } from "@/components/studio/OccasionBanner";

// The cart: review configured posters, adjust quantities, then hand the whole
// cart to the backend, which prices it authoritatively and returns a Stripe
// Checkout URL. The shipping address + email are collected by Stripe's hosted
// page (signed-out buyers may pre-fill an email here for their receipt/tracking).

function lineDescriptor(item: CartItem): string {
  const { selection } = item;
  if (selection.format === "digital") return "Digital download";
  if (!selection.frame) return "Print + digital file";
  return `Framed print (${FRAME_COLOR_LABELS[selection.frame.color]}) + digital file`;
}

export default function CartPage() {
  const hydrated = useCartHydrated();
  const mounted = useHydrated();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-attempt idempotency key, kept against a signature of the cart. Reused while
  // the cart is unchanged (so a double-click / retry can't create a duplicate order
  // or Stripe session), regenerated once the cart changes (a fresh attempt).
  const idempotency = useRef<{ key: string; sig: string } | null>(null);
  const track = useTrackEvent();

  // Read once on the client only (mounted is false during SSR + first paint, so
  // this never causes a hydration mismatch and needs no setState-in-effect).
  const canceled =
    mounted && new URLSearchParams(window.location.search).get("canceled") === "1";

  const subtotal = cartSubtotalCents(items);

  // Estimate only — no ETA data exists from Artelo or a carrier. Digital
  // downloads deliver instantly by email, so skip the line when the cart is
  // digital-only. Computed fresh on the client only, after hydration (see the
  // `mounted` comment above), so the server-rendered shell never disagrees
  // with the visitor's own clock.
  const hasPhysicalItem = items.some((i) => i.selection.format !== "digital");
  const etaLabel =
    mounted && hasPhysicalItem
      ? formatDeliveryWindow(estimateDeliveryWindow(new Date()))
      : null;

  async function checkout() {
    if (items.length === 0) return;
    setSubmitting(true);
    setError(null);
    track(ANALYTICS_EVENTS.checkoutStarted, {
      cart_item_count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal_cents: subtotal,
    });
    // Reuse the key while the cart is unchanged (retry of the same attempt);
    // regenerate it once the cart changes.
    const sig = items
      .map(
        (i) =>
          `${i.id}:${i.quantity}:${i.assetUrl ?? ""}:${i.svgAssetUrl ?? ""}:` +
          `${i.phoneWallpaperAssetUrl ?? ""}:${i.desktopWallpaperAssetUrl ?? ""}`,
      )
      .join("|");
    const attemptKey =
      idempotency.current?.sig === sig ? idempotency.current.key : crypto.randomUUID();
    idempotency.current = { key: attemptKey, sig };
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.selection.productId,
          format: i.selection.format,
          frame: i.selection.frame,
          quantity: i.quantity,
          posterConfig: i.posterConfig,
          assetUrl: i.assetUrl,
          svgAssetUrl: i.svgAssetUrl,
          phoneWallpaperAssetUrl: i.phoneWallpaperAssetUrl,
          desktopWallpaperAssetUrl: i.desktopWallpaperAssetUrl,
        })),
        email: email.trim() || undefined,
      };
      const res = await apiFetch("/checkout/session", {
        method: "POST",
        headers: { "Idempotency-Key": attemptKey },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        track(ANALYTICS_EVENTS.checkoutFailed, { error_code: String(res.status) });
        setError(
          res.status === 503
            ? "Checkout is temporarily unavailable. Please try again soon."
            : "We couldn't start checkout. Please review your cart and try again.",
        );
        setSubmitting(false);
        return;
      }
      const { url } = (await res.json()) as CreateCheckoutResponse;
      window.location.assign(url); // redirect to Stripe; keep submitting state
    } catch {
      track(ANALYTICS_EVENTS.checkoutFailed, { error_code: "client_error" });
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[860px] items-center justify-between px-6">
          <Link href="/" className="font-display text-2xl tracking-[-0.32px] text-ink">
            Pinprint
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <CartNav />
            <AccountNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-6 py-10">
        <h1 className="font-display text-3xl text-ink">Your cart</h1>

        {canceled ? (
          <p className="mt-3 rounded-md border border-hairline bg-surface-strong px-4 py-3 text-sm text-body">
            Checkout canceled — your cart is still here whenever you&apos;re ready.
          </p>
        ) : null}

        {!hydrated ? (
          <p className="mt-8 text-sm text-muted">Loading your cart…</p>
        ) : items.length === 0 ? (
          <Card className="mt-6 p-8 text-center">
            <p className="text-body">Your cart is empty.</p>
            <p className="mt-1 text-sm text-muted">
              Design your piece of the places that matter, then add it here.
            </p>
            <div className="mt-5 flex justify-center">
              <Link href="/studio">
                <Button variant="primary">Create your print</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-start">
            {/* Line items */}
            <ul className="flex flex-col gap-3">
              {items.map((item) => {
                const lineTotal = item.selection.totalCents * item.quantity;
                return (
                  <li key={item.id}>
                    <Card className="flex items-start justify-between gap-4 p-5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {snapshotSummary(item.posterConfig, item.selection.size.label)}
                        </p>
                        <p className="mt-0.5 text-sm text-muted">{lineDescriptor(item)}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatUsd(item.selection.totalCents)} each
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex items-center rounded-pill border border-hairline-strong">
                            <button
                              type="button"
                              aria-label="Decrease quantity"
                              onClick={() => setQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="flex size-8 items-center justify-center rounded-pill text-ink transition-colors hover:bg-surface-strong disabled:opacity-30 pointer-coarse:size-11"
                            >
                              −
                            </button>
                            <span className="min-w-[1.5rem] text-center text-sm tabular-nums text-ink">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              aria-label="Increase quantity"
                              onClick={() => setQuantity(item.id, item.quantity + 1)}
                              className="flex size-8 items-center justify-center rounded-pill text-ink transition-colors hover:bg-surface-strong pointer-coarse:size-11"
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-sm text-muted underline-offset-2 transition-colors hover:text-ink hover:underline pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-display text-lg text-ink">
                          {formatUsd(lineTotal)}
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>

            {/* Summary */}
            <Card className="p-6 lg:sticky lg:top-6">
              <h2 className="font-display text-xl text-ink">Summary</h2>
              <dl className="mt-4 flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal</dt>
                  <dd className="text-ink">{formatUsd(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Shipping</dt>
                  <dd className="text-ink">
                    {FREE_SHIPPING ? "Free" : "Calculated at checkout"}
                  </dd>
                </div>
                <div className="mt-2 flex justify-between border-t border-hairline pt-3 text-base">
                  <dt className="font-medium text-ink">Total</dt>
                  <dd className="font-display text-xl text-ink">{formatUsd(subtotal)}</dd>
                </div>
              </dl>

              {etaLabel && (
                <p className="mt-3 text-[11px] text-muted">{etaLabel}</p>
              )}
              {/* Same gate as the ETA line: a shipping cutoff is meaningless
                  for an instant digital download. */}
              {hasPhysicalItem && <OccasionBanner className="mt-1" />}

              {/* Same gate as the ETA line and OccasionBanner above: nothing
                  can arrive damaged when nothing ships (a digital-only cart). */}
              {hasPhysicalItem && (
                <p className="mt-3 text-[11px] text-muted">
                  Covered by the{" "}
                  <Link
                    href="/guarantee"
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    {copy.guarantee.name}
                  </Link>
                  : arrives damaged or flawed, and we&apos;ll replace it free or
                  refund you in full.
                </p>
              )}

              <SignedOut>
                <label className="mt-5 flex flex-col gap-1">
                  <span className="text-xs text-muted">Email (for your receipt & tracking)</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="h-11 rounded-md border border-hairline-strong bg-canvas px-3 text-[16px] text-ink outline-none focus:border-ink"
                  />
                </label>
              </SignedOut>

              {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}

              <Button
                variant="primary"
                onClick={checkout}
                disabled={submitting}
                className="mt-5 w-full"
              >
                {submitting ? "Redirecting…" : "Checkout"}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted">
                Secure payment by Stripe. Address collected at checkout.
              </p>
              <SignedIn>
                <p className="sr-only">Signed in. Your account email will be used.</p>
              </SignedIn>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
