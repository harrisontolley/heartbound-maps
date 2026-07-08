import Link from "next/link";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { LinkButton } from "@/components/landing/LinkButton";
import { TextLink } from "@/components/ui/TextLink";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { STUDIO_HREF, PRIMARY_CTA } from "@/components/landing/copy";
import { COMPETITORS } from "@/lib/compare/competitors";
import type { Competitor } from "@/lib/compare/types";
import { buildBreadcrumbJsonLd, buildFaqJsonLd } from "@/lib/seo/jsonLd";
import { ComparisonTable } from "./ComparisonTable";
import { JsonLd } from "@/components/seo/JsonLd";

const CARD =
  "flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-6";

const H2 = "font-display text-heading-sm font-normal text-ink";

/** Format an ISO date (YYYY-MM-DD) as "June 30, 2026", deterministically (UTC). */
function formatReviewed(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Renders one full "Heartbound Maps vs {competitor}" comparison page from its data:
 * hero → TL;DR → at-a-glance table → in-depth sections → who-it's-for → verdict →
 * FAQ → sibling links, wrapped in the shared marketing chrome and BreadcrumbList +
 * FAQPage JSON-LD. Server component.
 */
export function ComparePageLayout({ competitor: c }: { competitor: Competitor }) {
  const siblings = COMPETITORS.filter((other) => other.slug !== c.slug);

  return (
    <main className="bg-canvas text-body">
      <JsonLd data={[buildBreadcrumbJsonLd(c), buildFaqJsonLd(c.faq)]} />
      <SiteHeader />

      {/* Hero */}
      <Section>
        <div className="flex flex-col gap-6">
          <nav
            aria-label="Breadcrumb"
            className="text-[13px] tracking-[0.04px] text-muted"
          >
            <Link
              href="/compare"
              className="transition-colors hover:text-ink pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
            >
              Compare
            </Link>
            <span aria-hidden className="px-2">
              /
            </span>
            <span className="text-body">Heartbound Maps vs {c.name}</span>
          </nav>

          <div className="flex max-w-[760px] flex-col gap-5">
            <SectionLabel>Comparison</SectionLabel>
            <h1 className="font-display text-title font-normal text-ink">
              {c.hero.h1}
            </h1>
            <p className="text-copy text-body">{c.hero.subhead}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <LinkButton href={STUDIO_HREF} variant="primary" size="md">
              {PRIMARY_CTA}
            </LinkButton>
            <LinkButton href="#verdict" variant="outline" size="md">
              Jump to the verdict
            </LinkButton>
          </div>
        </div>
      </Section>

      {/* TL;DR */}
      <Section tone="soft">
        <div className="flex max-w-[760px] flex-col gap-6">
          <SectionLabel>The short version</SectionLabel>
          <h2 className={H2}>Heartbound Maps vs {c.name}, in brief</h2>
          <ul className="flex flex-col gap-3">
            {c.tldr.map((point) => (
              <li key={point} className="flex gap-3 text-copy text-body">
                <span aria-hidden className="mt-[2px] text-ink">
                  —
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      {/* At a glance */}
      <Section>
        <div className="flex flex-col gap-8">
          <div className="flex max-w-[640px] flex-col gap-4">
            <SectionLabel>At a glance</SectionLabel>
            <h2 className={H2}>How they compare, side by side</h2>
          </div>
          <ComparisonTable rows={c.atAGlance} competitorName={c.name} />
          <p className="max-w-[760px] text-[13px] leading-[1.5] text-muted">
            {c.name} details checked on {formatReviewed(c.lastReviewed)} from{" "}
            <a
              href={c.homepage}
              target="_blank"
              rel="nofollow noopener noreferrer"
              className="underline transition-colors hover:text-ink pointer-coarse:-my-2.5 pointer-coarse:py-2.5"
            >
              their website
            </a>
            ; pricing and specs can change, so check there for the latest before you
            buy.
          </p>
        </div>
      </Section>

      {/* In depth */}
      <Section>
        <div className="flex flex-col gap-12 md:gap-16">
          <SectionLabel>In depth</SectionLabel>
          {c.deepDive.map((section) => (
            <div
              key={section.id}
              className="grid gap-4 md:grid-cols-[0.85fr_1.15fr] md:gap-12"
            >
              <h2 className={H2}>{section.heading}</h2>
              <div className="flex flex-col gap-4">
                {section.body.map((para) => (
                  <p key={para} className="max-w-[60ch] text-copy text-body">
                    {para}
                  </p>
                ))}
                {section.takeaway && (
                  <p className="max-w-[60ch] border-l-2 border-ink pl-4 text-[15px] leading-[1.5] text-body-strong">
                    {section.takeaway}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Who it's for */}
      <Section tone="soft">
        <div className="flex flex-col gap-8">
          <div className="flex max-w-[640px] flex-col gap-4">
            <SectionLabel>Which is right for you</SectionLabel>
            <h2 className={H2}>An honest read on the fit</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className={CARD}>
              <h3 className="text-[18px] font-medium text-ink">
                Choose Heartbound Maps if…
              </h3>
              <ul className="flex flex-col gap-2.5">
                {c.whoFits.heartbound.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[16px] leading-[1.5] text-body"
                  >
                    <span aria-hidden className="mt-[1px] font-semibold text-success">
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={CARD}>
              <h3 className="text-[18px] font-medium text-ink">
                Choose {c.name} if…
              </h3>
              <ul className="flex flex-col gap-2.5">
                {c.whoFits.competitor.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2.5 text-[16px] leading-[1.5] text-body"
                  >
                    <span aria-hidden className="mt-[1px] text-muted">
                      ·
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Verdict */}
      <Section id="verdict">
        <div className="flex max-w-[760px] flex-col gap-6">
          <SectionLabel>The verdict</SectionLabel>
          <h2 className={H2}>Our recommendation</h2>
          <p className="text-copy text-body">{c.verdict}</p>
          <div>
            <LinkButton href={STUDIO_HREF} variant="primary" size="md">
              {PRIMARY_CTA}
            </LinkButton>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section tone="soft">
        <div className="grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
          <div className="flex flex-col gap-4">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className={H2}>Common questions</h2>
          </div>
          <FaqAccordion items={c.faq} />
        </div>
      </Section>

      {/* Sibling comparisons */}
      <Section>
        <div className="flex flex-col gap-8">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-[22px] font-normal tracking-[-0.22px] text-ink">
              More comparisons
            </h2>
            <TextLink href="/compare" tone="body" className="underline">
              See all
            </TextLink>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {siblings.map((other) => (
              <Link
                key={other.slug}
                href={`/compare/${other.slug}`}
                className="rounded-xl border border-hairline bg-surface-card p-5 transition-shadow hover:shadow-card"
              >
                <span className="text-[16px] font-medium text-ink">
                  Heartbound Maps vs {other.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </Section>

      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
