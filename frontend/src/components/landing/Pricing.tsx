import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/** Three placeholder tiers; the middle one is featured with a dark inversion. */
export function Pricing() {
  const { pricing } = copy;
  return (
    <Section id="pricing" tone="soft">
      <div className="flex flex-col items-center gap-4 text-center">
        <SectionLabel>{pricing.eyebrow}</SectionLabel>
        <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
          {pricing.headline}
        </h2>
        <p className="text-[13px] text-muted-soft">{pricing.note}</p>
      </div>

      <div className="mt-12 grid items-stretch gap-6 md:grid-cols-3">
        {pricing.tiers.map((tier) => {
          const featured = tier.featured;
          return (
            <article
              key={tier.name}
              className={`flex flex-col gap-6 rounded-xl p-8 ${
                featured
                  ? "bg-ink text-on-primary"
                  : "border border-hairline bg-surface-card text-ink"
              }`}
            >
              <div className="flex flex-col gap-2">
                <h3
                  className={`text-[18px] font-medium ${
                    featured ? "text-on-primary" : "text-ink"
                  }`}
                >
                  {tier.name}
                </h3>
                <p className="flex items-baseline gap-2">
                  <span className="font-display text-[40px] font-normal leading-none tracking-[-0.96px]">
                    {tier.price}
                  </span>
                  <span
                    className={
                      featured ? "text-[14px] text-muted-soft" : "text-[14px] text-muted"
                    }
                  >
                    {tier.cadence}
                  </span>
                </p>
                <p
                  className={`text-[15px] leading-[1.5] ${
                    featured ? "text-muted-soft" : "text-body"
                  }`}
                >
                  {tier.summary}
                </p>
              </div>

              <ul className="flex flex-col gap-3">
                {tier.features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2 text-[15px] leading-[1.5] ${
                      featured ? "text-on-primary/90" : "text-body"
                    }`}
                  >
                    <span aria-hidden className="pt-[2px]">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <LinkButton
                  href={STUDIO_HREF}
                  variant={featured ? "primary" : "outline"}
                  size="md"
                  className={
                    featured
                      ? "w-full bg-on-primary text-ink hover:bg-surface-strong"
                      : "w-full"
                  }
                >
                  {tier.cta}
                </LinkButton>
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
