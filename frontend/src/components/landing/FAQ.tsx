import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";

/**
 * FAQ accordion. Uses native <details>/<summary> so the section stays a server
 * component — no client JS needed for the disclosure behavior.
 */
export function FAQ() {
  const { faq } = copy;
  return (
    <Section id="faq">
      <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <SectionLabel>{faq.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
            {faq.headline}
          </h2>
        </div>

        <div className="flex flex-col border-t border-hairline">
          {faq.items.map((item) => (
            <details
              key={item.q}
              className="group border-b border-hairline py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-medium text-ink marker:hidden">
                {item.q}
                <span
                  aria-hidden
                  className="text-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 max-w-[60ch] text-[16px] leading-[1.5] tracking-[0.16px] text-body">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
