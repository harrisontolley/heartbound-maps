import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { MediaPlaceholder } from "./MediaPlaceholder";
import { copy } from "./copy";

/** Gallery of example posters to show range and outcome. */
export function Showcase() {
  const { showcase } = copy;
  return (
    <Section orbs="sidebar">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{showcase.eyebrow}</SectionLabel>
        <h2 className="font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
          {showcase.headline}
        </h2>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {showcase.items.map((item, i) => (
          <MediaPlaceholder
            key={i}
            label={item.label}
            aspect={item.aspect}
            className="bg-surface-card"
          />
        ))}
      </div>
    </Section>
  );
}
