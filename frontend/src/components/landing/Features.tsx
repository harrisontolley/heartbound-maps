import { Section } from "./Section";
import { SectionLabel } from "./SectionLabel";
import { MediaPlaceholder } from "./MediaPlaceholder";
import { copy } from "./copy";

const CARD =
  "flex flex-col gap-4 rounded-xl border border-hairline bg-surface-card p-6 transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]";

/** Solution / features: the four poster styles, the layout engine, and export. */
export function Features() {
  const { features } = copy;
  return (
    <Section id="features">
      <div className="flex flex-col items-start gap-4">
        <SectionLabel>{features.eyebrow}</SectionLabel>
        <h2 className="max-w-[20ch] font-display text-[clamp(1.75rem,4vw,36px)] font-normal leading-[1.17] tracking-[-0.36px] text-ink">
          {features.headline}
        </h2>
      </div>

      {/* Four poster styles */}
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {features.items.map((item) => (
          <article key={item.title} className={CARD}>
            <MediaPlaceholder label={item.media.label} aspect={item.media.aspect} />
            <h3 className="text-[18px] font-medium leading-[1.44] text-ink">
              {item.title}
            </h3>
            <p className="text-[15px] leading-[1.5] tracking-[0.15px] text-body">
              {item.body}
            </p>
          </article>
        ))}
      </div>

      {/* Differentiators: layout engine + export */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {[features.layoutEngine, features.exportCard].map((item) => (
          <article key={item.title} className={CARD}>
            <h3 className="text-[20px] font-medium leading-[1.35] text-ink">
              {item.title}
            </h3>
            <p className="max-w-[52ch] text-[16px] leading-[1.5] tracking-[0.16px] text-body">
              {item.body}
            </p>
            <MediaPlaceholder label={item.media.label} aspect={item.media.aspect} />
          </article>
        ))}
      </div>
    </Section>
  );
}
