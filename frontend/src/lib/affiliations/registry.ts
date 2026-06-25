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
  visited: { id: "visited", label: "Visited", verb: "Visited", color: "#3a6ea5" },
  family: { id: "family", label: "Family", verb: "Family in", color: "#c0504e" },
};

/** Stable display order for legends and selectors. */
export const AFFILIATION_ORDER: Affiliation[] = [
  "born",
  "lived",
  "visited",
  "family",
];
