/**
 * Generates the landing-page poster images from the real poster engine.
 *
 * For each preset (src/lib/showcase/presets.ts) it drives the dev-only
 * `/render/[slug]` route in headless Chromium, waits for fonts + layout to
 * settle, reuses the in-page `serializePoster` + a copy of exportPng's canvas
 * rasterisation, and writes `public/showcase/<slug>.png` (and optionally .svg
 * with `--svg`).
 *
 *   pnpm --filter @pinprint/frontend render:posters            # spawns `next dev`
 *   RENDER_BASE_URL=http://localhost:3000 pnpm ... render:posters   # reuse a server
 *   pnpm --filter @pinprint/frontend render:posters --svg      # also emit SVGs
 *
 * This is on-demand asset generation — NOT part of `next build` or CI.
 */
import { chromium, type Browser } from "playwright";
import sharp from "sharp";
import { spawn, type ChildProcess } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { PRESETS } from "../src/lib/showcase/presets";

// pnpm runs package scripts with cwd at the package root (frontend/).
const FRONTEND_DIR = process.cwd();
const OUT_DIR = path.resolve(FRONTEND_DIR, "public/showcase");
const SCALE = 2; // 1000x1500 -> 2000x3000
const EMIT_SVG = process.argv.includes("--svg");
const PROVIDED_BASE = process.env.RENDER_BASE_URL;

async function waitForServer(base: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(base, { method: "HEAD" });
      if (res.ok || res.status < 500) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server at ${base} did not become ready in time`);
}

async function startDevServer(): Promise<{ base: string; proc: ChildProcess }> {
  const port = 3100; // avoid clashing with a hand-run `pnpm dev` on :3000
  const base = `http://localhost:${port}`;
  console.log(`Starting \`next dev\` on ${base} …`);
  const proc = spawn("next", ["dev", "--port", String(port)], {
    cwd: FRONTEND_DIR,
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });
  await waitForServer(base);
  return { base, proc };
}

async function renderOne(
  browser: Browser,
  base: string,
  slug: string,
): Promise<{ png: Buffer; svg?: string }> {
  // The hero poster is rasterized standalone at native/near-native size in
  // the landing hero (see scripts/compose-scenes.ts), so it gets a higher
  // scale and skips palette quantization to avoid banding on the smooth
  // paper-tone gradient. Story prints also render at scale 3 (they're the
  // closest-viewed cards on the landing page) but stay palette-quantized.
  // Every other preset stays at the default scale — see the comment below
  // on why (noise-texture looks).
  const hiFi = slug === "hero-poster";
  const preset = PRESETS.find((p) => p.slug === slug);
  const scale = hiFi || preset?.slot === "story" ? 3 : SCALE; // 3: 1000x1500 -> 3000x4500

  const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
  try {
    await page.goto(`${base}/render/${slug}`, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-poster-ready="true"]', { timeout: 30_000 });
    // Small settle so the final font-driven layout pass is painted.
    await page.waitForTimeout(250);

    const { svg, pngDataUrl } = await page.evaluate(async (scale) => {
      const el = document.querySelector(
        '[data-poster-ready="true"] svg',
      ) as SVGSVGElement | null;
      if (!el) throw new Error("poster svg not found");
      const serialize = window.__serializePoster;
      if (!serialize) throw new Error("__serializePoster not exposed");

      const svgStr = await serialize(el);
      const url = URL.createObjectURL(
        new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" }),
      );
      try {
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = rej;
          i.src = url;
        });
        const vb = (el.getAttribute("viewBox") ?? "0 0 1000 1500")
          .split(/\s+/)
          .map(Number);
        const w = (vb[2] || 1000) * scale;
        const h = (vb[3] || 1500) * scale;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0, w, h);
        return { svg: svgStr, pngDataUrl: canvas.toDataURL("image/png") };
      } finally {
        URL.revokeObjectURL(url);
      }
    }, scale);

    const raw = Buffer.from(pngDataUrl.split(",")[1], "base64");
    // Palette-quantise: crushes the noise-texture posters (paper grain) from
    // ~8MB to a few hundred KB with no visible loss at landing-card sizes,
    // while flat templates stay crisp. The hero poster skips this (see
    // `hiFi` above) since it's blown up full-bleed in the landing hero and
    // quantization banding is visible there.
    const png = await sharp(raw)
      .png(
        hiFi
          ? { quality: 100, effort: 10, compressionLevel: 9 }
          : { palette: true, quality: 90, effort: 10, compressionLevel: 9 },
      )
      .toBuffer();
    return EMIT_SVG ? { png, svg } : { png };
  } finally {
    await page.close();
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  let proc: ChildProcess | undefined;
  let base = PROVIDED_BASE;
  if (!base) {
    const started = await startDevServer();
    base = started.base;
    proc = started.proc;
  } else {
    console.log(`Using existing server at ${base}`);
    await waitForServer(base);
  }

  const browser = await chromium.launch();
  try {
    for (const preset of PRESETS) {
      process.stdout.write(`Rendering ${preset.slug} … `);
      const { png, svg } = await renderOne(browser, base, preset.slug);
      await writeFile(path.join(OUT_DIR, `${preset.slug}.png`), png);
      if (svg) await writeFile(path.join(OUT_DIR, `${preset.slug}.svg`), svg);
      console.log(`ok (${(png.length / 1024).toFixed(0)} KB)`);
    }
  } finally {
    await browser.close();
    if (proc) proc.kill("SIGTERM");
  }

  console.log(`\nDone — ${PRESETS.length} posters written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
