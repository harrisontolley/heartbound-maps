const COMPASS16 = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
] as const;

export type Compass16 = (typeof COMPASS16)[number];

/** 16-point compass abbreviation for a bearing in degrees. */
export function compass16(bearingDeg: number): Compass16 {
  return COMPASS16[Math.round(bearingDeg / 22.5) % 16];
}
