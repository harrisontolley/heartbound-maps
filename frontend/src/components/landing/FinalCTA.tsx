import { Section } from "./Section";
import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/** Closing CTA band, repeating the primary action with light atmosphere. */
export function FinalCTA() {
  const { finalCta } = copy;
  return (
    <Section orbs="card">
      <div className="mx-auto flex max-w-[40ch] flex-col items-center gap-6 text-center">
        <h2 className="font-display text-[clamp(1.75rem,4.5vw,40px)] font-normal leading-[1.13] tracking-[-0.96px] text-ink">
          {finalCta.headline}
        </h2>
        <p className="text-[16px] leading-[1.5] tracking-[0.16px] text-body">
          {finalCta.subhead}
        </p>
        <LinkButton href={STUDIO_HREF} variant="primary" size="md">
          {finalCta.cta}
        </LinkButton>
      </div>
    </Section>
  );
}
