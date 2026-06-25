import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { LinkButton } from "./LinkButton";
import { PosterImage } from "./PosterImage";
import { copy, STUDIO_HREF } from "./copy";

/** Above-the-fold hero: headline, subhead, two CTAs, and a poster preview. */
export function Hero() {
  const { hero } = copy;
  return (
    <Section orbs="preview" className="pt-32 md:pt-40">
      <div id="top" className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col items-start gap-6">
          <SectionLabel>{hero.eyebrow}</SectionLabel>
          <h1 className="font-display text-[clamp(2.25rem,6vw,64px)] font-normal leading-[1.05] tracking-[-1.92px] text-ink">
            {hero.headline}
          </h1>
          <p className="max-w-[52ch] text-[16px] leading-[1.5] tracking-[0.16px] text-body">
            {hero.subhead}
          </p>
          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
            <LinkButton href={STUDIO_HREF} variant="primary" size="md">
              {hero.primaryCta}
            </LinkButton>
            <LinkButton href="#how-it-works" variant="outline" size="md">
              {hero.secondaryCta}
            </LinkButton>
          </div>
        </div>

        <div className="relative">
          <PosterImage
            media={hero.media}
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
          />
        </div>
      </div>
    </Section>
  );
}
