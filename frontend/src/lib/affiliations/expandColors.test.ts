import { describe, expect, it } from "vitest";
import { expandAffiliationColors } from "./expandColors";
import { AFFILIATION_ORDER } from "./registry";

const CORE = {
  born: "#b08741",
  lived: "#7a8266",
  visited: "#6e7f86",
  family: "#a86a55",
};

describe("expandAffiliationColors", () => {
  it("covers every affiliation with a valid 6-digit hex", () => {
    const out = expandAffiliationColors(CORE);
    for (const a of AFFILIATION_ORDER) {
      expect(out[a]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("passes the four core colors through untouched", () => {
    const out = expandAffiliationColors(CORE);
    expect(out.born).toBe(CORE.born);
    expect(out.lived).toBe(CORE.lived);
    expect(out.visited).toBe(CORE.visited);
    expect(out.family).toBe(CORE.family);
  });

  it("is deterministic", () => {
    expect(expandAffiliationColors(CORE)).toEqual(expandAffiliationColors(CORE));
  });

  it("derives colors distinct from every core color and from each other", () => {
    const out = expandAffiliationColors(CORE);
    const all = AFFILIATION_ORDER.map((a) => out[a]);
    expect(new Set(all).size).toBe(all.length);
  });

  it("derived colors inherit the source's rough lightness band (stay usable on the same paper)", () => {
    const out = expandAffiliationColors(CORE);
    // studied comes from born, nudged darker — never lighter.
    const lum = (hex: string) =>
      parseInt(hex.slice(1, 3), 16) +
      parseInt(hex.slice(3, 5), 16) +
      parseInt(hex.slice(5, 7), 16);
    expect(lum(out.studied)).toBeLessThan(lum(CORE.born));
  });

  it("honors explicit overrides", () => {
    const out = expandAffiliationColors(CORE, { met: "#123456" });
    expect(out.met).toBe("#123456");
  });
});
