// Central, tunable money for the studio offer — now sourced from @pinprint/shared
// so the backend prices checkout authoritatively from the same numbers. This
// module stays as a thin re-export to keep existing frontend import paths stable.
// Edit the prices in packages/shared/src/commerce.ts.

export {
  PRINT_PRICE_CENTS,
  LIST_PRICE_CENTS,
  FRAME_UPCHARGE_CENTS,
  DIGITAL_PRICE_CENTS,
  DIGITAL_LIST_PRICE_CENTS,
  DEFAULT_FRAME_UPCHARGE_CENTS,
  FREE_SHIPPING,
  FOUNDING_PRICES_END_ISO,
  isFoundingPricingActive,
  discountPercent,
} from "@pinprint/shared";

import { FOUNDING_PRICES_END_ISO, isFoundingPricingActive } from "@pinprint/shared";

const FOUNDING_DEADLINE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  // FOUNDING_PRICES_END_ISO is a date-only string (parsed as UTC midnight);
  // formatting in the server/browser's local zone could show the day before
  // depending on where it runs, so pin the formatter to UTC too.
  timeZone: "UTC",
});

/**
 * "Founding prices hold until October 1, 2026, then they become our standard
 * rates." — an honest deadline, not a fake sale. Returns null once
 * FOUNDING_PRICES_END_ISO has passed, so callers can simply skip rendering.
 * `now` defaults to the caller's current time; client ("use client")
 * components should pass a freshly-read `new Date()` post-hydration (see the
 * existing useHydrated + delivery-ETA pattern) so the server-rendered shell
 * never disagrees with the visitor's own clock.
 */
export function foundingPriceLine(now: Date = new Date()): string | null {
  if (!isFoundingPricingActive(now)) return null;
  const deadline = FOUNDING_DEADLINE_FORMATTER.format(new Date(FOUNDING_PRICES_END_ISO));
  return `Founding prices hold until ${deadline}, then they become our standard rates.`;
}
