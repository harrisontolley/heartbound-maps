/**
 * Atmospheric pastel gradient orbs — the editorial brand's only "color" moments
 * (DESIGN.md). Pure decoration: aria-hidden, non-interactive, low-opacity radial
 * blooms positioned within a `relative` parent. Static (no animation, per DESIGN.md).
 *
 * Reads the `--color-gradient-*` custom properties emitted to :root by the plain
 * `@theme` block in globals.css. Keep instances OUTSIDE the exported poster's DOM
 * subtree so they never enter the rasterized/serialized SVG.
 */

type Preset = "preview" | "header" | "sidebar" | "card";

type Orb = {
  color: string;
  size: string;
  opacity: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
};

const MINT = "var(--color-gradient-mint)";
const PEACH = "var(--color-gradient-peach)";
const LAVENDER = "var(--color-gradient-lavender)";
const SKY = "var(--color-gradient-sky)";
const ROSE = "var(--color-gradient-rose)";

const PRESETS: Record<Preset, Orb[]> = {
  // The centerpiece — large blooms drifting around the floating poster card.
  preview: [
    { color: MINT, size: "44rem", opacity: 0.45, top: "-10%", left: "-8%" },
    { color: LAVENDER, size: "40rem", opacity: 0.42, top: "8%", right: "-12%" },
    { color: PEACH, size: "34rem", opacity: 0.4, bottom: "-14%", left: "18%" },
    { color: SKY, size: "30rem", opacity: 0.32, bottom: "-4%", right: "6%" },
  ],
  // Faint wash behind the wordmark.
  header: [
    { color: PEACH, size: "22rem", opacity: 0.32, top: "-160%", left: "-2%" },
    { color: LAVENDER, size: "20rem", opacity: 0.28, top: "-200%", left: "14%" },
  ],
  // Subtle top-of-sidebar atmosphere.
  sidebar: [
    { color: MINT, size: "24rem", opacity: 0.3, top: "-8%", left: "-24%" },
    { color: SKY, size: "20rem", opacity: 0.26, top: "-2%", right: "-28%" },
  ],
  // Empty-state card bloom.
  card: [
    { color: LAVENDER, size: "16rem", opacity: 0.5, top: "-32%", right: "-10%" },
    { color: ROSE, size: "14rem", opacity: 0.42, bottom: "-30%", left: "-8%" },
  ],
};

export function GradientOrbs({
  preset,
  className = "",
}: {
  preset: Preset;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {PRESETS[preset].map((o, i) => (
        <span
          key={`${preset}-${i}`}
          className="absolute rounded-full"
          style={{
            width: o.size,
            height: o.size,
            top: o.top,
            left: o.left,
            right: o.right,
            bottom: o.bottom,
            opacity: o.opacity,
            background: `radial-gradient(circle at center, ${o.color} 0%, transparent 70%)`,
            filter: "blur(44px)",
          }}
        />
      ))}
    </div>
  );
}
