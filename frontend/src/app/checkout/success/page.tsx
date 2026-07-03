"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn } from "@neondatabase/auth/react/ui";
import type { CheckoutOrderStatus, OrderStatus } from "@pinprint/shared";
import { apiGet } from "@/lib/apiClient";
import { AccountNav } from "@/components/account/AccountNav";
import { CartNav } from "@/components/cart/CartNav";
import { Card } from "@/components/account/Card";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/store/cartStore";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";

// Order confirmation. Stripe redirects here with ?session_id=… after payment.
// We look the order up by session id and poll briefly: the order exists
// immediately (created before redirect), but the "paid" transition lands via the
// async webhook, so we optimistically poll a few times. The cart is cleared once
// (after rehydration, so the global rehydrate can't repopulate it).

const MAX_POLLS = 5;
const POLL_MS = 1800;

function paidCopy(status: OrderStatus | null): string {
  if (status === "pending_payment" || status === null) {
    return "We're confirming your payment. You'll get an email receipt shortly.";
  }
  return "Payment confirmed. We've emailed your receipt and we'll keep you posted as your order is made and shipped.";
}

export default function CheckoutSuccessPage() {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const track = useTrackEvent();

  // Client-side, low-trust signal that the buyer actually landed here — the
  // canonical checkout_completed is captured server-side (backend/src/
  // webhooks.ts) so it's trustworthy even if this page never loads.
  useEffect(() => {
    if (orderNumber && status) {
      track(ANALYTICS_EVENTS.checkoutSuccessViewed, {
        order_number: orderNumber,
        status,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, status]);

  // Clear the cart once, after hydration finishes (otherwise the global
  // rehydrate could repopulate it from localStorage after we've cleared).
  useEffect(() => {
    const clear = () => useCartStore.getState().clear();
    if (useCartStore.persist.hasHydrated()) {
      clear();
      return;
    }
    return useCartStore.persist.onFinishHydration(clear);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    async function poll() {
      const sid = new URLSearchParams(window.location.search).get("session_id");
      if (!sid) {
        setState("error");
        return;
      }
      try {
        const data = await apiGet<CheckoutOrderStatus>(
          `/checkout/session/${encodeURIComponent(sid)}`,
        );
        if (cancelled) return;
        setOrderNumber(data.orderNumber);
        setStatus(data.status);
        setState("ready");
        if (data.status === "pending_payment" && tries < MAX_POLLS) {
          tries += 1;
          window.setTimeout(poll, POLL_MS);
        }
      } catch {
        if (cancelled) return;
        // The order is created before the redirect, so a 404 here is unlikely;
        // retry a few times before giving up (still a successful payment).
        if (tries < MAX_POLLS) {
          tries += 1;
          window.setTimeout(poll, POLL_MS);
        } else {
          setState("error");
        }
      }
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between px-6">
          <Link href="/" className="font-display text-2xl tracking-[-0.32px] text-ink">
            Pinprint
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <CartNav />
            <AccountNav />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[640px] px-6 py-16">
        <Card className="p-8 text-center">
          {state === "error" ? (
            <>
              <h1 className="font-display text-2xl text-ink">Thanks for your order</h1>
              <p className="mt-3 text-sm text-muted">
                If you completed payment, you&apos;ll receive an email receipt. You can also
                look your order up any time.
              </p>
            </>
          ) : (
            <>
              <div
                className="mx-auto flex size-12 items-center justify-center rounded-pill bg-primary text-on-primary"
                aria-hidden
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <h1 className="mt-5 font-display text-3xl text-ink">Thank you!</h1>
              {orderNumber ? (
                <p className="mt-2 text-sm text-muted">
                  Order <span className="font-medium text-ink">{orderNumber}</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">Confirming your order…</p>
              )}
              <p className="mx-auto mt-4 max-w-sm text-sm text-body">{paidCopy(status)}</p>
            </>
          )}

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <SignedIn>
              <Link href="/account/orders">
                <Button variant="primary">View your orders</Button>
              </Link>
            </SignedIn>
            <Link href="/track">
              <Button variant="outline">Track your order</Button>
            </Link>
            <Link href="/studio">
              <Button variant="tertiary">Make another</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
