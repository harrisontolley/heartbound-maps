import { describe, it, expect } from "vitest";
import { createMeasurer } from "./measure";
import { getTemplate } from "@/lib/templates/registry";
import type { Computed } from "@/lib/types";

const t = getTemplate("warm-minimal");
const item: Computed = {
  id: "x",
  label: "Paris",
  fullName: "Paris, France",
  lat: 48.8566,
  lng: 2.3522,
  affiliation: "visited",
  distanceKm: 1000,
  bearingDeg: 90,
};

describe("createMeasurer label height", () => {
  it("reserves two lines when distances are shown", () => {
    expect(createMeasurer(t, "km", true)(item).h).toBe(2 * t.lineHeight);
  });

  it("reserves a single line when distances are hidden", () => {
    expect(createMeasurer(t, "km", false)(item).h).toBe(t.lineHeight);
  });

  it("defaults to showing distances", () => {
    expect(createMeasurer(t, "km")(item).h).toBe(2 * t.lineHeight);
  });
});
