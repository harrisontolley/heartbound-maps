import Image from "next/image";
import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/**
 * The gifting beat: the gift scene (real print composited into the frame)
 * beside the "made to be given" story and the occasions it fits.
 */
export function GiftSection() {
  const { gift } = copy;
  return (
    <Section id="gift">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div
          className="overflow-hidden rounded-xl shadow-[0_24px_48px_-12px_rgba(31,27,22,0.25)]"
          style={{ aspectRatio: gift.media.aspect }}
        >
          <Image
            src={gift.media.src}
            alt={gift.media.alt}
            width={1264}
            height={848}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex flex-col items-start gap-4">
          <SectionLabel>{gift.eyebrow}</SectionLabel>
          <h2 className="font-display text-heading font-normal text-ink">
            {gift.headline}
          </h2>
          {gift.body.map((para, i) => (
            <p key={i} className="max-w-[52ch] text-copy text-body">
              {para}
            </p>
          ))}

          <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
            {gift.occasions.map((o) => (
              <li key={o} className="flex items-center gap-2">
                <span aria-hidden className="h-1 w-1 rounded-full bg-accent" />
                <SectionLabel>{o}</SectionLabel>
              </li>
            ))}
          </ul>

          <div className="pt-2">
            <LinkButton href={STUDIO_HREF} variant="outline" size="md">
              {gift.cta}
            </LinkButton>
          </div>
        </div>
      </div>
    </Section>
  );
}
