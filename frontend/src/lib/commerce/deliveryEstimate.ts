// Client-side delivery estimate math. There is no ETA feed from Artelo (the
// print fulfilment partner) or any carrier — every date here is derived from
// the self-declared production/shipping figures already quoted in the FAQ
// (frontend/src/components/landing/copy.ts, "Shipping & delivery" group:
// "made and shipped within 2 to 3 business days, and arrives within 5 to 10
// business days total"). These two constants are the single source for that
// prose; the FAQ text itself stays hand-written (it's covered by the copy
// voice-rule tests), but a comment there points back here.
//
// Every rendered string built from this module must read as an estimate,
// never a promise: "arrives", never "will arrive" or "guaranteed by".
//
// Date-only math, done in UTC. All call sites are "use client" components
// that compute a fresh `now` on the client after mount (see useHydrated
// elsewhere in the codebase) — never during server render — so the same
// visitor never sees a server-computed date disagree with their own clock,
// and static pages never bake in a date at build time. On top of the
// self-declared max-transit figure we add one extra conservative buffer day
// (BUFFER_BUSINESS_DAYS below) before treating a date as the "latest" bound,
// since this is pure estimate math with no carrier confirmation behind it.

/** "Made and shipped within N business days" — the production leg only. */
export const PRODUCTION_BUSINESS_DAYS = { min: 2, max: 3 } as const;

/** "Arrives within N business days total" — production + transit, door to door. */
export const TOTAL_BUSINESS_DAYS = { min: 5, max: 10 } as const;

/**
 * Extra business day folded into every "latest" bound (delivery window and
 * occasion cutoffs) on top of TOTAL_BUSINESS_DAYS.max, since this whole module
 * is self-declared estimate math with no confirmed carrier data behind it.
 */
const BUFFER_BUSINESS_DAYS = 1;

const MAX_TRANSIT_BUSINESS_DAYS = TOTAL_BUSINESS_DAYS.max + BUFFER_BUSINESS_DAYS;

/**
 * Static US federal holiday table, date-only (UTC), 2026 to 2027. Weekend
 * observed-holiday shifts are folded in already (e.g. a Saturday holiday
 * lists the preceding Friday). Maintenance contract: extend this table with
 * the next calendar year well before it runs out — see the coverage test in
 * deliveryEstimate.test.ts, which is pinned to 2026/2027 rather than derived
 * from the system clock so it fails loudly (in code review, not silently in
 * production) once it needs extending.
 */
export const US_HOLIDAYS: readonly string[] = [
  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-19", // Martin Luther King Jr. Day
  "2026-02-16", // Washington's Birthday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed; July 4 falls on a Saturday)
  "2026-09-07", // Labor Day
  "2026-10-12", // Columbus Day
  "2026-11-11", // Veterans Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
  // 2027
  "2027-01-01", // New Year's Day
  "2027-01-18", // Martin Luther King Jr. Day
  "2027-02-15", // Washington's Birthday
  "2027-05-31", // Memorial Day
  "2027-06-18", // Juneteenth (observed; June 19 falls on a Saturday)
  "2027-07-05", // Independence Day (observed; July 4 falls on a Sunday)
  "2027-09-06", // Labor Day
  "2027-10-11", // Columbus Day
  "2027-11-11", // Veterans Day
  "2027-11-25", // Thanksgiving
  "2027-12-24", // Christmas (observed; December 25 falls on a Saturday)
];

const HOLIDAY_SET = new Set(US_HOLIDAYS);

/** A yearly gifting occasion the "order by" banner can anchor to. */
export interface Occasion {
  name: string;
  /** Date-only, YYYY-MM-DD (UTC). */
  date: string;
}

/**
 * Tabulated (not computed) for 2026 and 2027, same maintenance contract as
 * US_HOLIDAYS: Christmas and Valentine's Day are fixed calendar dates;
 * Mother's Day is the 2nd Sunday of May and Father's Day the 3rd Sunday of
 * June, worked out by hand for each year rather than at runtime.
 */
export const OCCASIONS: readonly Occasion[] = [
  { name: "Valentine's Day", date: "2026-02-14" },
  { name: "Mother's Day", date: "2026-05-10" },
  { name: "Father's Day", date: "2026-06-21" },
  { name: "Christmas", date: "2026-12-25" },
  { name: "Valentine's Day", date: "2027-02-14" },
  { name: "Mother's Day", date: "2027-05-09" },
  { name: "Father's Day", date: "2027-06-20" },
  { name: "Christmas", date: "2027-12-25" },
];

/** Only within this many days before an occasion do we surface its cutoff. */
const OCCASION_WINDOW_DAYS = 30;

function dateOnlyUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Parses a YYYY-MM-DD key as a UTC-midnight Date. */
function parseDateKey(key: string): Date {
  const [y, m, day] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !HOLIDAY_SET.has(dateKey(d));
}

function diffCalendarDays(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/**
 * Adds (or, for a negative `days`, subtracts) N business days to a date,
 * skipping weekends and US_HOLIDAYS. `date` itself is never counted, only
 * counts as a starting point for the walk.
 */
export function addBusinessDays(date: Date, days: number): Date {
  const result = dateOnlyUtc(date);
  const step = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + step);
    if (isBusinessDay(result)) remaining -= 1;
  }
  return result;
}

export interface DeliveryWindow {
  earliest: Date;
  latest: Date;
}

/**
 * The estimated arrival window for an order placed "now": the earliest bound
 * uses the fast end of TOTAL_BUSINESS_DAYS, the latest bound uses the slow
 * end plus the conservative buffer day.
 */
export function estimateDeliveryWindow(now: Date): DeliveryWindow {
  return {
    earliest: addBusinessDays(now, TOTAL_BUSINESS_DAYS.min),
    latest: addBusinessDays(now, MAX_TRANSIT_BUSINESS_DAYS),
  };
}

function formatMonthDay(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Arrives Jul 13 to Jul 21" — always "to", never a dash. */
export function formatDeliveryWindow(window: DeliveryWindow): string {
  return `Arrives ${formatMonthDay(window.earliest)} to ${formatMonthDay(window.latest)}`;
}

export interface OccasionCutoff {
  occasion: Occasion;
  /** The occasion date itself, parsed to UTC midnight. */
  occasionDate: Date;
  /** Latest date an order can be placed for a conservative-transit arrival to still land before the occasion. */
  orderByDate: Date;
}

/**
 * The nearest occasion, within OCCASION_WINDOW_DAYS of `now`, whose
 * conservative cutoff (the order-by date using the slow end of transit plus
 * the buffer day) hasn't passed yet. Returns null once every occasion in the
 * window is already too late to make, or none is close enough yet.
 */
export function activeOccasionCutoff(now: Date): OccasionCutoff | null {
  const today = dateOnlyUtc(now);

  const upcoming = OCCASIONS.map((occasion) => {
    const occasionDate = parseDateKey(occasion.date);
    return { occasion, occasionDate };
  })
    .filter(({ occasionDate }) => {
      const daysUntil = diffCalendarDays(occasionDate, today);
      return daysUntil >= 0 && daysUntil <= OCCASION_WINDOW_DAYS;
    })
    .sort((a, b) => a.occasionDate.getTime() - b.occasionDate.getTime());

  for (const { occasion, occasionDate } of upcoming) {
    const orderByDate = addBusinessDays(occasionDate, -MAX_TRANSIT_BUSINESS_DAYS);
    if (orderByDate.getTime() >= today.getTime()) {
      return { occasion, occasionDate, orderByDate };
    }
  }
  return null;
}

/** "Order by Jan 30 to arrive before Valentine's Day" — always "to", never a dash. */
export function formatOccasionCutoff(cutoff: OccasionCutoff): string {
  return `Order by ${formatMonthDay(cutoff.orderByDate)} to arrive before ${cutoff.occasion.name}`;
}
