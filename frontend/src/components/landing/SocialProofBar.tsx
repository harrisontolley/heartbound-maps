import { Section } from "./Section";
import { MediaPlaceholder } from "./MediaPlaceholder";
import { copy } from "./copy";

/** Thin trust band: label + a row of press/partner logo placeholders. */
export function SocialProofBar() {
  return (
    <Section tone="soft" className="py-14 md:py-16">
      <div className="flex flex-col items-center gap-8">
        <p className="text-[12px] font-semibold uppercase tracking-[0.96px] text-muted">
          {copy.socialProof.label}
        </p>
        <div className="grid w-full grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {copy.socialProof.logos.map((logo, i) => (
            <MediaPlaceholder key={i} label={logo} aspect="3 / 1" />
          ))}
        </div>
      </div>
    </Section>
  );
}
