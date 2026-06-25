import { bearingToVec } from "@/lib/geo";
import type { TemplateSpec } from "@/lib/templates/types";

type Pt = { x: number; y: number };
// Round emitted coordinates: trig (Math.sin/cos) isn't bit-identical across the
// Node (SSR) and browser V8 versions, so unrounded values cause a hydration
// mismatch. 0.01px precision is irrelevant on a 1000-unit viewBox.
const round = (n: number): number => Math.round(n * 100) / 100;
const pt = (cx: number, cy: number, bearing: number, r: number): Pt => {
  const v = bearingToVec(bearing);
  return { x: round(cx + v.x * r), y: round(cy + v.y * r) };
};

/** One half of a faceted compass point (tip → center, split down the spine). */
function rayHalf(cx: number, cy: number, bearing: number, len: number, halfW: number, side: 1 | -1) {
  const tip = pt(cx, cy, bearing, len);
  const base = pt(cx, cy, bearing + side * 90, halfW);
  return `M ${cx} ${cy} L ${tip.x} ${tip.y} L ${base.x} ${base.y} Z`;
}

/** Decorative compass rose behind the center. Style varies per template. */
export function CompassRose({
  t,
  cx,
  cy,
}: {
  t: TemplateSpec;
  cx: number;
  cy: number;
}) {
  if (t.rose === "none") return null;

  if (t.rose === "starburst") {
    // Faint radiating lines (night-sky).
    const lines = Array.from({ length: 24 }, (_, i) => {
      const a = i * 15;
      const inner = pt(cx, cy, a, 24);
      const outer = pt(cx, cy, a, i % 2 === 0 ? 360 : 250);
      return (
        <line
          key={a}
          x1={inner.x}
          y1={inner.y}
          x2={outer.x}
          y2={outer.y}
          stroke={t.accent}
          strokeOpacity={i % 2 === 0 ? 0.16 : 0.08}
          strokeWidth={1}
        />
      );
    });
    return <g>{lines}</g>;
  }

  if (t.rose === "tick") {
    // Minimal: a single faint guide ring.
    return (
      <circle
        cx={cx}
        cy={cy}
        r={300}
        fill="none"
        stroke={t.ink}
        strokeOpacity={0.06}
        strokeWidth={1.4}
      />
    );
  }

  if (t.rose === "crosshair") {
    // Technical (blueprint): crosshair through center + a degree-tick ring.
    const R = 320;
    const ticks = Array.from({ length: 72 }, (_, i) => {
      const a = i * 5;
      const major = i % 18 === 0; // N / E / S / W
      const o = pt(cx, cy, a, R);
      const inn = pt(cx, cy, a, major ? R - 22 : R - 11);
      return (
        <line
          key={a}
          x1={inn.x}
          y1={inn.y}
          x2={o.x}
          y2={o.y}
          stroke={t.accent}
          strokeOpacity={0.5}
          strokeWidth={major ? 1.4 : 0.7}
        />
      );
    });
    return (
      <g>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={t.accent} strokeOpacity={0.35} strokeWidth={1} />
        <circle
          cx={cx}
          cy={cy}
          r={Math.round(R * 0.62)}
          fill="none"
          stroke={t.accent}
          strokeOpacity={0.16}
          strokeWidth={0.8}
          strokeDasharray="2 7"
        />
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke={t.accent} strokeOpacity={0.2} strokeWidth={0.7} />
        <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke={t.accent} strokeOpacity={0.2} strokeWidth={0.7} />
        {ticks}
        <circle cx={cx} cy={cy} r={6} fill="none" stroke={t.accent} strokeOpacity={0.6} />
      </g>
    );
  }

  if (t.rose === "deco") {
    // Art Deco: a symmetrical stepped sunburst — alternating long/short rays,
    // four faceted cardinal fans, and concentric rings, all in the gold accent.
    const rays = Array.from({ length: 24 }, (_, i) => {
      const a = i * 15;
      const long = i % 2 === 0;
      const inn = pt(cx, cy, a, 28);
      const out = pt(cx, cy, a, long ? 330 : 210);
      return (
        <line
          key={a}
          x1={inn.x}
          y1={inn.y}
          x2={out.x}
          y2={out.y}
          stroke={t.accent}
          strokeOpacity={long ? 0.5 : 0.26}
          strokeWidth={long ? 1.4 : 0.8}
        />
      );
    });
    const fans = [0, 90, 180, 270].map((a) => (
      <g key={a}>
        <path d={rayHalf(cx, cy, a, 350, 16, 1)} fill={t.accent} fillOpacity={0.42} />
        <path d={rayHalf(cx, cy, a, 350, 16, -1)} fill={t.accent} fillOpacity={0.2} />
      </g>
    ));
    return (
      <g>
        {[120, 235, 345].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={t.accent}
            strokeOpacity={0.3}
            strokeWidth={r === 235 ? 1.4 : 0.8}
          />
        ))}
        {rays}
        {fans}
        <circle cx={cx} cy={cy} r={10} fill="none" stroke={t.accent} strokeOpacity={0.6} />
      </g>
    );
  }

  // Ornate (vintage): rings, degree ticks, 8 faceted points + 8 minor points.
  const ringR = [70, 200, 360];
  const ticks = Array.from({ length: 72 }, (_, i) => {
    const a = i * 5;
    const major = i % 6 === 0;
    const a1 = pt(cx, cy, a, 360);
    const a2 = pt(cx, cy, a, major ? 342 : 351);
    return (
      <line
        key={a}
        x1={a1.x}
        y1={a1.y}
        x2={a2.x}
        y2={a2.y}
        stroke={t.ink}
        strokeWidth={major ? 1.3 : 0.7}
        strokeOpacity={0.4}
      />
    );
  });

  const cardinals = [0, 90, 180, 270];
  const intercards = [45, 135, 225, 315];

  const points = [
    ...cardinals.map((a) => ({ a, len: 330, w: 30, op: 0.5 })),
    ...intercards.map((a) => ({ a, len: 235, w: 22, op: 0.34 })),
    // minor 16ths
    ...[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((a) => ({
      a,
      len: 150,
      w: 12,
      op: 0.26,
    })),
  ];

  return (
    <g>
      {ringR.map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={t.ink}
          strokeOpacity={0.18}
          strokeWidth={r === 200 ? 1.4 : 1}
        />
      ))}
      {ticks}
      {points.map(({ a, len, w, op }) => (
        <g key={a}>
          {/* lit half */}
          <path d={rayHalf(cx, cy, a, len, w, 1)} fill={t.ink} fillOpacity={op} />
          {/* shaded half */}
          <path
            d={rayHalf(cx, cy, a, len, w, -1)}
            fill={t.ink}
            fillOpacity={op * 0.45}
          />
        </g>
      ))}
      {/* cardinal letters */}
      {(
        [
          ["N", 0],
          ["E", 90],
          ["S", 180],
          ["W", 270],
        ] as const
      ).map(([ch, a]) => {
        const p = pt(cx, cy, a, 390);
        return (
          <text
            key={ch}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={t.titleFamily}
            fontSize={30}
            fill={t.ink}
            fillOpacity={0.55}
            style={{ letterSpacing: "1px" }}
          >
            {ch}
          </text>
        );
      })}
      <circle cx={cx} cy={cy} r={10} fill="none" stroke={t.ink} strokeOpacity={0.4} />
    </g>
  );
}
