import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { COMPETITORS } from "@/lib/compare/competitors";

// Mock the shared chrome (header/footer/CTA pull in auth + store) so this suite can
// render just the hub's content in jsdom.
vi.mock("@/components/landing/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("@/components/landing/SiteFooter", () => ({ SiteFooter: () => null }));
vi.mock("@/components/landing/FinalCTA", () => ({ FinalCTA: () => null }));

import CompareHubPage from "./page";

describe("compare hub page", () => {
  it("renders an H1 and a card linking to every comparison", () => {
    render(<CompareHubPage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();

    const hrefs = screen
      .getAllByRole("link")
      .map((l) => l.getAttribute("href"));
    for (const c of COMPETITORS) {
      expect(hrefs).toContain(`/compare/${c.slug}`);
    }
  });
});
