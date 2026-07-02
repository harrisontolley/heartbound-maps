import { describe, expect, it, vi } from "vitest";
import {
  emulateSmallCaps,
  ensurePrintAsset,
  physicalInches,
  preprocessPosterSvg,
  renderPrintPng,
  targetPixels,
  type EnsurePrintAssetDeps,
} from "./renderPrint.js";

// The three preprocessing transforms are the risky, resvg-specific part; each is a
// pure string in/out, tested on representative snippets taken from a real
// serialized poster SVG (spike svgs/). ensurePrintAsset is tested with all its
// collaborators injected so no test rasterizes or touches blob/network. One tiny
// real-resvg smoke test proves the pipeline actually produces a PNG.

describe("preprocessPosterSvg — (1) strip <style>", () => {
  it("removes the embedded @font-face/style block", () => {
    const svg =
      '<svg viewBox="0 0 1000 1500"><style>@font-face{font-family:Inter;src:url(data:font/woff2;base64,AAAA)}svg{--font-inter:Inter}</style><rect/></svg>';
    const out = preprocessPosterSvg(svg);
    expect(out).not.toContain("<style>");
    expect(out).not.toContain("@font-face");
    expect(out).not.toContain("base64");
    expect(out).toContain("<rect/>");
  });
});

describe("preprocessPosterSvg — (2) resolve var(--font-*)", () => {
  it("substitutes each font variable with its concrete family", () => {
    const svg =
      '<svg><style>x</style><text font-family="var(--font-garamond)">a</text><text font-family="var(--font-playfair)">b</text><text font-family="var(--font-archivo)">c</text></svg>';
    const out = preprocessPosterSvg(svg);
    expect(out).toContain(`font-family="'EB Garamond'"`);
    expect(out).toContain(`font-family="'Playfair Display'"`);
    expect(out).toContain(`font-family="'Archivo'"`);
    expect(out).not.toContain("var(--font");
  });

  it("resolves every mapped family name", () => {
    const vars = [
      "--font-inter",
      "--font-jetbrains-mono",
      "--font-fraunces",
      "--font-space-grotesk",
    ];
    const svg = `<svg><style>x</style>${vars
      .map((v) => `<text font-family="var(${v})">x</text>`)
      .join("")}</svg>`;
    const out = preprocessPosterSvg(svg);
    expect(out).not.toContain("var(--font");
    expect(out).toContain("'JetBrains Mono'");
    expect(out).toContain("'Space Grotesk'");
  });
});

describe("emulateSmallCaps — (3) small-caps → scaled uppercase tspans", () => {
  it("wraps lowercase runs in 0.78×-sized uppercase tspans and drops the declaration", () => {
    // Verbatim shape from a real vintage-cartography place label.
    const svg =
      '<text x="234" y="596" text-anchor="end" dominant-baseline="middle" font-family="var(--font-garamond)" font-size="31" font-weight="500" fill="#3a2d18" style="letter-spacing: 2.5px; font-variant: small-caps;">New York</text>';
    const out = emulateSmallCaps(svg);
    expect(out).not.toContain("small-caps");
    // "N" stays full size, "ew" becomes an uppercased 0.78×31 = 24.18 tspan.
    expect(out).toContain('<tspan font-size="24.18">EW</tspan>');
    expect(out).toContain('<tspan font-size="24.18">ORK</tspan>');
    expect(out).toContain(">N<tspan");
  });

  it("leaves text without small-caps untouched", () => {
    const svg = '<text font-size="20">Hello World</text>';
    expect(emulateSmallCaps(svg)).toBe(svg);
  });

  it("does not corrupt an XML entity (e.g. 'Emma &amp; Jake')", () => {
    const svg =
      '<text font-size="20" style="font-variant: small-caps;">Emma &amp; Jake</text>';
    const out = emulateSmallCaps(svg);
    // The entity itself must survive untouched — this is the load-bearing
    // assertion: matching "amp" out of "&amp;" would emit "&<tspan>AMP</tspan>;",
    // which is invalid XML and throws in the Resvg constructor.
    expect(out).toContain("&amp;");
    expect(out).not.toMatch(/&<tspan/);
    expect(out).not.toMatch(/tspan[^>]*>amp</i);
    // The lowercase runs either side of the entity are still wrapped.
    expect(out).toContain('<tspan font-size="15.60">MMA</tspan>');
    expect(out).toContain('<tspan font-size="15.60">AKE</tspan>');
  });

  it("does not corrupt a numeric XML entity (e.g. '&#233;')", () => {
    const svg = '<text font-size="20" style="font-variant: small-caps;">caf&#233;</text>';
    const out = emulateSmallCaps(svg);
    expect(out).toContain("&#233;");
    expect(out).not.toMatch(/&<tspan/);
    expect(out).toContain('<tspan font-size="15.60">CAF</tspan>');
  });

  it("is applied by preprocessPosterSvg end-to-end", () => {
    const svg =
      '<svg><style>x</style><text font-family="var(--font-garamond)" font-size="31" style="font-variant: small-caps;">paris</text></svg>';
    const out = preprocessPosterSvg(svg);
    expect(out).toContain("'EB Garamond'");
    expect(out).toContain('<tspan font-size="24.18">PARIS</tspan>');
    expect(out).not.toContain("small-caps");
  });
});

describe("targetPixels / physicalInches", () => {
  it("computes 300-DPI raster dims from the catalogue", () => {
    expect(targetPixels("portrait-24x36")).toEqual({ w: 7200, h: 10800 });
    expect(targetPixels("portrait-12x18")).toEqual({ w: 3600, h: 5400 });
    expect(targetPixels("portrait-16x24")).toEqual({ w: 4800, h: 7200 });
  });

  it("exposes physical inches, or null for an unknown product", () => {
    expect(physicalInches("portrait-24x36")).toEqual({ widthIn: 24, heightIn: 36 });
    expect(physicalInches("nope")).toBeNull();
  });

  it("throws on an unknown product (caught by ensurePrintAsset → fallback)", () => {
    expect(() => targetPixels("nope")).toThrow(/unknown product/);
  });
});

describe("ensurePrintAsset", () => {
  function deps(overrides: Partial<EnsurePrintAssetDeps> = {}): EnsurePrintAssetDeps {
    return {
      signUrl: vi.fn(async (u: string) => `${u}?sig`),
      fetchSvg: vi.fn(async () => "<svg><style>x</style><rect/></svg>"),
      render: vi.fn(async () => Buffer.from("PNGDATA")),
      upload: vi.fn(async () => "https://blob/posters/print-PP-1-0.png"),
      persist: vi.fn(async () => {}),
      ...overrides,
    };
  }

  const base = {
    orderItemId: "item-1",
    orderNumber: "PP-1",
    index: 0,
    productId: "portrait-24x36",
    clientAssetUrl: "https://blob/posters/client.png",
    svgAssetUrl: "https://blob/posters/design.svg",
    renderAssetUrl: null as string | null,
  };

  it("reuses an existing render_asset_url without re-rendering (idempotent)", async () => {
    const d = deps();
    const got = await ensurePrintAsset(
      { ...base, renderAssetUrl: "https://blob/posters/print-existing.png" },
      d,
    );
    expect(got).toEqual({ url: "https://blob/posters/print-existing.png", source: "server" });
    expect(d.render).not.toHaveBeenCalled();
    expect(d.upload).not.toHaveBeenCalled();
  });

  it("renders, uploads, persists and returns the server asset on the happy path", async () => {
    const d = deps();
    const got = await ensurePrintAsset({ ...base }, d);
    expect(got).toEqual({ url: "https://blob/posters/print-PP-1-0.png", source: "server" });
    expect(d.signUrl).toHaveBeenCalledWith("https://blob/posters/design.svg");
    // Rendered at the 24×36 300-DPI target.
    expect(d.render).toHaveBeenCalledWith(expect.any(String), { widthPx: 7200, heightPx: 10800 });
    expect(d.upload).toHaveBeenCalledWith("posters/print-PP-1-0.png", expect.any(Buffer));
    expect(d.persist).toHaveBeenCalledWith("item-1", "https://blob/posters/print-PP-1-0.png");
  });

  it("preprocesses the SVG before rendering (style stripped)", async () => {
    const rendered: string[] = [];
    const d = deps({
      render: vi.fn(async (svg: string) => {
        rendered.push(svg);
        return Buffer.from("x");
      }),
    });
    await ensurePrintAsset({ ...base }, d);
    expect(rendered[0]).not.toContain("<style>");
  });

  it("falls back to the client PNG when there is no SVG", async () => {
    const d = deps();
    const got = await ensurePrintAsset({ ...base, svgAssetUrl: null }, d);
    expect(got).toEqual({ url: "https://blob/posters/client.png", source: "client" });
    expect(d.render).not.toHaveBeenCalled();
  });

  it("falls back to the client PNG when rendering throws", async () => {
    const d = deps({
      render: vi.fn(async () => {
        throw new Error("resvg exploded");
      }),
    });
    const got = await ensurePrintAsset({ ...base }, d);
    expect(got).toEqual({ url: "https://blob/posters/client.png", source: "client" });
  });

  it("falls back when the SVG fetch returns nothing", async () => {
    const d = deps({ fetchSvg: vi.fn(async () => null) });
    const got = await ensurePrintAsset({ ...base }, d);
    expect(got).toEqual({ url: "https://blob/posters/client.png", source: "client" });
  });

  it("falls back when the upload fails", async () => {
    const d = deps({ upload: vi.fn(async () => null) });
    const got = await ensurePrintAsset({ ...base }, d);
    expect(got).toEqual({ url: "https://blob/posters/client.png", source: "client" });
  });

  it("returns null when there's no SVG and no client PNG to fall back to", async () => {
    const d = deps();
    const got = await ensurePrintAsset({ ...base, svgAssetUrl: null, clientAssetUrl: null }, d);
    expect(got).toBeNull();
  });
});

describe("fontFiles", () => {
  it("finds all 25 vendored TTFs relative to the module", async () => {
    const { fontFiles } = await import("./renderPrint.js");
    const files = fontFiles();
    expect(files).toHaveLength(25);
    expect(files.every((f) => f.endsWith(".ttf"))).toBe(true);
  });
});

describe("renderPrintPng — real resvg smoke test", () => {
  it("rasterizes a tiny SVG to a real PNG of the requested width", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect width="100" height="150" fill="#123"/></svg>';
    const png = await renderPrintPng(svg, { widthPx: 100, heightPx: 150 });
    // PNG magic bytes.
    expect([...png.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
    // IHDR width at offset 16 should be exactly the requested 100px.
    expect(png.readUInt32BE(16)).toBe(100);
    expect(png.readUInt32BE(20)).toBe(150);
  });
});

describe("renderPrintPng — zero-fonts guard (critical fix)", () => {
  // resvg-js 2.6.2 does NOT throw when given loadSystemFonts:false and an empty
  // fontFiles list — it silently renders every <text> as nothing and returns a
  // valid, textless PNG. Without an explicit guard that would ship a blank
  // 7200x10800 print and persist it as the reusable render_asset_url forever.
  it("throws instead of silently rasterizing without fonts", async () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><text x="10" y="10">Title</text></svg>';
    await expect(
      renderPrintPng(svg, { widthPx: 100, heightPx: 150 }, () => []),
    ).rejects.toThrow(/no vendored fonts resolved/);
  });

  it("propagates through ensurePrintAsset to the client-PNG fallback, persisting nothing", async () => {
    const d: EnsurePrintAssetDeps = {
      signUrl: vi.fn(async (u: string) => `${u}?sig`),
      fetchSvg: vi.fn(async () => "<svg><style>x</style><text>Title</text></svg>"),
      // Wire the real renderPrintPng through, with its font resolver forced empty —
      // this is the actual guarded code path, not just a generic render failure.
      render: (svg, opts) => renderPrintPng(svg, opts, () => []),
      upload: vi.fn(async () => "https://blob/posters/print-PP-1-0.png"),
      persist: vi.fn(async () => {}),
    };
    const got = await ensurePrintAsset(
      {
        orderItemId: "item-1",
        orderNumber: "PP-1",
        index: 0,
        productId: "portrait-24x36",
        clientAssetUrl: "https://blob/posters/client.png",
        svgAssetUrl: "https://blob/posters/design.svg",
        renderAssetUrl: null,
      },
      d,
    );
    expect(got).toEqual({ url: "https://blob/posters/client.png", source: "client" });
    expect(d.upload).not.toHaveBeenCalled();
    expect(d.persist).not.toHaveBeenCalled();
  });
});
