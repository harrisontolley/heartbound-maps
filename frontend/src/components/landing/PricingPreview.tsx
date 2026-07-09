import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { TextLink } from "@/components/ui/TextLink";
import { ValueStack } from "@/components/pricing/ValueStack";
import { copy } from "./copy";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { FREE_SHIPPING, foundingPriceLine } from "@/lib/commerce/pricing";
import { formatUsd } from "@/lib/commerce/price";

/** Whole-dollar display for the calm ladder ("$90", not "$90.00"). */
const usd = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);

const PRICE_GRID_CLASS =
  "grid grid-cols-[minmax(80px,1fr)_76px_76px] gap-x-2 sm:grid-cols-[minmax(96px,1fr)_92px_92px] sm:gap-x-6";

/**
 * Landing-page pricing teaser. It mirrors the authoritative catalogue: real
 * charged prices, no anchors, plus the condensed value stack and the honest
 * founding-price deadline (server-rendered here, so /'s `revalidate = 3600`
 * keeps it from staying stale past the deadline).
 */
export function PricingPreview() {
  const { pricingPreview } = copy;
  const foundingLine = foundingPriceLine();

  return (
    <Section>
      <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="flex flex-col items-start gap-4">
          <span className="rounded-pill bg-accent-deep px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.96px] text-canvas">
            {pricingPreview.eyebrow}
          </span>
          <h2 className="max-w-[20ch] font-display text-heading font-normal text-ink">
            {pricingPreview.headline}
          </h2>
          <p className="max-w-[48ch] text-copy text-body">
            {pricingPreview.body}
          </p>
          {foundingLine && (
            <p className="max-w-[48ch] text-[13px] leading-[1.5] text-muted">
              {foundingLine}
            </p>
          )}
          <ValueStack variant="condensed" />
          <TextLink href={pricingPreview.link.href}>
            {pricingPreview.link.label} &rarr;
          </TextLink>
        </div>

        <div className="self-center">
          <div className="border-t border-hairline">
            <div className={`${PRICE_GRID_CLASS} items-center border-b border-hairline py-3`}>
              <span className="sr-only">Size</span>
              <SectionLabel className="col-start-2 block text-right">Unframed</SectionLabel>
              <SectionLabel className="col-start-3 block text-right">Framed</SectionLabel>
            </div>
            <ul className="flex flex-col">
              {OFFERED_PRODUCTS.map((p) => {
                const framedPrice = p.priceCents + p.frameUpchargeCents;
                return (
                  <li
                    key={p.id}
                    className={`${PRICE_GRID_CLASS} items-center border-b border-hairline py-5`}
                  >
                    <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:gap-3">
                      <span className="font-display text-[20px] text-ink sm:text-[24px]">
                        {p.tierName ? `${p.tierName} · ${p.label}` : p.label}
                      </span>
                      {p.popular && <SectionLabel tone="accent">Popular</SectionLabel>}
                    </span>
                    <span className="text-right text-[16px] font-medium tabular-nums text-body-strong">
                      {usd(p.priceCents)}
                    </span>
                    <span className="text-right text-[16px] font-medium tabular-nums text-body-strong">
                      {usd(framedPrice)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mt-3 text-[13px] leading-[1.5] text-muted">
            {FREE_SHIPPING && "Free US shipping on every order. "}
            The digital files are included with every print.
          </p>
        </div>
      </div>
    </Section>
  );
}
