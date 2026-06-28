import type { Metadata } from "next";
import { SiteHeader } from "@/components/landing/SiteHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Section } from "@/components/landing/Section";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { FaqAccordion } from "@/components/landing/FaqAccordion";
import { copy, type FaqGroup } from "@/components/landing/copy";

const { page } = copy.faq;
const groups: readonly FaqGroup[] = copy.faq.groups;

export const metadata: Metadata = {
  title: page.metaTitle,
  description: page.metaDescription,
};

/**
 * Dedicated FAQ page — the full question list, grouped by category. The landing
 * page (FAQ.tsx) only teases the `featured` questions and links here. Server
 * component; reuses the shared marketing header/footer and closing CTA.
 */
export default function FaqPage() {
  return (
    <main className="bg-canvas text-body">
      <SiteHeader />

      <Section>
        <div className="flex flex-col gap-12 md:gap-16">
          <header className="flex max-w-[640px] flex-col gap-4">
            <SectionLabel>{page.eyebrow}</SectionLabel>
            <h1 className="font-display text-[clamp(2rem,5vw,44px)] font-normal leading-[1.13] tracking-[-0.44px] text-ink">
              {page.headline}
            </h1>
            <p className="text-[17px] leading-[1.5] tracking-[0.16px] text-body">
              {page.intro}
            </p>
          </header>

          <div className="flex flex-col gap-12 md:gap-16">
            {groups.map((group) => (
              <div
                key={group.title}
                className="grid gap-6 md:grid-cols-[0.8fr_1.2fr] md:gap-16"
              >
                <h2 className="font-display text-[22px] font-normal leading-[1.2] tracking-[-0.22px] text-ink">
                  {group.title}
                </h2>
                <FaqAccordion items={group.items} />
              </div>
            ))}
          </div>
        </div>
      </Section>

      <FinalCTA />
      <SiteFooter />
    </main>
  );
}
