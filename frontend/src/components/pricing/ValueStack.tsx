import Link from "next/link";
import { copy } from "@/components/landing/copy";
import { formatUsd } from "@/lib/commerce/price";
import { DIGITAL_PRICE_CENTS } from "@/lib/commerce/pricing";

export type ValueStackVariant = "full" | "condensed";

/** Whole-dollar display ("$19", not "$19.00"); falls back for odd cents. */
const usd = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : formatUsd(cents);

/**
 * The itemized "everything included" stack that replaced the struck-through
 * sale price: every real, already-shipping bonus named plainly instead of a
 * fake discount (see copy.ts's `valueStack` for the source data). The digital
 * files line is the only one that carries a dollar figure, appended here from
 * DIGITAL_PRICE_CENTS rather than hardcoded in copy, because it's the only
 * bonus genuinely sold on its own — every other line states what it is, not a
 * price nobody could actually pay for it separately.
 *
 * `full` renders the whole stack with descriptions (used on /pricing);
 * `condensed` renders just the item titles as a quiet inline list (used in
 * the landing PricingPreview and near the studio's BuyBar/StepSize).
 */
export function ValueStack({ variant = "full" }: { variant?: ValueStackVariant }) {
  const { valueStack } = copy;

  if (variant === "condensed") {
    return (
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {valueStack.eyebrow}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
          {valueStack.items.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted">
        {valueStack.eyebrow}
      </p>
      <ul className="mt-4 flex flex-col gap-5">
        {valueStack.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3">
            <span
              aria-hidden
              className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
            />
            <div>
              <p className="font-medium text-ink">
                {item.href ? (
                  <Link href={item.href} className="underline-offset-2 hover:underline">
                    {item.title}
                  </Link>
                ) : (
                  item.title
                )}
              </p>
              <p className="mt-0.5 text-[14px] leading-[1.5] text-muted">
                {item.body}
                {item.id === "digital" && (
                  <> Sold on its own for {usd(DIGITAL_PRICE_CENTS)}.</>
                )}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
