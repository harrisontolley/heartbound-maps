// Types for the "Heartbound Maps vs [Competitor]" comparison pages. The data that fills
// these shapes lives in competitors.ts; the route, table, and page layout render
// from them. Reuses the landing FaqItem so comparison FAQs feed FaqAccordion and
// the FAQPage JSON-LD unchanged.

import type { FaqItem } from "@/components/landing/copy";

/** Which side a comparison row favours. Drives the subtle table highlight. */
export type Advantage = "heartbound" | "competitor" | "even";

/** One row of the at-a-glance comparison table. */
export type ComparisonRow = {
  /** Row label, e.g. "What it puts on the wall". */
  attribute: string;
  /** Heartbound Maps's cell. */
  heartbound: string;
  /** The competitor's cell. */
  competitor: string;
  /** Optional: who this row favours (only "heartbound" is visually flagged). */
  advantage?: Advantage;
};

/** The fixed set of deep-dive sections every comparison covers, in render order. */
export type DeepDiveId =
  | "concept"
  | "quality"
  | "styles"
  | "pricing"
  | "shipping"
  | "ease";

/** One deep-dive section: an H2 heading, prose, and an optional one-line takeaway. */
export type DeepDiveSection = {
  id: DeepDiveId;
  heading: string;
  /** One to three short paragraphs. */
  body: readonly string[];
  /** Optional closing line, e.g. "Heartbound Maps's edge: …". */
  takeaway?: string;
};

/** Everything needed to render one comparison page, authored per competitor. */
export type Competitor = {
  /** URL slug + canonical, e.g. "heartbound-maps-vs-mapiful" → /compare/heartbound-maps-vs-mapiful. */
  slug: string;
  /** Stable short id used for lookups/tests, e.g. "mapiful". */
  key: string;
  /** Display name, e.g. "Mapiful". */
  name: string;
  /** Neutral one-sentence description of what the competitor sells (hub + intro). */
  oneLiner: string;
  /** The competitor's homepage — the source of the claims (rendered rel="nofollow"). */
  homepage: string;
  /** ISO date the competitor's facts were verified against their live site. */
  lastReviewed: string;
  hero: { h1: string; subhead: string };
  /** TL;DR / bottom-line-up-front bullets (3–4). */
  tldr: readonly string[];
  atAGlance: readonly ComparisonRow[];
  /** Deep-dive sections covering concept, quality, styles, pricing, shipping, ease. */
  deepDive: readonly DeepDiveSection[];
  /** Honest "which is right for you" — genuine fit on both sides. */
  whoFits: { heartbound: readonly string[]; competitor: readonly string[] };
  /** Closing paragraph that recommends Heartbound Maps. */
  verdict: string;
  /** 4–6 long-tail FAQ entries → FaqAccordion + FAQPage schema. */
  faq: readonly FaqItem[];
  /** SEO title + meta description for this page. */
  meta: { title: string; description: string };
};
