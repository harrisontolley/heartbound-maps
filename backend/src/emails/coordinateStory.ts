import {
  compass16,
  fmtDistance,
  haversineKm,
  initialBearingDeg,
  rhumbBearingDeg,
  rhumbDistanceKm,
  type AccountUnits,
  type Compass16,
} from "@heartbound/shared";

// Builds the digital-delivery email's "story behind your coordinates" section
// from one order item's poster_config JSON snapshot (frontend/src/lib/commerce
// /posterConfig.ts's PosterConfigSnapshot, stored as untyped jsonb — so this
// reads it defensively rather than trusting the shape, and never throws). The
// geometry mirrors frontend/src/lib/geo/places.ts's computePlaces exactly:
// same bearing-mode switch, same "coincides with home" skip, so the
// distances/directions here always agree with what's drawn on the print.
//
// The per-affiliation verb phrases below are a small, intentional duplicate
// of the *text* (not colors/icons) in frontend/src/lib/affiliations/
// registry.ts — the backend has no dependency on the frontend app, and this
// is the first consumer of that copy outside the studio UI.

const AFFILIATION_VERBS: Record<string, string> = {
  born: "Born in",
  lived: "Lived in",
  studied: "Studied in",
  met: "Met in",
  married: "Married in",
  family: "Family in",
  visited: "Visited",
  adventure: "Adventure in",
};
const DEFAULT_VERB = "Connected to";

// Full compass-point names read warmer in prose than the 16-point
// abbreviation (matches frontend/src/lib/geo/compass.ts's sector order).
const COMPASS_WORDS: Record<Compass16, string> = {
  N: "north",
  NNE: "north-northeast",
  NE: "northeast",
  ENE: "east-northeast",
  E: "east",
  ESE: "east-southeast",
  SE: "southeast",
  SSE: "south-southeast",
  S: "south",
  SSW: "south-southwest",
  SW: "southwest",
  WSW: "west-southwest",
  W: "west",
  WNW: "west-northwest",
  NW: "northwest",
  NNW: "north-northwest",
};

/** A place isn't a meaningful "story" beat if it's within this of home. */
const MIN_KM = 1;

export type CoordinateStoryPlace = {
  label: string;
  /** Fully composed prose sentence, e.g. "Born in Sydney, 732 km to the south-southwest of home." */
  sentence: string;
};

export type CoordinateStory = {
  homeLabel: string;
  places: CoordinateStoryPlace[];
};

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function parsePoint(v: unknown): { lat: number; lng: number } | null {
  if (typeof v !== "object" || v === null) return null;
  const p = v as { lat?: unknown; lng?: unknown };
  if (!isFiniteNumber(p.lat) || !isFiniteNumber(p.lng)) return null;
  return { lat: p.lat, lng: p.lng };
}

function parseLabel(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function parseUnits(v: unknown): AccountUnits {
  return v === "mi" ? "mi" : "km";
}

function parseBearingMode(v: unknown): "great-circle" | "rhumb" {
  return v === "rhumb" ? "rhumb" : "great-circle";
}

/**
 * Build the coordinate story for one order item's poster_config, or null
 * when the snapshot doesn't have a usable home plus at least one distinct
 * place (a legacy order that predates this snapshot shape, or malformed
 * data) — the caller then simply omits the section for that item.
 */
export function buildCoordinateStory(posterConfig: unknown): CoordinateStory | null {
  if (typeof posterConfig !== "object" || posterConfig === null) return null;
  const cfg = posterConfig as Record<string, unknown>;

  const home = parsePoint(cfg.home);
  const homeLabel = parseLabel((cfg.home as { label?: unknown } | undefined)?.label);
  if (!home || !homeLabel) return null;

  const rawPlaces = Array.isArray(cfg.places) ? cfg.places : [];
  const units = parseUnits(cfg.units);
  const mode = parseBearingMode(cfg.bearingMode);

  const places: CoordinateStoryPlace[] = [];
  for (const raw of rawPlaces) {
    if (typeof raw !== "object" || raw === null) continue;
    const r = raw as { label?: unknown; affiliation?: unknown };
    const point = parsePoint(r);
    const label = parseLabel(r.label);
    if (!point || !label) continue;
    if (haversineKm(home, point) < MIN_KM) continue;

    const distanceKm = mode === "rhumb" ? rhumbDistanceKm(home, point) : haversineKm(home, point);
    const bearingDeg = mode === "rhumb" ? rhumbBearingDeg(home, point) : initialBearingDeg(home, point);
    const verb =
      (typeof r.affiliation === "string" && AFFILIATION_VERBS[r.affiliation]) || DEFAULT_VERB;
    const compassWord = COMPASS_WORDS[compass16(bearingDeg)];
    const distance = fmtDistance(distanceKm, units);

    places.push({
      label,
      sentence: `${verb} ${label}, ${distance} to the ${compassWord} of home.`,
    });
  }

  if (places.length === 0) return null;
  return { homeLabel, places };
}
