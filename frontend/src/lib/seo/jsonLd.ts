// Structured-data (JSON-LD) builders for the comparison pages. Pure functions that
// return plain schema.org objects; the <JsonLd> component serializes them into a
// <script type="application/ld+json"> tag. v1 emits BreadcrumbList + FAQPage.

import type { FaqItem } from "@/components/landing/copy";
import type { Competitor } from "@/lib/compare/types";
import { absoluteUrl } from "./site";

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
