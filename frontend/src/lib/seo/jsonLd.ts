// Structured-data (JSON-LD) builders. Pure functions that return plain
// schema.org objects; the <JsonLd> component (components/seo/JsonLd.tsx)
// serializes them into <script type="application/ld+json"> tags. Emits
// BreadcrumbList + FAQPage (comparison pages), FAQPage (/faq), Organization +
// WebSite (root layout), and Product (/pricing).

import type { FaqItem } from "@/components/landing/copy";
import type { Competitor } from "@/lib/compare/types";
import {
  FRAME_UPCHARGE_CENTS,
  PRINT_PRICE_CENTS,
} from "@pinprint/shared";
import { OG_IMAGE, SITE_URL, absoluteUrl } from "./site";

export type JsonLdObject = Record<string, unknown>;

/** Home → Compare → "Pinprint vs {name}" breadcrumb trail with absolute URLs. */
export function buildBreadcrumbJsonLd(competitor: Competitor): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
      {
        "@type": "ListItem",
        position: 2,
        name: "Compare",
        item: absoluteUrl("/compare"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Pinprint vs ${competitor.name}`,
        item: absoluteUrl(`/compare/${competitor.slug}`),
      },
    ],
  };
}

/** Organization schema for the root layout: who publishes this site. */
export function buildOrganizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pinprint",
    url: SITE_URL,
    logo: absoluteUrl(OG_IMAGE),
  };
}

/** WebSite schema for the root layout: names the site for search engines. */
export function buildWebSiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Pinprint",
    url: SITE_URL,
  };
}

/**
 * Product schema for /pricing. One Product covering the print ladder, with an
 * AggregateOffer spanning the cheapest loose print to the largest framed print.
 * Prices derive from the shared commerce constants so schema tracks real
 * pricing. No ratings or reviews are emitted — we have none yet and schema.org
 * data must not be fabricated.
 */
export function buildProductJsonLd(): JsonLdObject {
  const printPrices = Object.values(PRINT_PRICE_CENTS);
  const framedPrices = Object.entries(PRINT_PRICE_CENTS).map(
    ([id, cents]) => cents + (FRAME_UPCHARGE_CENTS[id] ?? 0),
  );
  const toDollars = (cents: number) => (cents / 100).toFixed(2);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "Custom map fine art print",
    description:
      "A personalized fine art print of the places that matter, made to order in three sizes, loose or framed.",
    image: absoluteUrl(OG_IMAGE),
    brand: { "@type": "Brand", name: "Pinprint" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: toDollars(Math.min(...printPrices)),
      highPrice: toDollars(Math.max(...framedPrices)),
      offerCount: printPrices.length + framedPrices.length,
      availability: "https://schema.org/InStock",
      url: absoluteUrl("/pricing"),
    },
  };
}

/** FAQPage schema from the page's FAQ entries (omit when there are none). */
export function buildFaqJsonLd(faq: readonly FaqItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}
