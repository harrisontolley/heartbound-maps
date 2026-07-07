import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ValueStack } from "./ValueStack";
import { copy } from "@/components/landing/copy";
import { DIGITAL_PRICE_CENTS } from "@/lib/commerce/pricing";

afterEach(cleanup);

describe("ValueStack", () => {
  it("full variant lists every real bonus, with no invented Reveal Card", () => {
    render(<ValueStack variant="full" />);

    for (const item of copy.valueStack.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
    expect(screen.queryByText(/reveal card/i)).not.toBeInTheDocument();
  });

  it("appends the honest digital-files anchor sourced from DIGITAL_PRICE_CENTS", () => {
    render(<ValueStack variant="full" />);

    // DIGITAL_PRICE_CENTS is a whole-dollar amount today ($19.00 → "$19");
    // this only proves the number is real, not a hardcoded guess.
    expect(DIGITAL_PRICE_CENTS % 100).toBe(0);
    expect(
      screen.getByText(`Sold on its own for $${DIGITAL_PRICE_CENTS / 100}.`, { exact: false }),
    ).toBeInTheDocument();
  });

  it("links the guarantee and hanging-guide items to their real pages", () => {
    render(<ValueStack variant="full" />);

    expect(screen.getByRole("link", { name: copy.guarantee.name })).toHaveAttribute(
      "href",
      "/guarantee",
    );
    expect(
      screen.getByRole("link", { name: "The hanging and styling guide" }),
    ).toHaveAttribute("href", "/hanging-guide");
  });

  it("condensed variant lists just the item titles", () => {
    render(<ValueStack variant="condensed" />);

    for (const item of copy.valueStack.items) {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    }
    // No description text, no dollar anchor, in the condensed strip.
    expect(screen.queryByText(/Sold on its own for/)).not.toBeInTheDocument();
  });
});
