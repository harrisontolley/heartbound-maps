import type { TemplateSpec } from "@/lib/templates/types";

/** Background fill + optional vignette, paper grain, and a glow gradient def. */
export function PaperBackground({
  t,
  width,
  height,
  idp,
}: {
  t: TemplateSpec;
  width: number;
  height: number;
  idp: string;
}) {
  return (
    <>
      <defs>
        {t.paperEdge && (
          <radialGradient id={`${idp}-vignette`} cx="50%" cy="46%" r="72%">
            <stop offset="52%" stopColor={t.paper} />
            <stop offset="100%" stopColor={t.paperEdge} />
          </radialGradient>
        )}
        {t.texture && (
          <filter
            id={`${idp}-grain`}
            x="0"
            y="0"
            width="100%"
            height="100%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.82"
              numOctaves={2}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.05" />
            </feComponentTransfer>
          </filter>
        )}
        {t.homeGlow && (
          <radialGradient id={`${idp}-glow`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={t.accent} stopOpacity="0.55" />
            <stop offset="60%" stopColor={t.accent} stopOpacity="0.12" />
            <stop offset="100%" stopColor={t.accent} stopOpacity="0" />
          </radialGradient>
        )}
        {t.backdrop === "grid" && (
          <>
            <pattern
              id={`${idp}-grid`}
              width={40}
              height={40}
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={t.accent}
                strokeWidth={0.5}
                strokeOpacity={0.16}
              />
            </pattern>
            <pattern
              id={`${idp}-grid-major`}
              width={200}
              height={200}
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 200 0 L 0 0 0 200"
                fill="none"
                stroke={t.accent}
                strokeWidth={1}
                strokeOpacity={0.26}
              />
            </pattern>
          </>
        )}
      </defs>

      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={t.paperEdge ? `url(#${idp}-vignette)` : t.paper}
      />
      {t.backdrop === "grid" && (
        <>
          <rect x={0} y={0} width={width} height={height} fill={`url(#${idp}-grid)`} />
          <rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={`url(#${idp}-grid-major)`}
          />
        </>
      )}
      {t.texture && (
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          filter={`url(#${idp}-grain)`}
        />
      )}
    </>
  );
}

/**
 * Layered concentric contour rings radiating from home, used as soft distance
 * bands behind the compass (topographic). Rings are evenly spaced; every third
 * one is drawn heavier, like an index contour on a real map.
 */
export function Contours({
  cx,
  cy,
  color,
  maxR,
  count = 9,
}: {
  cx: number;
  cy: number;
  color: string;
  maxR: number;
  count?: number;
}) {
  const rings = Array.from({ length: count }, (_, i) => ((i + 1) * maxR) / count);
  return (
    <g fill="none" stroke={color} strokeOpacity={0.24}>
      {rings.map((r, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={Math.round(r)}
          strokeWidth={i % 3 === 2 ? 1.5 : 0.8}
        />
      ))}
    </g>
  );
}

/** Faint dotted concentric rings (night-sky guides). */
export function RingGuides({
  cx,
  cy,
  color,
  maxR = 420,
}: {
  cx: number;
  cy: number;
  color: string;
  maxR?: number;
}) {
  const rings = [maxR * 0.4, maxR * 0.7, maxR];
  return (
    <g fill="none" stroke={color} strokeOpacity={0.22} strokeDasharray="1 9">
      {rings.map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} strokeWidth={1.4} />
      ))}
    </g>
  );
}
