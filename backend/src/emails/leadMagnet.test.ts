import { describe, expect, it } from "vitest";
import { leadMagnetEmail } from "./leadMagnet.js";

// Pure template — no I/O. Covers the lead-magnet copy contract: must reference
// the download link + poster label, and must never call the free file
// "high-res" (it's deliberately screen-res; that's the upsell).

const input = {
  downloadUrl: "https://blob.example.com/posters/vintage-melbourne.png",
  posterLabel: "Vintage Cartography — Melbourne",
};

describe("leadMagnetEmail", () => {
  it("returns a non-empty subject, html, and text", () => {
    const { subject, html, text } = leadMagnetEmail(input);
    expect(subject).toBeTruthy();
    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
  });

  it("includes the download url and poster label in both html and text", () => {
    const { html, text } = leadMagnetEmail(input);
    expect(html).toContain(input.downloadUrl);
    expect(html).toContain(input.posterLabel);
    expect(text).toContain(input.downloadUrl);
    expect(text).toContain(input.posterLabel);
  });

  it('never says "high-res" or "high resolution" (case-insensitive) — the free file is screen-res', () => {
    const { html, text } = leadMagnetEmail(input);
    for (const content of [html.toLowerCase(), text.toLowerCase()]) {
      expect(content).not.toContain("high-res");
      expect(content).not.toContain("high res");
    }
  });
});
