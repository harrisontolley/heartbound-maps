import { Section } from "./Section";
import { LinkButton } from "./LinkButton";
import { copy, STUDIO_HREF } from "./copy";

/**
 * Closing CTA band: a calm centered repeat of the primary action. Shared by /,
 * /faq, /pricing and the compare pages. (The gift scene lives in GiftSection.)
 */
export function FinalCTA() {
  const { finalCta } = copy;
  return (
    <Section id="final-cta" tone="soft">
      <div className="mx-auto flex max-w-[44ch] flex-col items-center gap-6 text-center">
        <h2 className="font-display text-title font-normal text-ink">
          {finalCta.headline}
        </h2>
        <p className="text-copy text-body">{finalCta.subhead}</p>
        <LinkButton
          href={STUDIO_HREF}
          variant="primary"
          size="md"
          trackId="final_cta"
          trackLocation="final_cta"
        >
          {finalCta.cta}
        </LinkButton>
      </div>
    </Section>
  );
}
