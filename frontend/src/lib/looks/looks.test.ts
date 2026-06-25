import { describe, it, expect } from "vitest";
import {
  LOOKS,
  LOOK_ORDER,
  LOOKS_BY_ID,
  DEFAULT_LOOK_ID,
  activeLookId,
} from "./looks";

describe("looks registry", () => {
  it("exposes six featured looks, in order", () => {
    expect(LOOKS).toHaveLength(6);
    expect(LOOK_ORDER).toHaveLength(6);
    expect(LOOK_ORDER).toEqual(LOOKS.map((l) => l.id));
  });

  it("indexes every look by id", () => {
    for (const look of LOOKS) {
      expect(LOOKS_BY_ID[look.id]).toBe(look);
    }
  });

  it("defaults to a real look", () => {
    expect(LOOKS_BY_ID[DEFAULT_LOOK_ID]).toBeDefined();
    expect(DEFAULT_LOOK_ID).toBe("heirloom");
  });
});

describe("activeLookId", () => {
  it("maps the vintage classic variant to Heirloom", () => {
    expect(activeLookId("vintage-cartography", "classic")).toBe("heirloom");
  });

  it("maps non-vintage templates regardless of variant", () => {
    expect(activeLookId("night-sky", "classic")).toBe("nightfall");
    expect(activeLookId("night-sky", "explorer")).toBe("nightfall");
    expect(activeLookId("topographic", "classic")).toBe("field-map");
    expect(activeLookId("minimal-compass", "classic")).toBe("minimal");
  });

  it("returns null when the selection lives only under Advanced", () => {
    // Non-featured templates.
    expect(activeLookId("art-deco", "classic")).toBeNull();
    expect(activeLookId("constellation", "classic")).toBeNull();
    // A non-classic vintage variant is off the featured rails.
    expect(activeLookId("vintage-cartography", "explorer")).toBeNull();
    expect(activeLookId("vintage-cartography", "atlas")).toBeNull();
  });
});
