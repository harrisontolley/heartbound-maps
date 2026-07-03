import type { LaidOut } from "@/lib/layout/types";
import type { TemplateSpec } from "@/lib/templates/types";
import { AFFILIATIONS, AFFILIATION_ORDER, PosterGlyph } from "@/lib/affiliations";
import { layoutLegend } from "./legendLayout";

/**
 * Horizontal legend mapping each present tie type to its glyph + label.
 * Measured packing (see legendLayout.ts): typical 3–5-category posters render
 * at full size; when many of the 8 categories are present the whole row
 * scales down uniformly instead of overflowing the poster.
 */
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

  const layout = layoutLegend({
    labels: present.map((a) => AFFILIATIONS[a].label),
    width,
    size: 19,
    labelSize: 19,
    gap: 9,
  });

  return (
    <g>
      {present.map((a, i) => {
        const meta = AFFILIATIONS[a];
        const color = t.affiliationColors[a];
        const { iconX, textX } = layout.items[i];
        return (
          <g key={a}>
            <PosterGlyph
              type={a}
              x={iconX}
              y={y}
              size={layout.size}
              color={color}
            />
            <text
              x={textX}
              y={y}
              dominantBaseline="middle"
              fontFamily={t.nameFamily}
              fontSize={layout.labelSize}
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
