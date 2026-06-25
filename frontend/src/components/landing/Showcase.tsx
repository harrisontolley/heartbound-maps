import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { PosterImage } from "./PosterImage";
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
          <PosterImage
            key={i}
            media={item}
            className="bg-surface-card"
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          />
        ))}
      </div>
    </Section>
  );
}
