import { describe, expect, it } from "vitest";
import { GLOBE_POV_ALTITUDE, homePov } from "./pov";

describe("homePov", () => {
  it("passes mid-latitude homes through unchanged", () => {
    expect(homePov({ lat: 43.65, lng: -79.38 })).toEqual({
      lat: 43.65,
      lng: -79.38,
      altitude: GLOBE_POV_ALTITUDE,
    });
  });

  it("clamps far-northern homes to 70°N so the pole doesn't fill the frame", () => {
    expect(homePov({ lat: 89, lng: 10 }).lat).toBe(70);
    expect(homePov({ lat: 70.01, lng: 10 }).lat).toBe(70);
  });

  it("clamps far-southern homes to 55°S", () => {
    expect(homePov({ lat: -80, lng: 170 }).lat).toBe(-55);
  });

  it("never touches longitude", () => {
    expect(homePov({ lat: 89, lng: -179.9 }).lng).toBe(-179.9);
    expect(homePov({ lat: -89, lng: 179.9 }).lng).toBe(179.9);
  });
});
