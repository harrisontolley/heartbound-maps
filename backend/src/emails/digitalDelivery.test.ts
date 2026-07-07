import { describe, expect, it } from "vitest";
import { digitalDeliveryEmail, type DigitalDeliveryEmailInput, type DigitalDeliveryItem } from "./digitalDelivery.js";

// Pure template — no I/O. Covers: both framings (digital purchase vs. bundled
// free-with-print), per-item PNG/SVG/bonus-wallpaper links, the coordinate
// story section, the hanging-guide link, the 30-day link note, and escaping
// of item labels/urls (order-derived data flows through here unsanitized).

/** Full item with every field defaulted to "absent" — override just what a test cares about. */
function item(overrides: Partial<DigitalDeliveryItem> = {}): DigitalDeliveryItem {
  return {
    label: "Item",
    pngUrl: null,
    svgUrl: null,
    phoneWallpaperUrl: null,
    desktopWallpaperUrl: null,
    story: null,
    ...overrides,
  };
}

function email(input: Partial<DigitalDeliveryEmailInput> & { items: DigitalDeliveryItem[] }) {
  return digitalDeliveryEmail({ isDigitalOrder: true, hangingGuideUrl: null, ...input });
}

const oneItemBoth = [
  item({
    label: "16 x 24 in Vintage Cartography, Melbourne",
    pngUrl: "https://blob.example.com/posters/melbourne.png?sig=abc",
    svgUrl: "https://blob.example.com/posters/melbourne.svg?sig=def",
  }),
];

describe("digitalDeliveryEmail", () => {
  it("returns a non-empty subject, html, and text", () => {
    const { subject, html, text } = email({ items: oneItemBoth });
    expect(subject).toBeTruthy();
    expect(html).toBeTruthy();
    expect(text).toBeTruthy();
  });

  it('subject is exactly "Your Pinprint files are ready"', () => {
    const { subject } = email({ items: oneItemBoth });
    expect(subject).toBe("Your Pinprint files are ready");
  });

  it("includes the PNG and SVG links with their labels", () => {
    const { html, text } = email({ items: oneItemBoth });
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
    const { html, text } = email({ items: oneItemBoth });
    expect(html.toLowerCase()).toContain("full-resolution");
    expect(text.toLowerCase()).toContain("full-resolution");
  });

  it("notes the links are valid for 30 days", () => {
    const { html, text } = email({ items: oneItemBoth });
    expect(html).toMatch(/30 day/i);
    expect(text).toMatch(/30 day/i);
  });

  it("frames a digital-format order as the purchase itself", () => {
    const { html, text } = email({ items: oneItemBoth, isDigitalOrder: true });
    for (const content of [html.toLowerCase(), text.toLowerCase()]) {
      expect(content).not.toContain("free with your print");
    }
  });

  it("frames a print order's digital files as bundled free with the print", () => {
    const { html, text } = email({ items: oneItemBoth, isDigitalOrder: false });
    for (const content of [html.toLowerCase(), text.toLowerCase()]) {
      expect(content).toContain("free");
    }
  });

  it("omits the SVG link when an item has no svgAssetUrl (no broken link)", () => {
    const items = [item({ label: "12 x 18 in print", pngUrl: "https://blob.example.com/posters/x.png" })];
    const { html, text } = email({ items, isDigitalOrder: false });
    expect(html).not.toContain("SVG");
    expect(text).not.toContain("SVG");
  });

  it("renders one row/section per item, each with its own label", () => {
    const items = [
      item({ label: "Item One", pngUrl: "https://blob.example.com/a.png" }),
      item({ label: "Item Two", pngUrl: "https://blob.example.com/b.png", svgUrl: "https://blob.example.com/b.svg" }),
    ];
    const { html, text } = email({ items });
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
      item({
        label: `Mom & Dad's <script>alert(1)</script> "Trip"`,
        pngUrl: "https://blob.example.com/a.png",
      }),
    ];
    const { html } = email({ items });
    expect(html).not.toContain("<script>");
    expect(html).toContain("Mom &amp; Dad&#39;s &lt;script&gt;alert(1)&lt;/script&gt; &quot;Trip&quot;");
  });

  it("HTML-escapes a signed URL containing an ampersand (query string)", () => {
    const items = [item({ label: "Item", pngUrl: "https://blob.example.com/a.png?a=1&b=2" })];
    const { html } = email({ items });
    expect(html).not.toContain('href="https://blob.example.com/a.png?a=1&b=2"');
    expect(html).toContain('href="https://blob.example.com/a.png?a=1&amp;b=2"');
  });

  it("leaves the plain-text version unescaped (not HTML, no injection surface)", () => {
    const items = [item({ label: `Mom & Dad's Trip`, pngUrl: "https://blob.example.com/a.png?a=1&b=2" })];
    const { text } = email({ items });
    expect(text).toContain(`Mom & Dad's Trip`);
    expect(text).toContain("https://blob.example.com/a.png?a=1&b=2");
  });

  describe("bonus wallpapers (Your bonuses section)", () => {
    it("renders the phone and desktop wallpaper links when present", () => {
      const items = [
        item({
          pngUrl: "https://blob.example.com/a.png",
          phoneWallpaperUrl: "https://blob.example.com/a-phone.png?sig=1",
          desktopWallpaperUrl: "https://blob.example.com/a-desktop.png?sig=2",
        }),
      ];
      const { html, text } = email({ items });
      for (const content of [html, text]) {
        expect(content).toContain("https://blob.example.com/a-phone.png?sig=1");
        expect(content).toContain("https://blob.example.com/a-desktop.png?sig=2");
        expect(content.toLowerCase()).toContain("phone wallpaper");
        expect(content.toLowerCase()).toContain("desktop wallpaper");
      }
    });

    it("omits the bonus section entirely when neither wallpaper is present (no broken links)", () => {
      const items = [item({ pngUrl: "https://blob.example.com/a.png" })];
      const { html, text } = email({ items });
      expect(html.toLowerCase()).not.toContain("wallpaper");
      expect(text.toLowerCase()).not.toContain("wallpaper");
    });

    it("renders only the phone link when the desktop upload failed", () => {
      const items = [
        item({
          pngUrl: "https://blob.example.com/a.png",
          phoneWallpaperUrl: "https://blob.example.com/a-phone.png",
        }),
      ];
      const { html, text } = email({ items });
      for (const content of [html, text]) {
        expect(content.toLowerCase()).toContain("phone wallpaper");
        expect(content.toLowerCase()).not.toContain("desktop wallpaper");
      }
    });
  });

  describe("coordinate story", () => {
    const story = {
      homeLabel: "Melbourne, Victoria, Australia",
      places: [
        { label: "Sydney", sentence: "Born in Sydney, 713 km to the northeast of home." },
        { label: "Cape Town", sentence: "Visited Cape Town, 10,332 km to the west of home." },
      ],
    };

    it("renders every place's sentence when a story is present", () => {
      const items = [item({ pngUrl: "https://blob.example.com/a.png", story })];
      const { html, text } = email({ items });
      for (const content of [html, text]) {
        expect(content).toContain("Born in Sydney, 713 km to the northeast of home.");
        expect(content).toContain("Visited Cape Town, 10,332 km to the west of home.");
      }
    });

    it("omits the story section entirely when absent (legacy order / malformed poster_config)", () => {
      const items = [item({ pngUrl: "https://blob.example.com/a.png", story: null })];
      const { html, text } = email({ items });
      expect(html.toLowerCase()).not.toContain("story behind your coordinates");
      expect(text.toLowerCase()).not.toContain("story behind your coordinates");
    });

    it("HTML-escapes a place sentence built from a user-edited label containing markup", () => {
      const items = [
        item({
          pngUrl: "https://blob.example.com/a.png",
          story: {
            homeLabel: "Home",
            places: [{ label: "<b>Evil</b>", sentence: "Born in <b>Evil</b>, 1 km to the north of home." }],
          },
        }),
      ];
      const { html } = email({ items });
      expect(html).not.toContain("<b>Evil</b>");
      expect(html).toContain("&lt;b&gt;Evil&lt;/b&gt;");
    });
  });

  describe("hanging guide link", () => {
    it("includes the hanging-guide link when configured", () => {
      const { html, text } = email({
        items: oneItemBoth,
        hangingGuideUrl: "https://pinprint.example.com/hanging-guide",
      });
      expect(html).toContain("https://pinprint.example.com/hanging-guide");
      expect(text).toContain("https://pinprint.example.com/hanging-guide");
    });

    it("gracefully omits the hanging-guide link when unconfigured (no broken link)", () => {
      const { html } = email({ items: oneItemBoth, hangingGuideUrl: null });
      expect(html).not.toContain("href=\"\"");
      expect(html).not.toContain("undefined");
      expect(html).not.toContain("null");
    });
  });

  it("copy contains no em/en dashes, no exclamation marks, and never the word poster", () => {
    const items = [
      item({
        pngUrl: "https://blob.example.com/a.png",
        svgUrl: "https://blob.example.com/a.svg",
        phoneWallpaperUrl: "https://blob.example.com/a-phone.png",
        desktopWallpaperUrl: "https://blob.example.com/a-desktop.png",
        story: {
          homeLabel: "Melbourne",
          places: [{ label: "Sydney", sentence: "Born in Sydney, 713 km to the northeast of home." }],
        },
      }),
    ];
    const { subject, html, text } = email({
      items,
      isDigitalOrder: false,
      hangingGuideUrl: "https://pinprint.example.com/hanging-guide",
    });
    // Strip the literal "<!doctype html>" markup boilerplate before checking
    // for "!" — the rule is about authored copy, not HTML syntax.
    for (const content of [subject, html.replace("<!doctype html>", ""), text]) {
      expect(content).not.toMatch(/[—–]/);
      expect(content).not.toMatch(/!/);
      expect(content.toLowerCase()).not.toContain("poster");
    }
  });
});
