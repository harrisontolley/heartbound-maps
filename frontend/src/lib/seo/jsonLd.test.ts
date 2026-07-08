import { describe, expect, it } from "vitest";
import {
  FRAME_UPCHARGE_CENTS,
  PRINT_PRICE_CENTS,
} from "@pinprint/shared";
import {
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildProductJsonLd,
  buildWebSiteJsonLd,
} from "./jsonLd";
import { SITE_URL, absoluteUrl, OG_IMAGE } from "./site";

describe("buildOrganizationJsonLd", () => {
  const org = buildOrganizationJsonLd();

  it("identifies Pinprint at the site origin with an absolute logo", () => {
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("Pinprint");
    expect(org.url).toBe(SITE_URL);
    expect(org.logo).toBe(absoluteUrl(OG_IMAGE));
  });
});

describe("buildWebSiteJsonLd", () => {
  it("names the site at the site origin", () => {
    const site = buildWebSiteJsonLd();
    expect(site["@type"]).toBe("WebSite");
    expect(site.name).toBe("Pinprint");
    expect(site.url).toBe(SITE_URL);
  });
});

describe("buildProductJsonLd", () => {
  const product = buildProductJsonLd();
  const offers = product.offers as Record<string, unknown>;

  it("is a Product with a Pinprint brand and absolute image", () => {
    expect(product["@type"]).toBe("Product");
    expect(product.brand).toEqual({ "@type": "Brand", name: "Pinprint" });
    expect(product.image).toBe(absoluteUrl(OG_IMAGE));
  });

  it("spans the cheapest loose print to the priciest framed print in USD", () => {
    const prints = Object.values(PRINT_PRICE_CENTS);
    const framed = Object.entries(PRINT_PRICE_CENTS).map(
      ([id, cents]) => cents + (FRAME_UPCHARGE_CENTS[id] ?? 0),
    );
    expect(offers["@type"]).toBe("AggregateOffer");
    expect(offers.priceCurrency).toBe("USD");
    expect(offers.lowPrice).toBe((Math.min(...prints) / 100).toFixed(2));
    expect(offers.highPrice).toBe((Math.max(...framed) / 100).toFixed(2));
    expect(offers.offerCount).toBe(prints.length + framed.length);
  });

  it("never fabricates ratings or reviews", () => {
    expect(product.aggregateRating).toBeUndefined();
    expect(product.review).toBeUndefined();
  });
});

describe("buildFaqJsonLd", () => {
  it("maps q/a items to FAQPage Question/Answer entities", () => {
    const faq = buildFaqJsonLd([
      { q: "How big is it?", a: "Three sizes." },
      { q: "Is shipping free?", a: "Yes, in the US." },
    ]);
    expect(faq["@type"]).toBe("FAQPage");
    const entities = faq.mainEntity as Array<Record<string, unknown>>;
    expect(entities).toHaveLength(2);
    expect(entities[0]).toEqual({
      "@type": "Question",
      name: "How big is it?",
      acceptedAnswer: { "@type": "Answer", text: "Three sizes." },
    });
  });
});
