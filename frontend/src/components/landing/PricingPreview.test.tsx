import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PricingPreview } from "./PricingPreview";

afterEach(cleanup);

describe("PricingPreview", () => {
  beforeEach(() => {
    // Fake only Date (not setTimeout/MessageChannel) so React's scheduler is
    // left alone — faking it too can leak a pending callback into a later
    // test file's teardown.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-07-07T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the tier names and both unframed and framed prices, with no strike-through anchors", () => {
    render(<PricingPreview />);

    expect(screen.getByText("Unframed")).toBeInTheDocument();
    expect(screen.getByText("Framed")).toBeInTheDocument();

    for (const price of ["$65", "$95", "$175", "$124", "$168", "$289"]) {
      expect(screen.getByText(price)).toBeInTheDocument();
    }
    for (const tier of ["Studio · 12 × 18 in", "Signature · 16 × 24 in", "Gallery · 24 × 36 in"]) {
      expect(screen.getByText(tier)).toBeInTheDocument();
    }

    expect(document.querySelector("s")).not.toBeInTheDocument();
    expect(document.querySelector(".line-through")).not.toBeInTheDocument();
  });

  it("shows the condensed value stack instead of the old sale eyebrow", () => {
    render(<PricingPreview />);

    expect(screen.queryByText("Opening launch sale")).not.toBeInTheDocument();
    expect(screen.getByText("The Story Behind Your Coordinates")).toBeInTheDocument();
  });

  it("shows the founding-price line while founding pricing is active", () => {
    render(<PricingPreview />);

    expect(
      screen.getByText(
        "Founding prices hold until October 1, 2026, then they become our standard rates.",
      ),
    ).toBeInTheDocument();
  });

  it("hides the founding-price line once the deadline has passed", () => {
    vi.setSystemTime(new Date("2027-01-01T00:00:00Z"));
    render(<PricingPreview />);

    expect(screen.queryByText(/Founding prices hold until/)).not.toBeInTheDocument();
  });
});
