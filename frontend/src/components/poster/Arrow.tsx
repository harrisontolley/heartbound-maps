import type { LaidOut } from "@/lib/layout/types";
import type { TemplateSpec } from "@/lib/templates/types";

function Arrowhead({
  tip,
  dir,
  t,
  color,
}: {
  tip: { x: number; y: number };
  dir: { x: number; y: number };
  t: TemplateSpec;
  color: string;
}) {
  const len = t.arrowheadSize;
  const wing = len * 0.42;
  const back = { x: -dir.x, y: -dir.y };
  const perp = { x: -dir.y, y: dir.x };
  const base = { x: tip.x + back.x * len, y: tip.y + back.y * len };
  const l = { x: base.x + perp.x * wing, y: base.y + perp.y * wing };
  const r = { x: base.x - perp.x * wing, y: base.y - perp.y * wing };

  if (t.arrowhead === "solid") {
    return (
      <path d={`M ${tip.x} ${tip.y} L ${l.x} ${l.y} L ${r.x} ${r.y} Z`} fill={color} />
    );
  }
  return (
    <g stroke={color} strokeWidth={t.arrowWidth} strokeLinecap="round" fill="none">
      <line x1={tip.x} y1={tip.y} x2={l.x} y2={l.y} />
      <line x1={tip.x} y1={tip.y} x2={r.x} y2={r.y} />
    </g>
  );
}

/** One spoke: a line at the exact bearing, an arrowhead, and a leader if nudged. */
export function Arrow({
  item,
  t,
  cx,
  cy,
}: {
  item: LaidOut;
  t: TemplateSpec;
  cx: number;
  cy: number;
}) {
  const d = item.dir;
  const startGap = t.homeDotSize + 16;
  const start = { x: cx + d.x * startGap, y: cy + d.y * startGap };
  const tip = item.tip;
  const color = t.colorizeArrows ? t.affiliationColors[item.affiliation] : t.ink;

  return (
    <g>
      {item.needsLeader && (
        <line
          x1={tip.x}
          y1={tip.y}
          x2={item.labelBox.anchorX}
          y2={item.labelBox.anchorY}
          stroke={t.inkSoft}
          strokeWidth={0.9}
          strokeDasharray="2 3"
          strokeOpacity={0.8}
        />
      )}
      <line
        x1={start.x}
        y1={start.y}
        x2={tip.x}
        y2={tip.y}
        stroke={color}
        strokeWidth={t.arrowWidth}
        strokeLinecap="round"
      />
      <Arrowhead tip={tip} dir={d} t={t} color={color} />
    </g>
  );
}
