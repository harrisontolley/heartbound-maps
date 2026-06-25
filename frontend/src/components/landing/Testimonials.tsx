import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";

/** Customer quotes to prove the product delivers. */
export function Testimonials() {
  const { testimonials } = copy;
  return (
    <Section>
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{testimonials.eyebrow}</SectionLabel>
        <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
          {testimonials.headline}
        </h2>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {testimonials.items.map((t, i) => (
          <figure
            key={i}
            className="flex flex-col justify-between gap-8 rounded-xl border border-hairline bg-surface-card p-8"
          >
            <blockquote className="text-[16px] leading-[1.5] tracking-[0.16px] text-body-strong">
              “{t.quote}”
            </blockquote>
            <figcaption className="flex items-center gap-3">
              {/* Avatar placeholder — swap for a real headshot (next/image) before launch. */}
              <span
                aria-hidden
                className="h-11 w-11 shrink-0 rounded-full border border-dashed border-hairline-strong bg-canvas-soft"
              />
              <span className="flex flex-col">
                <span className="text-[15px] font-medium text-ink">{t.name}</span>
                <span className="text-[14px] text-muted">{t.role}</span>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
