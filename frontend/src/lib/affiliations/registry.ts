import type { Affiliation } from "../types";

export type AffiliationMeta = {
  id: Affiliation;
  /** Short label for chips/legend, e.g. "Born". */
  label: string;
  /** Phrase for tooltips / accessible descriptions, e.g. "Born in". */
  verb: string;
  /** Base semantic color. Each template overrides this to fit its palette. */
  color: string;
};

export const AFFILIATIONS: Record<Affiliation, AffiliationMeta> = {
  born: { id: "born", label: "Born", verb: "Born in", color: "#b07b2b" },
  lived: { id: "lived", label: "Lived", verb: "Lived in", color: "#3f7d5d" },
  studied: { id: "studied", label: "Studied", verb: "Studied in", color: "#8a6a2f" },
  met: { id: "met", label: "Met", verb: "Met in", color: "#7d5ba6" },
  married: { id: "married", label: "Married", verb: "Married in", color: "#b34a72" },
  family: { id: "family", label: "Family", verb: "Family in", color: "#c0504e" },
  visited: { id: "visited", label: "Visited", verb: "Visited", color: "#3a6ea5" },
  adventure: {
    id: "adventure",
    label: "Adventure",
    verb: "Adventure in",
    color: "#2f7d78",
  },
};

/**
 * Stable display order for legends and selectors — reads as a life arc
 * (where you began → the people → the journeys).
 */
export const AFFILIATION_ORDER: Affiliation[] = [
  "born",
  "lived",
  "studied",
  "met",
  "married",
  "family",
  "visited",
  "adventure",
];

/**
 * Picker grouping: life (born/lived/studied), people (met/married/family),
 * travel (visited/adventure). Indexes into AFFILIATION_ORDER where a thin
 * separator sits ABOVE the item.
 */
export const AFFILIATION_GROUP_STARTS: Affiliation[] = ["met", "visited"];
