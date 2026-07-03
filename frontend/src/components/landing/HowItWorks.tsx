import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";

/**
 * Three numbered steps from blank canvas to a finished print. The numerals are
 * honest structure (it really is a sequence), set in the display serif.
 */
export function HowItWorks() {
  const { howItWorks } = copy;
  return (
    <Section id="how-it-works" tone="soft">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{howItWorks.eyebrow}</SectionLabel>
        <h2 className="font-display text-heading font-normal text-ink">
          {howItWorks.headline}
        </h2>
      </div>

      <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        {howItWorks.steps.map((step, i) => (
          <li
            key={step.title}
            className="flex flex-col gap-4 border-t border-hairline pt-6"
          >
            <span
              aria-hidden
              className="font-display text-[40px] font-normal leading-none text-muted-soft"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="text-[20px] font-medium leading-[1.35] text-ink">
              {step.title}
            </h3>
            <p className="max-w-[44ch] text-copy text-body">{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
