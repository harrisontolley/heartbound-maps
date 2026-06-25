import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";

/** Two-column editorial problem statement to build empathy before the solution. */
export function Problem() {
  const { problem } = copy;
  return (
    <Section>
      <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <SectionLabel>{problem.eyebrow}</SectionLabel>
          <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
            {problem.headline}
          </h2>
        </div>
        <div className="flex flex-col gap-5 md:pt-10">
          {problem.body.map((para, i) => (
            <p
              key={i}
              className="max-w-[58ch] text-[16px] leading-[1.5] tracking-[0.16px] text-body"
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </Section>
  );
}
