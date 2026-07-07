import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { copy } from "@/components/landing/copy";

// Mock the shared chrome (header/footer/CTA pull in auth + store) so this suite
// can render just the page content in jsdom.
vi.mock("@/components/landing/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/landing/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/landing/FinalCTA", () => ({ FinalCTA: () => null }));

import GuaranteePage, { metadata } from "./page";

describe("guarantee page metadata", () => {
  it("sets a canonical and share tags", () => {
    expect(metadata.alternates?.canonical).toBe("/guarantee");
    expect(metadata.title).toBe(copy.guarantee.page.metaTitle);
    expect(metadata.openGraph?.title).toBe(copy.guarantee.page.metaTitle);
    expect(metadata.twitter?.title).toBe(copy.guarantee.page.metaTitle);
  });
});

describe("guarantee page content", () => {
  it("names the guarantee and states the damage-only scope, sourced from copy.ts", () => {
    const { container } = render(<GuaranteePage />);
    const text = container.textContent ?? "";
    expect(text).toContain(copy.guarantee.name);
    for (const paragraph of copy.guarantee.body) {
      expect(text).toContain(paragraph);
    }
    expect(text).toContain(copy.guarantee.exclusions);
  });

  it("never expands scope beyond the existing damage/fault promise", () => {
    const { container } = render(<GuaranteePage />);
    const text = container.textContent ?? "";
    // Change-of-mind returns must still read as excluded on this page.
    expect(text).toMatch(/change.of.mind/i);
  });
});
