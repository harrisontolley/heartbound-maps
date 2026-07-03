import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PricingPreview } from "./PricingPreview";

afterEach(cleanup);

describe("PricingPreview", () => {
  it("shows unframed and framed opening-launch columns", () => {
    render(<PricingPreview />);

    expect(screen.getByText("Unframed")).toBeInTheDocument();
    expect(screen.getByText("Framed")).toBeInTheDocument();

    for (const price of ["$65", "$95", "$175", "$124", "$168", "$289"]) {
      expect(screen.getByText(price)).toBeInTheDocument();
    }
  });

  it("strikes the catalogue-derived regular totals for framed prints", () => {
    render(<PricingPreview />);

    for (const price of ["$147", "$202", "$350"]) {
      expect(screen.getByText(price).tagName).toBe("S");
    }
  });
});
