import { describe, expect, it } from "vitest";
import { metadata } from "./page";

describe("studio page metadata", () => {
  it("targets its own canonical instead of inheriting the homepage's", () => {
    expect(metadata.alternates?.canonical).toBe("/studio");
  });

  it("carries a keyworded title and share tags", () => {
    expect(String(metadata.title)).toMatch(/custom map print/i);
    expect(metadata.description).toBeTruthy();
    expect(metadata.openGraph?.url).toBe("/studio");
    expect((metadata.twitter as { card?: string })?.card).toBe(
      "summary_large_image",
    );
  });
});
