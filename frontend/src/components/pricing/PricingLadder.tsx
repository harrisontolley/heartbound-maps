import Link from "next/link";
import { SectionLabel } from "@/components/landing/SectionLabel";
import { copy } from "@/components/landing/copy";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";
import { DIGITAL_PRICE_CENTS } from "@/lib/commerce/pricing";
import { formatUsd } from "@/lib/commerce/price";

/** Quiet policy facts under the ladder. The last one links to /guarantee so
 * the named policy is one click away from the buy decision. */
const POLICY_FACTS: readonly { label: string; href?: string }[] = [
  { label: "Free US shipping on every order" },
  { label: "Made to order, checked by hand" },
  { label: copy.guarantee.name, href: "/guarantee" },
];

/**
 * The full price ladder, presented the fine-art way: price stated beside the
 * material spec as a fact of the object. No anchors or discount badges: this
 * has never sold for more, so there's nothing honest to cross out (see
 * ValueStack, rendered alongside this on /pricing, for what the price bundles
 * and the one real dollar anchor it carries).
 */

/** Whole-dollar display ("$90", not "$90.00"); falls back for odd cents. */
const usd = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);

export function PricingLadder() {
  return (
    <div className="flex flex-col gap-14">
      {/* Prints */}
      <section aria-labelledby="prints-heading">
        <div className="flex items-baseline justify-between gap-4 border-b border-hairline-strong pb-3">
          <h2
            id="prints-heading"
            className="font-display text-[24px] font-normal text-ink"
          >
            Prints
          </h2>
          <SectionLabel className="hidden sm:block">
            Hahnemühle German Etching · 310gsm · giclée
          </SectionLabel>
        </div>

        <ul className="flex flex-col">
          {OFFERED_PRODUCTS.map((p) => {
            const framed = p.priceCents + p.frameUpchargeCents;
            return (
              <li
                key={p.id}
                className="grid gap-x-6 gap-y-2 border-b border-hairline py-6 sm:grid-cols-[1.2fr_1fr_1fr]"
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[28px] leading-none text-ink">
                    {p.tierName ? `${p.tierName} · ${p.label}` : p.label}
                  </span>
                  {p.popular && (
                    <SectionLabel
                      tone="accent"
                      className="flex items-center gap-1.5"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                      Popular
                    </SectionLabel>
                  )}
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[18px] font-medium tabular-nums text-ink">
                    {usd(p.priceCents)}
                  </span>
                  <span className="text-[14px] text-muted">print</span>
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[18px] font-medium tabular-nums text-ink">
                    {usd(framed)}
                  </span>
                  <span className="text-[14px] text-muted">framed in oak</span>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 max-w-[68ch] text-[14px] leading-[1.55] text-muted">
          Framed prints are made on smooth 300gsm cotton rag, which sits cleanly
          behind glass, in a solid natural oak frame that arrives wired and ready
          to hang.
        </p>
      </section>

      {/* Digital */}
      <section aria-labelledby="digital-heading">
        <div className="border-b border-hairline-strong pb-3">
          <h2
            id="digital-heading"
            className="font-display text-[24px] font-normal text-ink"
          >
            Digital download
          </h2>
        </div>
        <div className="grid gap-x-6 gap-y-2 border-b border-hairline py-6 sm:grid-cols-[1.2fr_2fr]">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[18px] font-medium tabular-nums text-ink">
              {usd(DIGITAL_PRICE_CENTS)}
            </span>
          </div>
          <p className="max-w-[58ch] text-[15px] leading-[1.55] text-body">
            A print-ready PNG plus a scalable SVG you can print yourself, at any
            size. Included free with every printed order.
          </p>
        </div>
      </section>

      {/* Policies, as quiet facts */}
      <ul className="flex flex-wrap items-center gap-x-8 gap-y-2">
        {POLICY_FACTS.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
            {item.href ? (
              <Link href={item.href} className="underline-offset-2 hover:underline">
                <SectionLabel>{item.label}</SectionLabel>
              </Link>
            ) : (
              <SectionLabel>{item.label}</SectionLabel>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
