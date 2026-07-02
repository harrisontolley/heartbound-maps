import { describe, expect, it } from "vitest";
import { SCREEN_LONG_EDGE_PX, screenScale } from "./exportPng";

describe("screenScale", () => {
  it("scales a portrait viewBox so the long edge (height) lands at the cap", () => {
    // 1000×1500 → longest edge 1500 → 2000/1500 = 4/3 → 1333×2000.
    expect(screenScale(1000, 1500)).toBeCloseTo(4 / 3, 10);
  });

  it("scales a landscape viewBox so the long edge (width) lands at the cap", () => {
    expect(screenScale(1500, 1000)).toBeCloseTo(4 / 3, 10);
  });

  it("uses SCREEN_LONG_EDGE_PX as the default cap", () => {
    expect(screenScale(1000, 1500)).toBeCloseTo(SCREEN_LONG_EDGE_PX / 1500, 10);
  });

  it("never downscales — a viewBox already past the cap clamps to 1", () => {
    // Print-sized viewBox (3000×4500) is already well past the 2000px screen cap.
    expect(screenScale(3000, 4500)).toBe(1);
  });

  it("falls back to 1 for a degenerate (zero) viewBox instead of Infinity/NaN", () => {
    expect(screenScale(0, 0)).toBe(1);
  });

  it("honors a custom cap", () => {
    expect(screenScale(500, 500, 1000)).toBe(2);
  });
});
