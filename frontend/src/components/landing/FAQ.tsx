import Link from "next/link";
import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { FaqAccordion } from "./FaqAccordion";
import { copy, type FaqGroup } from "./copy";

/**
 * Landing-page FAQ teaser. Shows only the `featured` questions (the biggest
 * pre-purchase objections) and links to the full /faq page for everything else.
 */
export function FAQ() {
  const { faq } = copy;
  const groups: readonly FaqGroup[] = faq.groups;
  const featured = groups.flatMap((group) =>
    group.items.filter((item) => item.featured),
  );

  return (
    <Section id="faq">
      <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <SectionLabel>{faq.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
            {faq.headline}
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          <FaqAccordion items={featured} />
          <Link
            href={faq.seeAll.href}
            className="text-[16px] font-medium text-ink underline-offset-4 hover:underline"
          >
            {faq.seeAll.label} &rarr;
          </Link>
        </div>
      </div>
    </Section>
  );
}
