/**
 * Pure measured packing for the poster legend row. The old layout used a
 * fixed 168u cell per item, which overflows the 1000u poster once more than
 * ~5 of the 8 affiliation categories are present. This measures each
 * glyph+label block, spaces blocks with a fixed gutter, centers the row, and
 * uniformly scales everything down (clamped) when the row would overflow the
 * safe area. Extracted from Legend.tsx so the math is unit-testable.
 */

export type LegendItemLayout = {
  /** Center-x of the glyph. */
  iconX: number;
  /** Left edge of the label text. */
  textX: number;
  /** Estimated label width (scaled). */
  textW: number;
};

export type LegendLayout = {
  /** Uniform scale applied to size/labelSize/gap (1 = no shrink). */
  scale: number;
  size: number;
  labelSize: number;
  gap: number;
  items: LegendItemLayout[];
};

/** Same width estimator the legend has always used for its label text. */
const CHAR_W = 0.62;
const GUTTER = 44; // between blocks
const MARGIN = 40; // safe inset from each poster edge
const MIN_SCALE = 0.72;

export function layoutLegend({
  labels,
  width,
  size,
  labelSize,
  gap,
}: {
  labels: string[];
  width: number;
  size: number;
  labelSize: number;
  gap: number;
}): LegendLayout {
  if (labels.length === 0) {
    return { scale: 1, size, labelSize, gap, items: [] };
  }

  const blockW = (label: string) => size + gap + label.length * labelSize * CHAR_W;
  const rawTotal =
    labels.reduce((sum, l) => sum + blockW(l), 0) + GUTTER * (labels.length - 1);

  const maxW = width - 2 * MARGIN;
  const scale = rawTotal <= maxW ? 1 : Math.max(MIN_SCALE, maxW / rawTotal);

  const s = size * scale;
  const ls = labelSize * scale;
  const g = gap * scale;
  const gutter = GUTTER * scale;
  const total = rawTotal * scale;

  let x = (width - total) / 2;
  const items: LegendItemLayout[] = labels.map((label) => {
    const textW = label.length * ls * CHAR_W;
    const item = { iconX: x + s / 2, textX: x + s + g, textW };
    x += s + g + textW + gutter;
    return item;
  });

  return { scale, size: s, labelSize: ls, gap: g, items };
}
