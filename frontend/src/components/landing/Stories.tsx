import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { PosterImage } from "./PosterImage";
import { copy } from "./copy";

/**
 * Example prints with story-named captions: the emotional register the product
 * is bought in (a gift that says "this is where we've been").
 */
export function Stories() {
  const { stories } = copy;
  return (
    <Section id="stories" tone="soft">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{stories.eyebrow}</SectionLabel>
        <h2 className="font-display text-heading font-normal text-ink">
          {stories.headline}
        </h2>
      </div>

      <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {stories.items.map((item) => (
          <figure key={item.title} className="flex flex-col gap-3">
            <PosterImage
              media={{ label: item.title, src: item.src, alt: item.alt }}
              className="bg-surface-card"
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            />
            <figcaption className="flex flex-col gap-1">
              <span className="font-display text-[20px] text-ink">{item.title}</span>
              <span className="text-[14px] leading-[1.5] text-muted">
                {item.caption}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
