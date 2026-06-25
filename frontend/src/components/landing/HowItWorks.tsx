import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { MediaPlaceholder } from "./MediaPlaceholder";
import { copy } from "./copy";

/** Three numbered steps from blank canvas to a printable poster. */
export function HowItWorks() {
  const { howItWorks } = copy;
  return (
    <Section id="how-it-works" tone="soft">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{howItWorks.eyebrow}</SectionLabel>
        <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
          {howItWorks.headline}
        </h2>
      </div>

      <ol className="mt-12 grid gap-8 md:grid-cols-3">
        {howItWorks.steps.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-4">
            <span
              aria-hidden
              className="font-display text-[48px] font-normal leading-none tracking-[-0.96px] text-muted-soft"
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <MediaPlaceholder label={step.media.label} aspect={step.media.aspect} />
            <h3 className="text-[20px] font-medium leading-[1.35] text-ink">
              {step.title}
            </h3>
            <p className="text-[16px] leading-[1.5] tracking-[0.16px] text-body">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
