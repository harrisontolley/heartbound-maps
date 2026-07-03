import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { TextLink } from "@/components/ui/TextLink";
import { copy } from "./copy";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { formatUsd } from "@/lib/commerce/price";

/** Whole-dollar display for the calm ladder ("$90", not "$90.00"). */
const usd = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);

const PRICE_GRID_CLASS =
  "grid grid-cols-[minmax(80px,1fr)_72px_72px] gap-x-2 sm:grid-cols-[minmax(96px,1fr)_84px_84px] sm:gap-x-6";

function PriceCell({ listCents, priceCents }: { listCents: number; priceCents: number }) {
  return (
    <span className="flex flex-col items-end gap-0.5 tabular-nums">
      <s className="text-[12px] text-muted-soft">{usd(listCents)}</s>
      <span className="text-[16px] font-medium text-body-strong">
        {usd(priceCents)}
      </span>
    </span>
  );
}

/**
 * Landing-page pricing teaser. It mirrors the authoritative catalogue and makes
 * the temporary opening-launch pricing explicit before a buyer enters the studio.
 */
export function PricingPreview() {
  const { pricingPreview } = copy;
  return (
    <Section>
      <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="flex flex-col items-start gap-4">
          <SectionLabel tone="accent">{pricingPreview.eyebrow}</SectionLabel>
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

        <div className="self-center border-t border-hairline">
          <div className={`${PRICE_GRID_CLASS} border-b border-hairline py-3`}>
            <span className="sr-only">Size</span>
            <SectionLabel className="text-right">Unframed</SectionLabel>
            <SectionLabel className="text-right">Framed</SectionLabel>
          </div>
          <ul className="flex flex-col">
            {OFFERED_PRODUCTS.map((p) => {
              const framedPrice = p.priceCents + p.frameUpchargeCents;
              const framedListPrice = p.listPriceCents + p.frameUpchargeCents;
              return (
                <li
                  key={p.id}
                  className={`${PRICE_GRID_CLASS} items-center border-b border-hairline py-5`}
                >
                  <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                    <span className="font-display text-[20px] text-ink sm:text-[24px]">
                      {p.label}
                    </span>
                    {p.popular && <SectionLabel tone="accent">Popular</SectionLabel>}
                  </span>
                  <PriceCell listCents={p.listPriceCents} priceCents={p.priceCents} />
                  <PriceCell listCents={framedListPrice} priceCents={framedPrice} />
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
