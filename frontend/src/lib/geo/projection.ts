import { toRad } from "./angle";

export type Vec2 = { x: number; y: number };

/**
 * Bearing → screen unit vector. North is UP, so y is negated.
 * 0°→(0,-1), 90°→(1,0), 180°→(0,1), 270°→(-1,0).
 */
export function bearingToVec(bearingDeg: number): Vec2 {
  const r = toRad(bearingDeg);
  return { x: Math.sin(r), y: -Math.cos(r) };
}
