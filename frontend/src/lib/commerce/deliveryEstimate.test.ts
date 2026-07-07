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
    // Valentine's Day 2026-02-14 (Saturday); conservative cutoff works out to
    // 2026-01-30 (Friday) by hand (11 business days back, skipping 2 weekends).
    const cutoff = activeOccasionCutoff(utc(2026, 1, 30));
    expect(cutoff?.occasion.name).toBe("Valentine's Day");
    expect(cutoff?.orderByDate).toEqual(utc(2026, 1, 30));
    expect(formatOccasionCutoff(cutoff!)).toBe(
      "Order by Jan 30 to arrive before Valentine's Day",
    );
  });

  it("is no longer active the day after the cutoff, and nothing else is in range", () => {
    // The next occasion (Mother's Day) is months away, so this must be null,
    // not silently fall through to a later occasion outside its own window.
    expect(activeOccasionCutoff(utc(2026, 1, 31))).toBeNull();
  });

  it("returns null when no occasion falls within the 30 day window", () => {
    // Well clear of Father's Day (past) and Christmas (too far ahead).
    expect(activeOccasionCutoff(utc(2026, 8, 1))).toBeNull();
  });

  it("picks the nearest occasion when more than one exists", () => {
    // 25 days before Christmas 2026-12-25, comfortably inside the window and
    // its cutoff (2026-12-10, well before this date) has already passed, so
    // nothing should be returned even though Christmas itself is still close.
    const cutoff = activeOccasionCutoff(utc(2026, 12, 15));
    expect(cutoff).toBeNull();
  });

  it("is active in the days just before an occasion's own cutoff passes", () => {
    // Father's Day 2026-06-21 (Sunday); well within 30 days on 2026-06-01.
    const cutoff = activeOccasionCutoff(utc(2026, 6, 1));
    expect(cutoff?.occasion.name).toBe("Father's Day");
    expect(cutoff?.occasionDate).toEqual(utc(2026, 6, 21));
  });

  it("contains no dashes or exclamation marks in any occasion name or formatted message", () => {
    const all = JSON.stringify(OCCASIONS);
    expect(all).not.toMatch(/[—–]/);
    expect(all).not.toMatch(/!/);
  });
});
