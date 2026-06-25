import { describe, it, expect } from "vitest";
import { fmtDistance } from "./format";

describe("fmtDistance", () => {
  it("formats km under 1000 exactly", () => {
    expect(fmtDistance(732, "km")).toBe("732 km");
  });

  it("converts km to miles", () => {
    expect(fmtDistance(732, "mi")).toBe("455 mi");
  });

  it("rounds large distances to the nearest 10 and groups thousands", () => {
    expect(fmtDistance(9203, "km")).toBe("9,200 km");
  });

  it("formats exactly 1000 km", () => {
    expect(fmtDistance(1000, "km")).toBe("1,000 km");
  });

  it("formats zero", () => {
    expect(fmtDistance(0, "km")).toBe("0 km");
  });
});
