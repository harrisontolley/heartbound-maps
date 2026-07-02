import { describe, expect, it } from "vitest";
import { digitalDeliveryEmail } from "./digitalDelivery.js";

// Pure template — no I/O. Covers: both framings (digital purchase vs. bundled
// free-with-print), per-item PNG/SVG links, the 30-day link note, and escaping
// of item labels/urls (order-derived data flows through here unsanitized).

const oneItemBoth = [
  {
    label: "16 × 24 in Vintage Cartography — Melbourne",
    pngUrl: "https://blob.example.com/posters/melbourne.png?sig=abc",
    svgUrl: "https://blob.example.com/posters/melbourne.svg?sig=def",
  },
];

describe("digitalDeliveryEmail", () => {
  it("returns a non-empty subject, html, and text", () => {
    const { subject, html, text } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: true });
    expect(subject).toBeTruthy();
    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
  });

  it('subject is exactly "Your Pinprint files are ready"', () => {
    const { subject } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: true });
    expect(subject).toBe("Your Pinprint files are ready");
  });

  it("includes the PNG and SVG links with their labels", () => {
    const { html, text } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: true });
    for (const content of [html, text]) {
      expect(content).toContain(oneItemBoth[0].pngUrl);
      expect(content).toContain(oneItemBoth[0].svgUrl);
      expect(content).toContain("PNG");
      expect(content).toContain("for screens and printing");
      expect(content).toContain("SVG");
      expect(content).toContain("vector source");
    }
  });

  it("calls the PNG full-resolution (this is the full-res product, not the free lead magnet)", () => {
    const { html, text } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: true });
    expect(html.toLowerCase()).toContain("full-resolution");
    expect(text.toLowerCase()).toContain("full-resolution");
  });

  it("notes the links are valid for 30 days", () => {
    const { html, text } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: true });
    expect(html).toMatch(/30 day/i);
    expect(text).toMatch(/30 day/i);
  });

  it("frames a digital-format order as the purchase itself", () => {
    const { html, text } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: true });
    for (const content of [html.toLowerCase(), text.toLowerCase()]) {
      expect(content).not.toContain("free with your print");
    }
  });

  it("frames a print order's digital files as bundled free with the print", () => {
    const { html, text } = digitalDeliveryEmail({ items: oneItemBoth, isDigitalOrder: false });
    for (const content of [html.toLowerCase(), text.toLowerCase()]) {
      expect(content).toContain("free");
    }
  });

  it("omits the SVG link when an item has no svgAssetUrl (no broken link)", () => {
    const items = [{ label: "12 × 18 in print", pngUrl: "https://blob.example.com/posters/x.png", svgUrl: null }];
    const { html, text } = digitalDeliveryEmail({ items, isDigitalOrder: false });
    expect(html).not.toContain("SVG");
    expect(text).not.toContain("SVG");
  });

  it("renders one row/section per item, each with its own label", () => {
    const items = [
      { label: "Item One", pngUrl: "https://blob.example.com/a.png", svgUrl: null },
      { label: "Item Two", pngUrl: "https://blob.example.com/b.png", svgUrl: "https://blob.example.com/b.svg" },
    ];
    const { html, text } = digitalDeliveryEmail({ items, isDigitalOrder: true });
    for (const content of [html, text]) {
      expect(content).toContain("Item One");
      expect(content).toContain("Item Two");
      expect(content).toContain("https://blob.example.com/a.png");
      expect(content).toContain("https://blob.example.com/b.png");
      expect(content).toContain("https://blob.example.com/b.svg");
    }
  });

  it("HTML-escapes an item label containing markup", () => {
    const items = [
      {
        label: `Mom & Dad's <script>alert(1)</script> "Trip"`,
        pngUrl: "https://blob.example.com/a.png",
        svgUrl: null,
      },
    ];
    const { html } = digitalDeliveryEmail({ items, isDigitalOrder: true });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Mom &amp; Dad&#39;s &lt;script&gt;alert(1)&lt;/script&gt; &quot;Trip&quot;");
  });

  it("HTML-escapes a signed URL containing an ampersand (query string)", () => {
    const items = [
      {
        label: "Item",
        pngUrl: "https://blob.example.com/a.png?a=1&b=2",
        svgUrl: null,
      },
    ];
    const { html } = digitalDeliveryEmail({ items, isDigitalOrder: true });
    expect(html).not.toContain('href="https://blob.example.com/a.png?a=1&b=2"');
    expect(html).toContain('href="https://blob.example.com/a.png?a=1&amp;b=2"');
  });

  it("leaves the plain-text version unescaped (not HTML, no injection surface)", () => {
    const items = [{ label: `Mom & Dad's Trip`, pngUrl: "https://blob.example.com/a.png?a=1&b=2", svgUrl: null }];
    const { text } = digitalDeliveryEmail({ items, isDigitalOrder: true });
    expect(text).toContain(`Mom & Dad's Trip`);
    expect(text).toContain("https://blob.example.com/a.png?a=1&b=2");
  });
});
