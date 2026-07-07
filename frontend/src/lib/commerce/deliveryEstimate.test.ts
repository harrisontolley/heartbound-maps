import { describe, it, expect } from "vitest";
import {
  PRODUCTION_BUSINESS_DAYS,
  TOTAL_BUSINESS_DAYS,
  US_HOLIDAYS,
  OCCASIONS,
  addBusinessDays,
  estimateDeliveryWindow,
  formatDeliveryWindow,
  activeOccasionCutoff,
  formatOccasionCutoff,
} from "./deliveryEstimate";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("constants", () => {
  it("matches the self-declared FAQ figures", () => {
    expect(PRODUCTION_BUSINESS_DAYS).toEqual({ min: 2, max: 3 });
    expect(TOTAL_BUSINESS_DAYS).toEqual({ min: 5, max: 10 });
  });
});

describe("US_HOLIDAYS coverage", () => {
  // Deliberately NOT derived from `new Date().getFullYear()`: a system-clock
  // based assertion would silently stop failing once the real year moves past
  // the table's coverage, and nobody would notice until an order's ETA quietly
  // stopped skipping holidays. Pinned instead to a fixed maintenance contract:
  // as of 2026-07-07 the table must cover 2026 and 2027. Extend US_HOLIDAYS
  // (and this test) with 2028 before this stops being true.
  it("covers 2026 and 2027", () => {
    const years = new Set(US_HOLIDAYS.map((d) => d.slice(0, 4)));
    expect(years.has("2026")).toBe(true);
    expect(years.has("2027")).toBe(true);
  });

  it("lists every date as a real weekday-or-weekend calendar date, sorted", () => {
    const sorted = [...US_HOLIDAYS].sort();
    expect(US_HOLIDAYS).toEqual(sorted);
  });
});

describe("US_HOLIDAYS / OCCASIONS coverage (clock-based forcing function)", () => {
  // Unlike the pinned test above (which documents today's maintenance
  // contract and never moves), this one IS deliberately derived from the
  // system clock: it exists to make CI fail loudly, not silently, once the
  // tables run out. A lapsed table doesn't error, it just quietly stops
  // skipping holidays / surfacing occasion cutoffs, which makes delivery
  // estimates optimistic — the dishonest direction — with nothing to notice
  // until a customer complains.
  //
  // The tables are hand-maintained through 2027 (see the file-level comments
  // in deliveryEstimate.ts). This assertion passes today (2026) because 2027
  // is already covered, and it will keep passing right up until the clock
  // rolls over to 2027-01-01 — at which point `currentYear + 1` becomes 2028,
  // which is NOT in either table, and this test starts failing. That failure
  // is the point: extend US_HOLIDAYS/OCCASIONS (and the pinned test above)
  // through the new year+1 before that date, not after.
  const nextYear = String(new Date().getUTCFullYear() + 1);

  it(`US_HOLIDAYS covers next year (${nextYear})`, () => {
    const years = new Set(US_HOLIDAYS.map((d) => d.slice(0, 4)));
    expect(years.has(nextYear)).toBe(true);
  });

  it(`OCCASIONS covers next year (${nextYear})`, () => {
    const years = new Set(OCCASIONS.map((o) => o.date.slice(0, 4)));
    expect(years.has(nextYear)).toBe(true);
  });
});

describe("addBusinessDays", () => {
  it("skips a weekend (Fri + 1 business day lands on Monday)", () => {
    // 2026-01-02 is a Friday.
    expect(addBusinessDays(utc(2026, 1, 2), 1)).toEqual(utc(2026, 1, 5));
  });

  it("skips a named holiday (Thanksgiving 2026-11-26, a Thursday)", () => {
    // 2026-11-23 is a Monday; +3 business days would land on Thanksgiving
    // itself without the holiday skip, so this fails loudly if the skip breaks.
    expect(addBusinessDays(utc(2026, 11, 23), 3)).toEqual(utc(2026, 11, 27));
  });

  it("crosses a year boundary, skipping New Year's Day 2027 plus the weekend around it", () => {
    // 2026-12-29 is a Tuesday. New Year's Day 2027-01-01 is a Friday.
    expect(addBusinessDays(utc(2026, 12, 29), 5)).toEqual(utc(2027, 1, 6));
  });

  it("walks backward for a negative count (inverse of walking forward)", () => {
    expect(addBusinessDays(utc(2026, 1, 5), -1)).toEqual(utc(2026, 1, 2));
  });
});

describe("estimateDeliveryWindow / formatDeliveryWindow", () => {
  it("computes the earliest/latest bound and formats with \"to\", never a dash", () => {
    // 2026-07-06 is a Monday (July 4, 2026 falls on a Saturday).
    const now = utc(2026, 7, 6);
    const window = estimateDeliveryWindow(now);
    expect(window.earliest).toEqual(utc(2026, 7, 13));
    expect(window.latest).toEqual(utc(2026, 7, 21));
    const label = formatDeliveryWindow(window);
    expect(label).toBe("Arrives Jul 13 to Jul 21");
    expect(label).not.toMatch(/[—–]/);
    expect(label).not.toMatch(/!/);
  });
});

describe("activeOccasionCutoff", () => {
  it("is active exactly on the cutoff boundary", () => {
    // Valentine's Day 2026-02-14 (Saturday). The naive 11-business-day walk
    // back gives Fri Jan 30, but an order placed Jan 30 has its 11th business
    // day land on Tue Feb 17 (the forward walk skips the Feb 14/15 weekend
    // AND Washington's Birthday Feb 16) — AFTER the occasion. The
    // conservative algorithm walks back one more business day, so the true
    // cutoff is Thu 2026-01-29 (11 business days forward: Fri Feb 13).
    const cutoff = activeOccasionCutoff(utc(2026, 1, 29));
    expect(cutoff?.occasion.name).toBe("Valentine's Day");
    expect(cutoff?.orderByDate).toEqual(utc(2026, 1, 29));
    expect(formatOccasionCutoff(cutoff!)).toBe(
      "Order by Jan 29 to arrive before Valentine's Day",
    );
  });

  it("is no longer active the day after the cutoff, and nothing else is in range", () => {
    // The next occasion (Mother's Day) is months away, so this must be null,
    // not silently fall through to a later occasion outside its own window.
    expect(activeOccasionCutoff(utc(2026, 1, 30))).toBeNull();
  });

  it("returns null when no occasion falls within the 30 day window", () => {
    // Well clear of Father's Day (past) and Christmas (too far ahead).
    expect(activeOccasionCutoff(utc(2026, 8, 1))).toBeNull();
  });

  it("returns null when the nearest occasion is close but its cutoff has already passed", () => {
    // 10 days before Christmas 2026-12-25, comfortably inside the window, but
    // the conservative cutoff (2026-12-09) has already passed, so nothing
    // should be returned even though Christmas itself is still close: a "too
    // late" cutoff must never render. (No two OCCASIONS are ever within 30
    // days of the same `now` — the closest pair is 42 days apart — so a
    // genuine two-active-occasions case is unreachable by construction.)
    const cutoff = activeOccasionCutoff(utc(2026, 12, 15));
    expect(cutoff).toBeNull();
  });

  it("is active in the days just before an occasion's own cutoff passes", () => {
    // Father's Day 2026-06-21 (Sunday); well within 30 days on 2026-06-01.
    const cutoff = activeOccasionCutoff(utc(2026, 6, 1));
    expect(cutoff?.occasion.name).toBe("Father's Day");
    expect(cutoff?.occasionDate).toEqual(utc(2026, 6, 21));
  });

  it("every occasion's cutoff is forward-consistent: ordering on the cutoff still arrives strictly before the occasion", () => {
    // Cross-check the cutoff against the forward math for EVERY occasion in
    // the table (all of them fall on a weekend or a holiday — exactly the
    // case where a naive backward business-day walk overshoots when walked
    // forward again): an order placed ON the cutoff date must have its
    // conservative latest arrival (estimateDeliveryWindow's `latest`, i.e.
    // max transit plus the buffer day) strictly before the occasion, and the
    // cutoff must be maximal (one business day later would be too late), so
    // buyers are never told to order earlier than they actually need to.
    for (const occasion of OCCASIONS) {
      const [y, m, d] = occasion.date.split("-").map(Number);
      const occasionDate = utc(y, m, d);
      // 30 days out the occasion has just entered its window and its cutoff
      // (roughly 16 to 19 calendar days out) cannot have passed yet.
      const now = new Date(occasionDate.getTime() - 30 * 86_400_000);
      const cutoff = activeOccasionCutoff(now);
      expect(cutoff?.occasion, occasion.date).toEqual(occasion);

      const arrival = estimateDeliveryWindow(cutoff!.orderByDate).latest;
      expect(
        arrival.getTime(),
        `${occasion.date}: ordering on the cutoff must still arrive strictly before the occasion`,
      ).toBeLessThan(occasionDate.getTime());

      const dayAfterCutoff = addBusinessDays(cutoff!.orderByDate, 1);
      expect(
        estimateDeliveryWindow(dayAfterCutoff).latest.getTime(),
        `${occasion.date}: the cutoff must be maximal, not needlessly early`,
      ).toBeGreaterThanOrEqual(occasionDate.getTime());
    }
  });

  it("contains no dashes or exclamation marks in any occasion name or formatted message", () => {
    const all = JSON.stringify(OCCASIONS);
    expect(all).not.toMatch(/[—–]/);
    expect(all).not.toMatch(/!/);
  });
});
