/** Uppercase eyebrow label (caption-uppercase token from DESIGN.md). */

type Tone = "muted" | "accent";

const TONES: Record<Tone, string> = {
  muted: "text-muted",
  accent: "text-accent-deep",
};

export function SectionLabel({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`text-[12px] font-semibold uppercase tracking-[0.96px] ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
