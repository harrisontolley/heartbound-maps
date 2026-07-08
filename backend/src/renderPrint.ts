import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { PRODUCTS_BASE_BY_ID, type Orientation } from "@heartbound/shared";
import { putPrivatePng, signAssetUrl } from "./blob.js";
import { setRenderAssetUrl } from "./orders.js";

// Server-side 300-DPI print rasterization. Orders carry the browser's serialized
// poster SVG (order_items.svg_asset_url); at fulfilment time we render that SVG to
// an exact print-resolution PNG here rather than shipping the browser's canvas
// raster (capped at 7000px → only ~194 DPI on a 24×36). See the spike report and
// docs/integrations/artelo.md.
//
// All three preprocessing transforms below are lifted verbatim from the proven
// spike (REPORT.md); resvg cannot resolve CSS var(), load @font-face, or honour
// font-variant: small-caps, so we bake each into the markup before handing it over.

const PRINT_DPI = 300;
const SMALLCAP_RATIO = 0.78;

/**
 * next/font keeps real family names, so we match on the CSS variable *name* (not
 * its declared value) and swap in the concrete family of the vendored TTFs. Stable
 * across next/font hashing. Keep in sync with the fonts under backend/assets/fonts.
 */
const FONT_VAR_MAP: Record<string, string> = {
  "--font-playfair": "Playfair Display",
  "--font-garamond": "EB Garamond",
  "--font-inter": "Inter",
  "--font-archivo": "Archivo",
  "--font-jetbrains-mono": "JetBrains Mono",
  "--font-fraunces": "Fraunces",
  "--font-space-grotesk": "Space Grotesk",
};

/**
 * Emulate `font-variant: small-caps` (resvg renders it as plain lowercase). Each
 * such <text> is a single run: drop the declaration and wrap every lowercase run
 * in a 0.78×-sized uppercase tspan. Verified against Chromium's true smcp in the
 * spike. (Higher-fidelity option later: bake `smcp` into a font instance.)
 */
export function emulateSmallCaps(svg: string): string {
  return svg.replace(
    /(<text\b[^>]*small-caps[^>]*>)([^<]*)(<\/text>)/g,
    (_m, open: string, content: string, close: string) => {
      const sizeMatch = open.match(/font-size="([\d.]+)"/);
      const size = sizeMatch ? parseFloat(sizeMatch[1]) : 16;
      const small = (size * SMALLCAP_RATIO).toFixed(2);
      const cleaned = open.replace(/font-variant:\s*small-caps;?\s*/, "");
      // Text content is XML-escaped ("Emma & Jake" → "Emma &amp; Jake"), so the
      // lowercase-run regex below must never reach inside an entity — wrapping
      // "amp" out of "&amp;" in a <tspan> breaks the entity and produces invalid
      // XML, which throws in the Resvg constructor (every ampersand-titled order
      // on a small-caps template would otherwise silently degrade to the
      // low-DPI client PNG fallback). Split on entities first and only touch the
      // plain-text pieces between them.
      const body = content
        .split(/(&[a-zA-Z]+;|&#\d+;)/)
        .map((piece) =>
          /^(?:&[a-zA-Z]+;|&#\d+;)$/.test(piece)
            ? piece
            : piece.replace(
                /\p{Ll}+/gu,
                (run) => `<tspan font-size="${small}">${run.toUpperCase()}</tspan>`,
              ),
        )
        .join("");
      return cleaned + body + close;
    },
  );
}

/**
 * Prepare a client-serialized poster SVG for resvg. Pure string transform, exactly
 * the spike's three steps in order:
 *  1. Strip the embedded <style> block (base64-woff2 @font-face + svg{--font-*}
 *     vars) — resvg can't parse woff2 data-URIs and it's ~1.6 MB of dead weight.
 *  2. Substitute var(--font-*) with concrete family names (resvg has no var()).
 *  3. Emulate small-caps.
 */
export function preprocessPosterSvg(svg: string): string {
  let out = svg.replace(/<style>[\s\S]*?<\/style>/, "");
  for (const [v, family] of Object.entries(FONT_VAR_MAP)) {
    out = out.replaceAll(`var(${v})`, `'${family}'`);
  }
  out = emulateSmallCaps(out);
  return out;
}

/** Physical print size (inches) for a product id, or null if we don't fulfil it. */
export function physicalInches(productId: string): { widthIn: number; heightIn: number } | null {
  const p = PRODUCTS_BASE_BY_ID[productId];
  if (!p) return null;
  return { widthIn: p.widthIn, heightIn: p.heightIn };
}

/**
 * Target raster dimensions for a product at 300 DPI, e.g. portrait-24x36 →
 * 7200×10800, portrait-12x18 → 3600×5400. `orientation` is accepted for callers
 * that pass it but the catalogue already encodes width/height per product id.
 */
export function targetPixels(
  productId: string,
  _orientation?: Orientation,
): { w: number; h: number } {
  const inch = physicalInches(productId);
  if (!inch) throw new Error(`targetPixels: unknown product ${productId}`);
  return { w: inch.widthIn * PRINT_DPI, h: inch.heightIn * PRINT_DPI };
}

// ── Font resolution (works in dev/tsx, vitest, and the built dist/ on Vercel) ──
// backend/assets/fonts sits one level above both src/ (dev + tests) and dist/
// (prod build, rootDir:src → dist), so the module-relative resolve lands there
// in both. The `new URL("...", import.meta.url)` literal is ALSO load-bearing
// for deployment: @vercel/nft statically detects this exact pattern and emits
// the referenced directory as a function asset — that's what gets the TTFs
// bundled with the Vercel function (a bare runtime readdir would be invisible
// to file tracing). If a bundler ever relocates the module, the cwd-based
// candidates below are the fallback. /health/integrations reports the count.
const MODULE_FONTS_DIR = new URL("../assets/fonts/", import.meta.url);

function candidateFontDirs(): string[] {
  const dirs = [
    fileURLToPath(MODULE_FONTS_DIR),
    path.join(process.cwd(), "assets", "fonts"),
    path.join(process.cwd(), "backend", "assets", "fonts"),
  ];
  return [...new Set(dirs)];
}

let cachedFontFiles: string[] | null = null;

/** Absolute paths of every vendored TTF (cached). Empty if no dir is readable. */
export function fontFiles(): string[] {
  if (cachedFontFiles) return cachedFontFiles;
  for (const dir of candidateFontDirs()) {
    const files: string[] = [];
    try {
      for (const dirent of readdirSync(dir, { withFileTypes: true })) {
        if (!dirent.isDirectory()) continue;
        const sub = path.join(dir, dirent.name);
        for (const f of readdirSync(sub)) {
          if (f.endsWith(".ttf")) files.push(path.join(sub, f));
        }
      }
    } catch {
      continue; // candidate absent — try the next
    }
    if (files.length > 0) {
      cachedFontFiles = files;
      return files;
    }
  }
  console.error("[renderPrint] no font directory found — print renders will lack fonts");
  cachedFontFiles = [];
  return [];
}

/**
 * Rasterize a *preprocessed* poster SVG to a PNG buffer at the given pixel width.
 * fitTo width drives the raster size (the SVG's 2:3 viewBox supplies the height).
 *
 * WARNING (resvg-js 2.6.2): an unknown key anywhere inside the options object
 * makes resvg silently discard the ENTIRE options object — including fitTo — and
 * render at the SVG's intrinsic size with system-font fallback. Do not add option
 * keys speculatively. `fontBuffers` in particular does NOT exist in this version
 * (it's wasm/newer only); use `fontFiles` (paths) as below.
 *
 * CRITICAL (verified empirically): with `loadSystemFonts:false` and an empty
 * `fontFiles`, resvg 2.6.2 does NOT throw — it renders every `<text>` as nothing
 * and hands back a perfectly valid PNG at the requested size. If font bundling
 * ever silently fails (e.g. a Vercel packaging regression), that would upload a
 * textless 7200×10800 print, persist it to `render_asset_url` (poisoning the
 * idempotent-reuse path forever), pass the DPI floor, and ship a poster with no
 * title/labels. So: refuse outright when the resolved font list is empty, rather
 * than trusting resvg to fail loudly. The thrown error propagates to
 * ensurePrintAsset's catch, which falls back to the browser-rendered client PNG.
 * `resolveFontFiles` is overridable so tests can exercise this guard without
 * touching the real font directory.
 */
export async function renderPrintPng(
  svg: string,
  opts: { widthPx: number; heightPx: number },
  resolveFontFiles: () => string[] = fontFiles,
): Promise<Buffer> {
  const files = resolveFontFiles();
  if (files.length === 0) {
    throw new Error(
      "renderPrintPng: no vendored fonts resolved — refusing a textless server render " +
        "(ensurePrintAsset will fall back to the client PNG)",
    );
  }
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: opts.widthPx },
    font: { loadSystemFonts: false, fontFiles: files },
  });
  return resvg.render().asPng();
}

// ── ensurePrintAsset: choose the print-ready asset for a fulfilment line ──────

/** One print line item's asset state, as fulfilment loads it. */
export type PrintAssetItem = {
  orderItemId: string;
  orderNumber: string;
  index: number;
  productId: string;
  clientAssetUrl: string | null;
  svgAssetUrl: string | null;
  renderAssetUrl: string | null;
};

export type EnsuredAsset = { url: string; source: "server" | "client" };

/** Collaborators, injectable so tests never rasterize or hit blob/network. */
export type EnsurePrintAssetDeps = {
  signUrl: (url: string) => Promise<string>;
  fetchSvg: (signedUrl: string) => Promise<string | null>;
  render: (svg: string, opts: { widthPx: number; heightPx: number }) => Promise<Buffer>;
  upload: (pathname: string, png: Buffer) => Promise<string | null>;
  persist: (orderItemId: string, url: string) => Promise<void>;
};

async function defaultFetchSvg(signedUrl: string): Promise<string | null> {
  const res = await fetch(signedUrl);
  if (!res.ok) return null;
  return res.text();
}

function defaultDeps(): EnsurePrintAssetDeps {
  return {
    signUrl: (url) => signAssetUrl(url),
    fetchSvg: defaultFetchSvg,
    render: renderPrintPng,
    upload: putPrivatePng,
    persist: setRenderAssetUrl,
  };
}

/**
 * Resolve the print-ready asset for one line item, preferring an exact-DPI
 * server render:
 *   • render_asset_url already set → reuse it (idempotent; a re-run/reprint never
 *     re-rasterizes).
 *   • else, with an SVG on file → sign it, fetch, preprocess, render at the
 *     product's 300-DPI target, upload privately under posters/, persist
 *     render_asset_url, return {source:"server"}.
 *   • any failure (no SVG, unknown product, fetch/render/upload error) → fall
 *     back to the browser PNG {source:"client"} — or null if there's none.
 * Never throws.
 */
export async function ensurePrintAsset(
  item: PrintAssetItem,
  deps: EnsurePrintAssetDeps = defaultDeps(),
): Promise<EnsuredAsset | null> {
  const fallback = (): EnsuredAsset | null =>
    item.clientAssetUrl ? { url: item.clientAssetUrl, source: "client" } : null;

  if (item.renderAssetUrl) return { url: item.renderAssetUrl, source: "server" };
  if (!item.svgAssetUrl) return fallback();

  try {
    const dims = targetPixels(item.productId); // throws on unknown product → fallback
    const signed = await deps.signUrl(item.svgAssetUrl);
    const rawSvg = await deps.fetchSvg(signed);
    if (!rawSvg) return fallback();
    const png = await deps.render(preprocessPosterSvg(rawSvg), {
      widthPx: dims.w,
      heightPx: dims.h,
    });
    const pathname = `posters/print-${item.orderNumber}-${item.index}.png`;
    const url = await deps.upload(pathname, png);
    if (!url) return fallback();
    await deps.persist(item.orderItemId, url).catch((err) => {
      console.error("[renderPrint] persist render_asset_url failed", err);
    });
    return { url, source: "server" };
  } catch (err) {
    console.error("[renderPrint] ensurePrintAsset render failed", err);
    return fallback();
  }
}
