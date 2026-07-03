import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { FaqAccordion } from "./FaqAccordion";
import { TextLink } from "@/components/ui/TextLink";
import { copy, type FaqGroup } from "./copy";

/**
 * Landing-page FAQ teaser. Shows only the `featured` questions (the biggest
 * pre-purchase objections) and links to the full /faq page for everything else.
 */
export function FAQ() {
  const { faq } = copy;
  const groups: readonly FaqGroup[] = faq.groups;
  const featured = groups.flatMap((group) =>
    group.items
      .filter((item) => item.featured)
      .map((item) => ({ ...item, group: group.title })),
  );

  return (
    <Section id="faq">
      <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <SectionLabel>{faq.eyebrow}</SectionLabel>
          <h2 className="font-display text-heading font-normal text-ink">
            {faq.headline}
          </h2>
        </div>

        <div className="flex flex-col gap-6">
          <FaqAccordion items={featured} />
          <TextLink href={faq.seeAll.href}>{faq.seeAll.label} &rarr;</TextLink>
        </div>
      </div>
    </Section>
  );
}
