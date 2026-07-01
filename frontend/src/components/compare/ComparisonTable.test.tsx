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
  it("renders the competitor column header and every row", () => {
    render(<ComparisonTable rows={ROWS} competitorName="Mapiful" />);
    expect(screen.getByText("Pinprint")).toBeInTheDocument();
    expect(screen.getByText("Mapiful")).toBeInTheDocument();
    expect(screen.getByText("Bearings & distances")).toBeInTheDocument();
    expect(screen.getByText("True bearing + distance")).toBeInTheDocument();
    expect(screen.getByText("No measurements")).toBeInTheDocument();
  });

  it("flags rows where Pinprint has the edge", () => {
    render(<ComparisonTable rows={ROWS} competitorName="Mapiful" />);
    // Exactly one row is advantage: "pinprint" → exactly one ✓ marker.
    expect(screen.getAllByText("✓")).toHaveLength(1);
  });
});
