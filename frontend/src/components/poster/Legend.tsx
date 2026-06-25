import type { LaidOut } from "@/lib/layout/types";
import type { TemplateSpec } from "@/lib/templates/types";
import { AFFILIATIONS, AFFILIATION_ORDER, PosterGlyph } from "@/lib/affiliations";

/** Horizontal legend mapping each present tie type to its glyph + label. */
export function Legend({
  items,
  t,
  width,
  y,
}: {
  items: LaidOut[];
  t: TemplateSpec;
  width: number;
  y: number;
}) {
  const present = AFFILIATION_ORDER.filter((a) =>
    items.some((it) => it.affiliation === a),
  );
  if (present.length === 0) return null;

  const size = 19;
  const labelSize = 19;
  const gap = 9;
  const cell = 168;
  const total = present.length * cell;
  const startX = (width - total) / 2 + cell / 2;

  return (
    <g>
      {present.map((a, i) => {
        const meta = AFFILIATIONS[a];
        const color = t.affiliationColors[a];
        const center = startX + i * cell;
        const labelChars = meta.label.length;
        const textW = labelChars * labelSize * 0.62;
        const blockW = size + gap + textW;
        const iconX = center - blockW / 2 + size / 2;
        const textX = center - blockW / 2 + size + gap;
        return (
          <g key={a}>
            <PosterGlyph type={a} x={iconX} y={y} size={size} color={color} />
            <text
              x={textX}
              y={y}
              dominantBaseline="middle"
              fontFamily={t.nameFamily}
              fontSize={labelSize}
              fill={t.inkSoft}
              style={{
                letterSpacing: "1.5px",
                fontVariant:
                  t.nameTransform === "smallcaps" ? "small-caps" : "normal",
              }}
            >
              {t.nameTransform === "uppercase"
                ? meta.label.toUpperCase()
                : meta.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
