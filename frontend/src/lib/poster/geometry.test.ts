import { describe, it, expect } from "vitest";
import {
  posterGeometry,
  POSTER_MARGIN,
  EST_LABEL_HALF,
  BOTTOM_BAND,
} from "./geometry";
import { POSTER_SIZES, POSTER_SIZE_ORDER } from "../templates/sizes";

describe("posterGeometry", () => {
  it("keeps the classic portrait framing unchanged", () => {
    const { cx, cy, maxRadius } = posterGeometry(1000, 1500);
    expect(cx).toBe(500);
    expect(cy).toBe(690);
    expect(maxRadius).toBe(330);
  });

  it("produces a usable, collision-safe frame for every size preset", () => {
    for (const id of POSTER_SIZE_ORDER) {
      const { width, height } = POSTER_SIZES[id];
      const { cx, cy, maxRadius } = posterGeometry(width, height);

      // A real compass fits.
      expect(maxRadius).toBeGreaterThan(0);

      // Tips + label overhang clear the reserved bottom text block...
      expect(cy + maxRadius + EST_LABEL_HALF).toBeLessThanOrEqual(
        height - BOTTOM_BAND + 0.001,
      );
      // ...and stay inside the side + top margins.
      expect(maxRadius).toBeLessThanOrEqual(cx - POSTER_MARGIN + 0.001);
      expect(cy - maxRadius).toBeGreaterThanOrEqual(
        POSTER_MARGIN + EST_LABEL_HALF - 0.001,
      );
    }
  });
});
