import { describe, it, expect } from "vitest";
import { compass16 } from "./compass";

describe("compass16", () => {
  it("maps the four cardinals", () => {
    expect(compass16(0)).toBe("N");
    expect(compass16(90)).toBe("E");
    expect(compass16(180)).toBe("S");
    expect(compass16(270)).toBe("W");
  });

  it("maps the Brisbane→Sydney bearing (~193°) to SSW", () => {
    expect(compass16(193.2)).toBe("SSW");
  });

  it("wraps 360° back to N", () => {
    expect(compass16(360)).toBe("N");
  });

  it("rounds to the nearest 16-point sector", () => {
    expect(compass16(22.5)).toBe("NNE");
    expect(compass16(348.75)).toBe("N"); // 15.5 → rounds to 16 → 0 → N
  });
});
