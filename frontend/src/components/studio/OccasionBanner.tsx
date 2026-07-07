"use client";

import { useHydrated } from "@/hooks/useHydrated";
import { activeOccasionCutoff, formatOccasionCutoff } from "@/lib/commerce/deliveryEstimate";

/**
 * The only honest urgency mechanism this gift-brand storefront has: a plain
 * "order by" cutoff for the nearest upcoming gifting occasion (Valentine's
 * Day, Mother's Day, Father's Day, Christmas), computed from the same
 * self-declared production/shipping figures as the FAQ and the BuyBar ETA
 * line (frontend/src/lib/commerce/deliveryEstimate.ts). Renders nothing
 * outside the ~30 day window before an occasion, or once its conservative
 * cutoff has passed.
 *
 * Uses `useHydrated()` rather than an effect + setState so there's no
 * setState-in-effect: the date is computed fresh only once the component is
 * known to be running on the client (mirrors the `mounted` gate in
 * frontend/src/app/cart/page.tsx), so a server-rendered shell never disagrees
 * with the visitor's own clock.
 */
export function OccasionBanner({ className }: { className?: string }) {
  const mounted = useHydrated();
  const cutoff = mounted ? activeOccasionCutoff(new Date()) : null;

  if (!cutoff) return null;

  return (
    <p className={`text-[12px] leading-[1.5] text-muted ${className ?? ""}`}>
      {formatOccasionCutoff(cutoff)}
    </p>
  );
}
