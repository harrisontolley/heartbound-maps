import type { Vec2 } from "@/lib/geo/projection";
import type { TripStop } from "@/lib/trip/types";

export const TRIP_W = 1400;
export const TRIP_H = 700;

// Warm "vintage travel" palette. Fixed for the prototype; a later pass can lift
// these into a TripStyle/template like the poster engine does.
const PAPER = "#f5efe2";
const LAND = "#cabfa6";
const INK = "#2c2a26";
const ROUTE = "#b4471f";
const MARKER = "#b4471f";
const MARKER_INK = "#f5efe2";
const FRAME = "#b7ac95";

const FONT = { fontFamily: "var(--font-inter)" } as const;

export interface TripMapProps {
  /** Ordered stops, parallel to `points`. */
  stops: TripStop[];
  /** Projected marker positions for each stop. */
  points: Vec2[];
  /** Projected land path `d` (dotted backdrop), or null when hidden. */
  landPath: string | null;
  /** Arc path `d` strings, one per leg, in order (includes the loop leg). */
  legs: string[];
  width?: number;
  height?: number;
  title?: string | null;
  /** Namespaces <defs> ids; defaults to "tm" so it never clashes with the poster's "pp". */
  idPrefix?: string;
}

/**
 * Pure SVG trip-map renderer — no hooks, so it is server-renderable and can be
 * handed straight to the shared `exportSvg`/`exportPng` pipeline. The root is an
 * <svg> with a viewBox (export reads it for sizing) and every label uses
 * var(--font-inter) so the font embeds in a standalone export.
 */
export function TripMap({
  stops,
  points,
  landPath,
  legs,
  width = TRIP_W,
  height = TRIP_H,
  title = null,
  idPrefix = "tm",
}: TripMapProps) {
  const dots = `${idPrefix}-dots`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? "Trip map"}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id={dots} width="9" height="9" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.15" fill={LAND} />
        </pattern>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill={PAPER} />

      {landPath && <path d={landPath} fill={`url(#${dots})`} fillRule="evenodd" />}

      {legs.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={ROUTE}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeOpacity={0.9}
        />
      ))}

      {points.map((p, i) => {
        const stop = stops[i];
        if (!stop) return null;
        const labelLeft = p.x > width * 0.82;
        return (
          <g key={stop.id}>
            <circle cx={p.x} cy={p.y} r={9} fill={MARKER} stroke={PAPER} strokeWidth={2} />
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={700}
              fill={MARKER_INK}
              style={FONT}
            >
              {i + 1}
            </text>
            <text
              x={labelLeft ? p.x - 15 : p.x + 15}
              y={p.y}
              textAnchor={labelLeft ? "end" : "start"}
              dominantBaseline="central"
              fontSize={15}
              fontWeight={600}
              fill={INK}
              style={FONT}
            >
              {stop.label}
            </text>
          </g>
        );
      })}

      {title && (
        <text
          x={width / 2}
          y={height - 26}
          textAnchor="middle"
          fontSize={22}
          fontWeight={600}
          letterSpacing="0.12em"
          fill={INK}
          style={FONT}
        >
          {title}
        </text>
      )}

      <rect
        x={14}
        y={14}
        width={width - 28}
        height={height - 28}
        fill="none"
        stroke={FRAME}
        strokeWidth={2}
      />
    </svg>
  );
}
