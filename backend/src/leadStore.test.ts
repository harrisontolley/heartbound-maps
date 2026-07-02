import { describe, expect, it } from "vitest";
import { hashPosterConfig } from "./leadStore.js";

// hashPosterConfig is the pure part of the lead-dedupe key (see leadStore.ts):
// it must be stable under key reordering (so re-serializing the same design
// always matches the same lead row) and change whenever the design itself
// changes, while ignoring fields that don't affect the artwork (e.g. units,
// productId) so a re-add-to-cart of the same design doesn't fork the lead.

const baseConfig = {
  templateId: "vintage-cartography",
  vintageVariant: "classic",
  home: { id: "h1", label: "Melbourne", lat: -37.8, lng: 144.9 },
  places: [{ id: "p1", label: "Sydney", lat: -33.8, lng: 151.2 }],
  customization: { title: "MELBOURNE", nameTransform: "uppercase" },
};

describe("hashPosterConfig", () => {
  it("is stable when object keys are reordered", () => {
    const reordered = {
      places: baseConfig.places,
      customization: baseConfig.customization,
      home: baseConfig.home,
      templateId: baseConfig.templateId,
      vintageVariant: baseConfig.vintageVariant,
    };
    expect(hashPosterConfig(baseConfig)).toBe(hashPosterConfig(reordered));
  });

  it("is stable when nested object keys are reordered", () => {
    const nestedReordered = {
      ...baseConfig,
      home: { lng: 144.9, lat: -37.8, label: "Melbourne", id: "h1" },
    };
    expect(hashPosterConfig(baseConfig)).toBe(hashPosterConfig(nestedReordered));
  });

  it("differs when places change", () => {
    const changed = {
      ...baseConfig,
      places: [{ id: "p2", label: "Perth", lat: -31.9, lng: 115.8 }],
    };
    expect(hashPosterConfig(baseConfig)).not.toBe(hashPosterConfig(changed));
  });

  it("differs when home changes", () => {
    const changed = { ...baseConfig, home: { ...baseConfig.home, label: "Sydney" } };
    expect(hashPosterConfig(baseConfig)).not.toBe(hashPosterConfig(changed));
  });

  it("ignores non-identity keys (productId, units, format, addFrame)", () => {
    const withExtras = {
      ...baseConfig,
      productId: "portrait-16x24",
      units: "mi",
      bearingMode: "great-circle",
      format: "print",
      addFrame: true,
    };
    expect(hashPosterConfig(baseConfig)).toBe(hashPosterConfig(withExtras));
  });

  it("produces a hex sha256 digest", () => {
    expect(hashPosterConfig(baseConfig)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("treats a missing identity key consistently with an absent field (not undefined-vs-missing)", () => {
    const noVariant: Record<string, unknown> = { ...baseConfig };
    delete noVariant.vintageVariant;
    const explicitUndefined = { ...baseConfig, vintageVariant: undefined };
    expect(hashPosterConfig(noVariant)).toBe(hashPosterConfig(explicitUndefined));
  });
});
