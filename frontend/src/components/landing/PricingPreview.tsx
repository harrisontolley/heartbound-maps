import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { TextLink } from "@/components/ui/TextLink";
import { copy } from "./copy";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { discountPercent, FREE_SHIPPING } from "@/lib/commerce/pricing";
import { formatUsd } from "@/lib/commerce/price";

/** Whole-dollar display for the calm ladder ("$90", not "$90.00"). */
const usd = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);

const PRICE_GRID_CLASS =
  "grid grid-cols-[minmax(80px,1fr)_76px_76px] gap-x-2 sm:grid-cols-[minmax(96px,1fr)_92px_92px] sm:gap-x-6";

function PriceCell({ listCents, priceCents }: { listCents: number; priceCents: number }) {
  const pct = discountPercent(listCents, priceCents);
  return (
    <span className="flex flex-col items-end gap-0.5 tabular-nums">
      <s className="text-[12px] text-muted-soft">{usd(listCents)}</s>
      <span className="text-[16px] font-medium text-body-strong">
        {usd(priceCents)}
      </span>
      {pct > 0 && (
        <span className="text-[11px] font-semibold text-accent-deep">
          Save {pct}%
        </span>
      )}
    </span>
  );
}

/**
 * Landing-page pricing teaser. It mirrors the authoritative catalogue and makes
 * the temporary opening-launch pricing explicit before a buyer enters the studio.
 * Header labels are block+text-right so they sit exactly over the right-aligned
 * price columns (an inline span ignores text-right, which skewed the header).
 */
export function PricingPreview() {
  const { pricingPreview } = copy;
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
          <TextLink href={pricingPreview.link.href}>
            {pricingPreview.link.label} &rarr;
          </TextLink>
        </div>

        <div className="self-center">
          <div className="border-t border-hairline">
            <div className={`${PRICE_GRID_CLASS} items-center border-b border-hairline py-3`}>
              <span className="sr-only">Size</span>
              <SectionLabel className="block text-right">Unframed</SectionLabel>
              <SectionLabel className="block text-right">Framed</SectionLabel>
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
          <p className="mt-3 text-[13px] leading-[1.5] text-muted">
            {FREE_SHIPPING && "Free US shipping on every order. "}
            The digital files are included with every print.
          </p>
        </div>
      </div>
    </Section>
  );
}
