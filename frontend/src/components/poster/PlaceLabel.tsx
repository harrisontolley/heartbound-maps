import type { LaidOut } from "@/lib/layout/types";
import type { TemplateSpec } from "@/lib/templates/types";
import type { Units } from "@/lib/types";
import { PosterGlyph } from "@/lib/affiliations";
import { labelStrings, LABEL_ICON_GAP } from "./labelText";

/** Two-line place label (name + distance) with an affiliation glyph beside it. */
export function PlaceLabel({
  item,
  t,
  units,
  showDistances = true,
}: {
  item: LaidOut;
  t: TemplateSpec;
  units: Units;
  showDistances?: boolean;
}) {
  const b = item.labelBox;
  const { name, dist } = labelStrings(item, t, units);
  const color = t.affiliationColors[item.affiliation];

  // Icon sits on the side of the text block nearest the center (the arrow).
  const iconOnRight = b.anchor === "end";
  const iconCx = iconOnRight ? b.x + b.w - t.iconSize / 2 : b.x + t.iconSize / 2;
  const iconCy = b.y + b.h / 2;

  let textX: number;
  if (b.anchor === "start") {
    textX = b.x + t.iconSize + LABEL_ICON_GAP;
  } else if (b.anchor === "end") {
    textX = b.x + b.w - t.iconSize - LABEL_ICON_GAP;
  } else {
    const inner = b.w - t.iconSize - LABEL_ICON_GAP;
    textX = b.x + t.iconSize + LABEL_ICON_GAP + inner / 2;
  }

  const nameY = b.y + t.lineHeight * 0.5;
  const distY = b.y + t.lineHeight * 1.5;

  return (
    <g>
      <PosterGlyph
        type={item.affiliation}
        x={iconCx}
        y={iconCy}
        size={t.iconSize}
        color={color}
        opacity={t.glyphOpacity}
      />
      <text
        x={textX}
        y={nameY}
        textAnchor={b.anchor}
        dominantBaseline="middle"
        fontFamily={t.nameFamily}
        fontSize={t.nameSize}
        fontWeight={t.nameWeight}
        fill={t.ink}
        style={{
          letterSpacing: `${t.nameLetterSpacing}px`,
          fontVariant: t.nameTransform === "smallcaps" ? "small-caps" : "normal",
        }}
      >
        {name}
      </text>
      {showDistances && (
        <text
          x={textX}
          y={distY}
          textAnchor={b.anchor}
          dominantBaseline="middle"
          fontFamily={t.distFamily}
          fontSize={t.distSize}
          fontStyle={t.distItalic ? "italic" : "normal"}
          fill={t.inkSoft}
          style={{ letterSpacing: `${t.distLetterSpacing}px` }}
        >
          {dist}
        </text>
      )}
    </g>
  );
}
