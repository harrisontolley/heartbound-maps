import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { copy } from "@/components/landing/copy";

// Mock the shared chrome (header/footer/CTA pull in auth + store) so this suite
// can render just the page content in jsdom.
vi.mock("@/components/landing/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/landing/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/landing/FinalCTA", () => ({ FinalCTA: () => null }));

import HangingGuidePage, { metadata } from "./page";

describe("hanging guide page metadata", () => {
  it("sets a canonical and share tags", () => {
    expect(metadata.alternates?.canonical).toBe("/hanging-guide");
    expect(metadata.title).toBe(copy.hangingGuide.page.metaTitle);
    expect(metadata.openGraph?.title).toBe(copy.hangingGuide.page.metaTitle);
    expect(metadata.twitter?.title).toBe(copy.hangingGuide.page.metaTitle);
  });
});

describe("hanging guide page content", () => {
  it("renders every section's title and body, sourced from copy.ts", () => {
    const { container } = render(<HangingGuidePage />);
    const text = container.textContent ?? "";
    expect(text).toContain(copy.hangingGuide.headline);
    for (const section of copy.hangingGuide.sections) {
      expect(text).toContain(section.title);
      expect(text).toContain(section.body);
    }
  });

  it("covers hanging height, wall placement, frame styling, and paper care", () => {
    const { container } = render(<HangingGuidePage />);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).toMatch(/57 inches/);
    expect(text).toMatch(/wall/);
    expect(text).toMatch(/oak/);
    expect(text).toMatch(/metal/);
    expect(text).toMatch(/paper/);
  });

  it("never mentions the word poster", () => {
    const { container } = render(<HangingGuidePage />);
    const text = (container.textContent ?? "").toLowerCase();
    expect(text).not.toContain("poster");
  });
});
