import { describe, it, expect } from "vitest";
import {
  LOOKS,
  LOOK_ORDER,
  LOOKS_BY_ID,
  DEFAULT_LOOK_ID,
  activeLookId,
} from "./looks";

describe("looks registry", () => {
  it("exposes the featured looks, in order, trend looks first", () => {
    expect(LOOKS).toHaveLength(9);
    expect(LOOK_ORDER).toHaveLength(9);
    expect(LOOK_ORDER).toEqual(LOOKS.map((l) => l.id));
    expect(LOOK_ORDER.slice(0, 4)).toEqual([
      "warm-minimal",
      "mid-century",
      "swiss",
      "celestial",
    ]);
  });

  it("indexes every look by id", () => {
    for (const look of LOOKS) {
      expect(LOOKS_BY_ID[look.id]).toBe(look);
    }
  });

  it("defaults to the flagship warm-minimal look", () => {
    expect(LOOKS_BY_ID[DEFAULT_LOOK_ID]).toBeDefined();
    expect(DEFAULT_LOOK_ID).toBe("warm-minimal");
  });
});

describe("activeLookId", () => {
  it("returns null for the vintage classic variant (heirloom look retired)", () => {
    expect(activeLookId("vintage-cartography", "classic")).toBeNull();
  });

  it("maps non-vintage templates regardless of variant", () => {
    expect(activeLookId("night-sky", "classic")).toBe("nightfall");
    expect(activeLookId("night-sky", "explorer")).toBe("nightfall");
    expect(activeLookId("topographic", "classic")).toBe("field-map");
    expect(activeLookId("minimal-compass", "classic")).toBe("minimal");
  });

  it("maps the trend templates to their looks", () => {
    expect(activeLookId("warm-minimal", "classic")).toBe("warm-minimal");
    expect(activeLookId("mid-century", "classic")).toBe("mid-century");
    expect(activeLookId("swiss-editorial", "classic")).toBe("swiss");
    expect(activeLookId("celestial", "classic")).toBe("celestial");
  });

  it("returns null when the selection lives only under Advanced", () => {
    // A non-classic vintage variant is off the featured rails.
    expect(activeLookId("vintage-cartography", "explorer")).toBeNull();
    expect(activeLookId("vintage-cartography", "atlas")).toBeNull();
  });
});
