import Link from "next/link";
import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { PosterImage } from "./PosterImage";
import { copy, STUDIO_HREF, PRIMARY_CTA } from "./copy";
import { DEFAULT_LOOK_ID, LOOKS, type Look } from "@/lib/looks/looks";

/**
 * The preset rack: every look the studio ships, rendered by the real engine
 * (one preset per look in lib/showcase/presets.ts). Labels and blurbs come
 * straight from lib/looks/looks.ts so this gallery can never drift from the
 * product. Each card deep-links into the studio with that look applied, and
 * the studio's default look carries a "Start here" chip.
 */

/** Studio deep link that opens with this look's template (+ variant) applied. */
function lookHref(look: Look): string {
  const params = new URLSearchParams({ template: look.templateId });
  if (look.vintageVariant) params.set("variant", look.vintageVariant);
  return `${STUDIO_HREF}?${params.toString()}`;
}

export function StyleGallery() {
  const { styles } = copy;
  return (
    <Section id="styles">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{styles.eyebrow}</SectionLabel>
        <h2 className="max-w-[22ch] font-display text-heading font-normal text-ink">
          {styles.headline}
        </h2>
        <p className="max-w-[56ch] text-copy text-body">{styles.body}</p>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-3 lg:grid-cols-5">
        {LOOKS.map((look) => (
          <Link
            key={look.id}
            href={lookHref(look)}
            className="group flex flex-col gap-3"
          >
            <span className="relative block">
              <PosterImage
                media={{
                  label: look.label,
                  src: `/showcase/look-${look.id}.png`,
                  alt: `${look.label} style Pinprint`,
                }}
                className="transition-shadow group-hover:shadow-[0_6px_20px_rgba(31,27,22,0.12)]"
                sizes="(min-width: 1024px) 18vw, (min-width: 768px) 30vw, 45vw"
              />
              {look.id === DEFAULT_LOOK_ID && (
                <span className="absolute left-2 top-2 rounded-pill bg-surface-card/95 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.96px] text-accent-deep shadow-[0_2px_8px_rgba(31,27,22,0.12)]">
                  {styles.startHere}
                </span>
              )}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-[15px] font-medium text-ink underline-offset-4 group-hover:underline">
                {look.label}
              </span>
              <span className="text-[13px] leading-[1.5] text-muted">
                {look.blurb}
              </span>
            </span>
          </Link>
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
