import { describe, expect, it } from "vitest";
import { DIGITAL_PRICE_CENTS } from "@heartbound/shared";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { formatUsd } from "@/lib/commerce/price";
import { copy } from "@/components/landing/copy";
import {
  COMPETITORS,
  COMPARE_SLUGS,
  competitorBySlug,
  getCompetitor,
} from "./competitors";
import { HEARTBOUND_FACTS } from "./heartboundFacts";
import type { DeepDiveId } from "./types";

const REQUIRED_DEEPDIVE: DeepDiveId[] = [
  "concept",
  "quality",
  "styles",
  "pricing",
  "shipping",
  "ease",
];
const ADVANTAGES = new Set(["heartbound", "competitor", "even"]);

describe("competitors data", () => {
  it("has the five expected competitors", () => {
    expect(COMPETITORS).toHaveLength(5);
    expect([...new Set(COMPETITORS.map((c) => c.key))]).toHaveLength(5);
    expect([...new Set(COMPETITORS.map((c) => c.slug))]).toHaveLength(5);
  });

  it("derives COMPARE_SLUGS and the lookup map from COMPETITORS", () => {
    expect(COMPARE_SLUGS).toEqual(COMPETITORS.map((c) => c.slug));
    expect(competitorBySlug.size).toBe(COMPETITORS.length);
  });

  it("resolves known slugs and rejects unknown ones", () => {
    expect(getCompetitor("heartbound-maps-vs-mapiful")?.name).toBe("Mapiful");
    expect(getCompetitor("heartbound-maps-vs-craft-and-oak")?.name).toBe("Craft & Oak");
    expect(getCompetitor("does-not-exist")).toBeUndefined();
  });

  describe.each(COMPETITORS.map((c) => [c.name, c] as const))(
    "%s",
    (_name, c) => {
      it("uses a keyword-rich slug derived from its key", () => {
        expect(c.slug).toBe(`heartbound-maps-vs-${c.key}`);
        expect(c.slug).toMatch(/^heartbound-maps-vs-[a-z0-9-]+$/);
      });

      it("has a sourced, dated homepage", () => {
        expect(c.homepage).toMatch(/^https:\/\//);
        expect(Number.isNaN(Date.parse(c.lastReviewed))).toBe(false);
      });

      it("has all the required, non-empty content", () => {
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.oneLiner.length).toBeGreaterThan(0);
        expect(c.hero.h1).toContain(`Heartbound Maps vs ${c.name}`);
        expect(c.hero.subhead.length).toBeGreaterThan(0);
        expect(c.tldr.length).toBeGreaterThanOrEqual(3);
        expect(c.atAGlance.length).toBeGreaterThanOrEqual(4);
        expect(c.whoFits.heartbound.length).toBeGreaterThan(0);
        expect(c.whoFits.competitor.length).toBeGreaterThan(0);
        expect(c.verdict.length).toBeGreaterThan(0);
        expect(c.faq.length).toBeGreaterThanOrEqual(4);
      });

      it("covers every deep-dive section exactly once", () => {
        const ids = c.deepDive.map((d) => d.id);
        expect(ids).toHaveLength(REQUIRED_DEEPDIVE.length);
        expect(new Set(ids)).toEqual(new Set(REQUIRED_DEEPDIVE));
        for (const section of c.deepDive) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.body.length).toBeGreaterThan(0);
          expect(section.body.every((p) => p.length > 0)).toBe(true);
        }
      });

      it("has well-formed comparison rows", () => {
        for (const row of c.atAGlance) {
          expect(row.attribute.length).toBeGreaterThan(0);
          expect(row.heartbound.length).toBeGreaterThan(0);
          expect(row.competitor.length).toBeGreaterThan(0);
          if (row.advantage) expect(ADVANTAGES.has(row.advantage)).toBe(true);
        }
        // Every page should surface at least one genuine Heartbound Maps advantage.
        expect(c.atAGlance.some((r) => r.advantage === "heartbound")).toBe(true);
      });

      it("keeps SEO metadata within SERP limits", () => {
        expect(c.meta.title.length).toBeGreaterThan(0);
        expect(c.meta.title.length).toBeLessThanOrEqual(60);
        expect(c.meta.description.length).toBeGreaterThan(0);
        expect(c.meta.description.length).toBeLessThanOrEqual(160);
      });
    },
  );

  it("never claims the placeholder '40+ countries' (ships US-only)", () => {
    const blob = JSON.stringify(COMPETITORS).toLowerCase();
    expect(blob).not.toContain("40+ countries");
  });
});

describe("Heartbound Maps facts stay in sync with the commerce catalogue", () => {
  it("formats each offered print's price from the canonical source", () => {
    expect(HEARTBOUND_FACTS.prints).toHaveLength(OFFERED_PRODUCTS.length);
    HEARTBOUND_FACTS.prints.forEach((p, i) => {
      expect(p.price).toBe(formatUsd(OFFERED_PRODUCTS[i].priceCents));
      expect(p.framedPrice).toBe(
        formatUsd(
          OFFERED_PRODUCTS[i].priceCents + OFFERED_PRODUCTS[i].frameUpchargeCents,
        ),
      );
    });
  });

  it("tracks the digital price and the headline range", () => {
    expect(HEARTBOUND_FACTS.digitalPrice).toBe(formatUsd(DIGITAL_PRICE_CENTS));
    expect(HEARTBOUND_FACTS.priceRange).toContain(
      formatUsd(OFFERED_PRODUCTS[0].priceCents),
    );
    expect(HEARTBOUND_FACTS.priceRange).toContain(
      formatUsd(OFFERED_PRODUCTS[OFFERED_PRODUCTS.length - 1].priceCents),
    );
  });

  it("tracks the frame upcharge range across all offered sizes", () => {
    const upcharges = OFFERED_PRODUCTS.map((p) => p.frameUpchargeCents);
    expect(HEARTBOUND_FACTS.frameUpchargeRange).toBe(
      `${formatUsd(Math.min(...upcharges))} to ${formatUsd(Math.max(...upcharges))}`,
    );
  });
});

describe("competitors never hardcode the frame upcharge", () => {
  it("replaces every stale '$50 to $100' literal with the tracked range", () => {
    const blob = JSON.stringify(COMPETITORS);
    expect(blob).not.toContain("$50 to $100");
    // The range must actually appear somewhere — otherwise this would pass
    // vacuously if every mention were silently deleted instead of replaced.
    expect(blob).toContain(HEARTBOUND_FACTS.frameUpchargeRange);
  });
});

describe("footer Compare column", () => {
  const compareCol = copy.footer.columns.find((col) => col.title === "Compare");

  it("exists and links to the hub", () => {
    expect(compareCol).toBeDefined();
    expect(compareCol?.links.some((l) => l.href === "/compare")).toBe(true);
  });

  it("links to every comparison page and no stale ones", () => {
    const vsLinks =
      compareCol?.links.filter((l) => l.href.startsWith("/compare/")) ?? [];
    expect(vsLinks).toHaveLength(COMPARE_SLUGS.length);
    for (const slug of COMPARE_SLUGS) {
      expect(vsLinks.some((l) => l.href === `/compare/${slug}`)).toBe(true);
    }
  });
});
