import { describe, it, expect } from "vitest";
import { TEMPLATES, TEMPLATE_ORDER, getActiveTemplate } from "./registry";
import { AFFILIATION_ORDER } from "../affiliations";

describe("template registry", () => {
  it("lists every registered template exactly once", () => {
    const ids = Object.keys(TEMPLATES);
    expect(TEMPLATE_ORDER).toHaveLength(ids.length);
    expect(new Set(TEMPLATE_ORDER).size).toBe(TEMPLATE_ORDER.length);
    for (const id of TEMPLATE_ORDER) {
      expect(ids).toContain(id);
    }
  });

  it("each template resolves and is internally consistent", () => {
    for (const id of TEMPLATE_ORDER) {
      const spec = getActiveTemplate(id, "classic");
      expect(spec).toBeTruthy();
      // vintage-cartography resolves to a variant whose id stays the same.
      expect(spec.id).toBe(id);
      expect(spec.name.length).toBeGreaterThan(0);
      expect(spec.blurb.length).toBeGreaterThan(0);
    }
  });

  it("every template defines a color for all affiliations", () => {
    for (const id of TEMPLATE_ORDER) {
      const spec = TEMPLATES[id];
      for (const a of AFFILIATION_ORDER) {
        expect(spec.affiliationColors[a]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it("includes the four new designs", () => {
    for (const id of ["blueprint", "art-deco", "topographic", "constellation"] as const) {
      expect(TEMPLATE_ORDER).toContain(id);
    }
  });
});
