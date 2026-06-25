import { describe, it, expect } from "vitest";
import { computePlaces } from "./places";
import type { LatLng, Place } from "../types";

const HOME: LatLng = { lat: -27.4698, lng: 153.0251 };

function place(
  over: Partial<Place> & { id: string; lat: number; lng: number },
): Place {
  return { label: "X", fullName: "", affiliation: "visited", ...over };
}

describe("computePlaces", () => {
  it("computes distance and bearing for each place", () => {
    const out = computePlaces(HOME, [
      place({ id: "syd", lat: -33.8688, lng: 151.2093 }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].distanceKm).toBeGreaterThan(728);
    expect(out[0].distanceKm).toBeLessThan(736);
    expect(out[0].bearingDeg).toBeGreaterThan(191);
    expect(out[0].bearingDeg).toBeLessThan(195);
  });

  it("skips a place coincident with home", () => {
    const out = computePlaces(HOME, [
      place({ id: "here", lat: -27.4698, lng: 153.0251 }),
      place({ id: "syd", lat: -33.8688, lng: 151.2093 }),
    ]);
    expect(out.map((p) => p.id)).toEqual(["syd"]);
  });

  it("preserves place fields including affiliation", () => {
    const out = computePlaces(HOME, [
      place({
        id: "syd",
        lat: -33.8688,
        lng: 151.2093,
        affiliation: "born",
        label: "Sydney",
      }),
    ]);
    expect(out[0].affiliation).toBe("born");
    expect(out[0].label).toBe("Sydney");
  });
});
