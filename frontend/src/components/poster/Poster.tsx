import type { LaidOut } from "@/lib/layout/types";
import type { TemplateSpec } from "@/lib/templates/types";
import type { DisplayOptions } from "@/lib/templates/customize";
import type { Place, Units } from "@/lib/types";
import { posterGeometry } from "@/lib/poster/geometry";
import { PaperBackground, RingGuides, Contours } from "./PaperTexture";
import { CompassRose } from "./CompassRose";
import { Arrow } from "./Arrow";
import { PlaceLabel } from "./PlaceLabel";
import { Legend } from "./Legend";
import { fitTitleFontSize } from "./measure";

export const POSTER_W = 1000;
export const POSTER_H = 1500;
const TITLE_SAFE_INSET = 96; // px from each page edge; symmetric border-free zone for the title

const DEFAULT_DISPLAY: DisplayOptions = {
  legend: true,
  distances: true,
  north: true,
  footer: true,
};

function formatCoords(lat: number, lng: number): string {
  const la = `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? "N" : "S"}`;
  const lo = `${Math.abs(lng).toFixed(2)}°${lng >= 0 ? "E" : "W"}`;
  return `${la} · ${lo}`;
}

function NorthIndicator({
  t,
  cx,
  top,
}: {
  t: TemplateSpec;
  cx: number;
  top: number;
}) {
  return (
    <g>
      <text
        x={cx}
        y={top}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily={t.nameFamily}
        fontSize={22}
        fontWeight={600}
        fill={t.ink}
        style={{ letterSpacing: "1px" }}
      >
        N
      </text>
      <path d={`M ${cx} ${top + 9} l -5 10 l 5 -3.5 l 5 3.5 z`} fill={t.ink} />
    </g>
  );
}

export type PosterProps = {
  home: Place | null;
  items: LaidOut[];
  template: TemplateSpec;
  units: Units;
  width?: number;
  height?: number;
  /** Override the title (home name). Falls back to the home label. */
  title?: string | null;
  /** Override the subtitle (coordinates). Falls back to home coordinates. */
  subtitle?: string | null;
  /** Override the footer wordmark. Falls back to "HEARTBOUND MAPS". */
  footer?: string | null;
  /** Show/hide non-spec elements (legend, distances, north, footer). */
  display?: DisplayOptions;
  /** Unique prefix for SVG <defs> ids (keep distinct across multiple posters). */
  idPrefix?: string;
};

/**
 * Pure presentational poster. Consumes resolved geometry (LaidOut[]) and a
 * template; renders a self-contained SVG used by both the live preview and the
 * SVG/PNG export. No hooks, so it can be server-rendered too.
 */
export function Poster({
  home,
  items,
  template: t,
  units,
  width = POSTER_W,
  height = POSTER_H,
  title,
  subtitle,
  footer,
  display = DEFAULT_DISPLAY,
  idPrefix = "pp",
}: PosterProps) {
  const { cx, cy } = posterGeometry(width, height);
  const margin = 44;

  const titleStr = title && title.trim() ? title.trim() : home?.label ?? "";
  const displayedTitle =
    t.nameTransform === "uppercase" ? titleStr.toUpperCase() : titleStr;
  const subtitleStr =
    subtitle && subtitle.trim()
      ? subtitle.trim()
      : home
        ? formatCoords(home.lat, home.lng)
        : "";
  const footerStr = footer && footer.trim() ? footer.trim() : "HEARTBOUND MAPS";

  const titleMaxWidth = width - 2 * TITLE_SAFE_INSET;
  const fittedTitleSize = home
    ? fitTitleFontSize(
        displayedTitle,
        t.titleSize,
        t.titleFamily,
        t.titleWeight,
        t.titleLetterSpacing,
        titleMaxWidth,
        t.nameTransform === "smallcaps",
      )
    : t.titleSize;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      className="poster-svg"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={
        home ? `Map of places radiating from ${home.label}` : "Empty map"
      }
    >
      <PaperBackground t={t} width={width} height={height} idp={idPrefix} />
      {t.backdrop === "contours" && (
        <Contours cx={cx} cy={cy} color={t.ink} maxR={Math.min(cx, cy) - margin - 8} />
      )}
      {t.ringGuides && (
        <RingGuides
          cx={cx}
          cy={cy}
          color={t.accent}
          maxR={Math.min(cx, cy) - margin - 16}
        />
      )}
      <CompassRose t={t} cx={cx} cy={cy} />
      {t.homeGlow && (
        <circle cx={cx} cy={cy} r={130} fill={`url(#${idPrefix}-glow)`} />
      )}

      {/* Spokes first, then labels so text paints above the lines. */}
      {items.map((it) => (
        <Arrow key={`a-${it.id}`} item={it} t={t} cx={cx} cy={cy} />
      ))}
      {items.map((it) => (
        <PlaceLabel
          key={`l-${it.id}`}
          item={it}
          t={t}
          units={units}
          showDistances={display.distances}
        />
      ))}

      {/* Home marker */}
      {home && (
        <>
          <circle cx={cx} cy={cy} r={t.homeDotSize} fill={t.accent} />
          {t.rose === "ornate" && (
            <circle
              cx={cx}
              cy={cy}
              r={t.homeDotSize + 6}
              fill="none"
              stroke={t.accent}
              strokeWidth={1.2}
            />
          )}
        </>
      )}

      {/* Empty state */}
      {!home && (
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily={t.distFamily}
          fontSize={28}
          fontStyle="italic"
          fill={t.inkSoft}
        >
          Search a place to begin
        </text>
      )}

      {display.north && <NorthIndicator t={t} cx={cx} top={margin + 42} />}

      {/* Title block: home name + coordinates, lower third. */}
      {home && (
        <g textAnchor="middle">
          <text
            x={cx}
            y={height - 286}
            fontFamily={t.titleFamily}
            fontSize={fittedTitleSize}
            fontWeight={t.titleWeight}
            fill={t.ink}
            style={{
              letterSpacing: `${t.titleLetterSpacing}px`,
              fontVariant:
                t.nameTransform === "smallcaps" ? "small-caps" : "normal",
            }}
          >
            {displayedTitle}
          </text>
          {subtitleStr && (
            <text
              x={cx}
              y={height - 240}
              fontFamily={t.distFamily}
              fontSize={t.subtitleSize}
              fill={t.inkSoft}
              fontStyle={t.distItalic ? "italic" : "normal"}
              style={{ letterSpacing: "3px" }}
            >
              {subtitleStr}
            </text>
          )}
        </g>
      )}

      {display.legend && (
        <Legend items={items} t={t} width={width} y={height - 162} />
      )}

      {/* Footer wordmark */}
      {display.footer && footerStr && (
        <text
          x={cx}
          y={height - 92}
          textAnchor="middle"
          fontFamily={t.titleFamily}
          fontSize={19}
          fill={t.inkSoft}
          style={{ letterSpacing: "9px" }}
        >
          {footerStr}
        </text>
      )}

      {/* Border */}
      {t.border && (
        <g fill="none" stroke={t.border}>
          <rect
            x={margin}
            y={margin}
            width={width - 2 * margin}
            height={height - 2 * margin}
            strokeWidth={2}
          />
          {t.doubleBorder && (
            <rect
              x={margin + 9}
              y={margin + 9}
              width={width - 2 * (margin + 9)}
              height={height - 2 * (margin + 9)}
              strokeWidth={1}
            />
          )}
        </g>
      )}
    </svg>
  );
}
