import { describe, it, expect } from "vitest";
import { bearingToVec } from "./projection";

describe("bearingToVec", () => {
  it("maps north (0°) to up (0, -1)", () => {
    const v = bearingToVec(0);
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo(-1, 9);
  });

  it("maps east (90°) to right (1, 0)", () => {
    const v = bearingToVec(90);
    expect(v.x).toBeCloseTo(1, 9);
    expect(v.y).toBeCloseTo(0, 9);
  });

  it("maps south (180°) to down (0, 1)", () => {
    const v = bearingToVec(180);
    expect(v.x).toBeCloseTo(0, 9);
    expect(v.y).toBeCloseTo(1, 9);
  });

  it("maps west (270°) to left (-1, 0)", () => {
    const v = bearingToVec(270);
    expect(v.x).toBeCloseTo(-1, 9);
    expect(v.y).toBeCloseTo(0, 9);
  });

  it("maps NE (45°) to the up-right diagonal", () => {
    const v = bearingToVec(45);
    expect(v.x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(v.y).toBeCloseTo(-Math.SQRT1_2, 9);
  });

  it("produces a unit vector for arbitrary bearings", () => {
    const v = bearingToVec(37);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1, 9);
  });
});
