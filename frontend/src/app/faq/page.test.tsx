import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { copy } from "@/components/landing/copy";

// Mock the shared chrome (header/footer/CTA pull in auth + store) so this suite
// can render just the page content in jsdom.
vi.mock("@/components/landing/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/landing/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/landing/FinalCTA", () => ({ FinalCTA: () => null }));

import FaqPage, { metadata } from "./page";

describe("faq page metadata", () => {
  it("sets a canonical and share tags", () => {
    expect(metadata.alternates?.canonical).toBe("/faq");
    expect(metadata.title).toBe(copy.faq.page.metaTitle);
    expect(metadata.openGraph?.title).toBe(copy.faq.page.metaTitle);
    expect(metadata.twitter?.title).toBe(copy.faq.page.metaTitle);
  });
});

describe("faq page structured data", () => {
  it("emits FAQPage JSON-LD covering every question", () => {
    const { container } = render(<FaqPage />);
    const script = container.querySelector(
      'script[type="application/ld+json"]',
    );
    expect(script).not.toBeNull();
    const data = JSON.parse(script!.textContent ?? "{}");
    expect(data["@type"]).toBe("FAQPage");
    const total = copy.faq.groups.reduce(
      (n, group) => n + group.items.length,
      0,
    );
    expect(data.mainEntity).toHaveLength(total);
  });
});
