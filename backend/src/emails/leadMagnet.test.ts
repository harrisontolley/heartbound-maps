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

  it("HTML-escapes a poster label containing markup/ampersands (interpolated user-derived data)", () => {
    const { html } = leadMagnetEmail({
      downloadUrl: input.downloadUrl,
      posterLabel: `Mom & Dad's <script>alert(1)</script> "Trip"`,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Mom &amp; Dad&#39;s &lt;script&gt;alert(1)&lt;/script&gt; &quot;Trip&quot;");
  });

  it("HTML-escapes a download URL containing an ampersand (query string)", () => {
    const { html } = leadMagnetEmail({
      downloadUrl: "https://blob.example.com/free/x.png?a=1&b=2",
      posterLabel: input.posterLabel,
    });
    expect(html).not.toContain('href="https://blob.example.com/free/x.png?a=1&b=2"');
    expect(html).toContain('href="https://blob.example.com/free/x.png?a=1&amp;b=2"');
  });

  it("leaves the plain-text version unescaped (not HTML, no injection surface)", () => {
    const { text } = leadMagnetEmail({
      downloadUrl: "https://blob.example.com/free/x.png?a=1&b=2",
      posterLabel: `Mom & Dad's Trip`,
    });
    expect(text).toContain("https://blob.example.com/free/x.png?a=1&b=2");
    expect(text).toContain("Mom & Dad's Trip");
  });
});
