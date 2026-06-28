"use client";

import Link from "next/link";
import { useHydrated } from "@/hooks/useHydrated";
import { cartCount, useCartStore } from "@/lib/store/cartStore";

/**
 * Header cart link with a live item-count badge. A small client island so the
 * surrounding header can stay a server component. The count is gated by
 * useHydrated() (and the cart's own client-only rehydrate) so SSR + first paint
 * render the bare icon — no hydration mismatch.
 */
export function CartNav({ className = "" }: { className?: string }) {
  const hydrated = useHydrated();
  const count = useCartStore((s) => cartCount(s.items));
  const show = hydrated && count > 0;

  return (
    <Link
      href="/cart"
      aria-label={show ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      className={`relative flex size-10 items-center justify-center rounded-pill text-ink transition-colors hover:bg-surface-strong ${className}`}
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 7h13l-1.2 8.4a2 2 0 0 1-2 1.6H9.2a2 2 0 0 1-2-1.6L6 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      {show && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-[1.15rem] items-center justify-center rounded-pill bg-primary px-1 text-[11px] font-semibold leading-[1.15rem] text-on-primary">
          {count}
        </span>
      )}
    </Link>
  );
}
