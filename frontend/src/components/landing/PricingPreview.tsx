import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { TextLink } from "@/components/ui/TextLink";
import { copy } from "./copy";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { formatUsd } from "@/lib/commerce/price";

/** Whole-dollar display for the calm ladder ("$91", not "$91.00"). */
const usd = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);

/**
 * Calm pricing teaser: price stated beside the size like a fact of the object
 * (King & McGaw register), no badges, no discount chrome. The full ladder
 * (framed, digital, anchors) lives on /pricing.
 */
export function PricingPreview() {
  const { pricingPreview } = copy;
  return (
    <Section>
      <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="flex flex-col items-start gap-4">
          <SectionLabel>{pricingPreview.eyebrow}</SectionLabel>
          <h2 className="max-w-[20ch] font-display text-heading font-normal text-ink">
            {pricingPreview.headline}
          </h2>
          <p className="max-w-[48ch] text-copy text-body">
            {pricingPreview.body}
          </p>
          <TextLink href={pricingPreview.link.href}>
            {pricingPreview.link.label} &rarr;
          </TextLink>
        </div>

        <ul className="flex flex-col self-center border-t border-hairline">
          {OFFERED_PRODUCTS.map((p) => (
            <li
              key={p.id}
              className="flex items-baseline justify-between gap-6 border-b border-hairline py-5"
            >
              <span className="flex items-baseline gap-3">
                <span className="font-display text-[24px] text-ink">{p.label}</span>
                {p.popular && <SectionLabel tone="accent">Popular</SectionLabel>}
              </span>
              <span className="text-[16px] tabular-nums text-body-strong">
                {usd(p.priceCents)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
