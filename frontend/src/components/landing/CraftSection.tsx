import Image from "next/image";
import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { copy } from "./copy";

/**
 * The materials story. The one visual device is the paper-weight scale: three
 * hairline bars whose widths are the real gsm numbers, so the claim teaches
 * itself (Under Lucky Stars' trick of giving the customer the scale).
 */
const PAPER_SCALE = [
  { label: "Everyday printer paper", gsm: 90 },
  { label: "Typical poster-shop print", gsm: 150 },
  { label: "Heartbound Maps, Hahnemühle German Etching", gsm: 310, accent: true },
] as const;

export function CraftSection() {
  const { craft } = copy;
  return (
    <Section tone="soft">
      <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        <div className="flex flex-col items-start gap-4">
          <SectionLabel>{craft.eyebrow}</SectionLabel>
          <h2 className="max-w-[22ch] font-display text-heading font-normal text-ink">
            {craft.headline}
          </h2>
          {craft.body.map((para, i) => (
            <p key={i} className="max-w-[56ch] text-copy text-body">
              {para}
            </p>
          ))}

          <dl className="mt-4 flex w-full max-w-[440px] flex-col gap-3">
            {PAPER_SCALE.map((row) => (
              <div key={row.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[13px] leading-snug text-body">{row.label}</dt>
                  <dd className="shrink-0">
                    <SectionLabel
                      tone={"accent" in row && row.accent ? "accent" : "muted"}
                      className="tabular-nums"
                    >
                      {row.gsm}gsm
                    </SectionLabel>
                  </dd>
                </div>
                <div
                  aria-hidden
                  className={`h-[3px] rounded-pill ${
                    "accent" in row && row.accent ? "bg-accent" : "bg-hairline-strong"
                  }`}
                  style={{ width: `${(row.gsm / 310) * 100}%` }}
                />
              </div>
            ))}
          </dl>
        </div>

        <div
          className="overflow-hidden rounded-xl shadow-[0_4px_16px_rgba(31,27,22,0.05)]"
          style={{ aspectRatio: craft.media.aspect }}
        >
          <Image
            src={craft.media.src}
            alt={craft.media.alt}
            width={1264}
            height={848}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </Section>
  );
}
