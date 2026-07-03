import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { PosterImage } from "./PosterImage";
import { copy, STUDIO_HREF, PRIMARY_CTA } from "./copy";
import { LOOKS } from "@/lib/looks/looks";

/**
 * Every look the studio ships, rendered by the real engine (one preset per
 * look in lib/showcase/presets.ts). Labels and blurbs come straight from
 * lib/looks/looks.ts so this gallery can never drift from the product.
 */
export function StyleGallery() {
  const { styles } = copy;
  return (
    <Section id="styles">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{styles.eyebrow}</SectionLabel>
        <h2 className="max-w-[22ch] font-display text-heading font-normal text-ink">
          {styles.headline}
        </h2>
        <p className="max-w-[52ch] text-copy text-body">{styles.body}</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
        {LOOKS.map((look) => (
          <figure key={look.id} className="flex flex-col gap-3">
            <PosterImage
              media={{
                label: look.label,
                src: `/showcase/look-${look.id}.png`,
                alt: `${look.label} style Pinprint`,
              }}
              className="transition-shadow hover:shadow-[0_4px_16px_rgba(31,27,22,0.08)]"
              sizes="(min-width: 1024px) 18vw, (min-width: 768px) 30vw, 45vw"
            />
            <figcaption className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-ink">{look.label}</span>
              <span className="text-[13px] leading-[1.5] text-muted">
                {look.blurb}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <div className="mt-12">
        <LinkButton href={STUDIO_HREF} variant="outline" size="md">
          {PRIMARY_CTA}
        </LinkButton>
      </div>
    </Section>
  );
}
