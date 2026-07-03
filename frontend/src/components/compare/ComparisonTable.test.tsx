import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ComparisonRow } from "@/lib/compare/types";
import { ComparisonTable } from "./ComparisonTable";

// This config doesn't enable Vitest globals, so RTL's auto-cleanup isn't registered;
// unmount between tests so renders don't accumulate in the shared jsdom document.
afterEach(cleanup);

const ROWS: ComparisonRow[] = [
  {
    attribute: "Bearings & distances",
    pinprint: "True bearing + distance",
    competitor: "No measurements",
    advantage: "pinprint",
  },
  {
    attribute: "Shipping",
    pinprint: "Free (US only)",
    competitor: "Worldwide",
    advantage: "competitor",
  },
];

describe("ComparisonTable", () => {
  // The component renders the same rows twice (table for sm+, stacked cards
  // below sm — only one is visible at a time via CSS), so text queries assert
  // on both copies.
  it("renders the competitor column header and every row", () => {
    render(<ComparisonTable rows={ROWS} competitorName="Mapiful" />);
    expect(screen.getAllByText("Pinprint").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mapiful").length).toBeGreaterThan(0);
    for (const row of ROWS) {
      expect(screen.getAllByText(row.attribute)).toHaveLength(2);
      expect(screen.getAllByText(row.pinprint)).toHaveLength(2);
      expect(screen.getAllByText(row.competitor)).toHaveLength(2);
    }
  });

  it("flags rows where Pinprint has the edge", () => {
    render(<ComparisonTable rows={ROWS} competitorName="Mapiful" />);
    // One row is advantage: "pinprint" → one ✓ per rendering (table + cards).
    expect(screen.getAllByText("✓")).toHaveLength(2);
  });
});
