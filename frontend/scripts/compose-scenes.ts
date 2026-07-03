/**
 * Composites the real engine-rendered posters into the AI-generated lifestyle
 * scenes (scripts/scenes/*-raw.png, prompts in scripts/scenes/PROMPTS.md).
 *
 * Each scene was generated with the area inside its picture frame as solid
 * pure black. This script finds that black rectangle automatically, cover-fits
 * the poster PNG into it, seats it with a subtle inner shadow, and writes the
 * palette-quantised result to public/showcase/. The hero scene also yields the
 * 1200x630 OpenGraph card.
 *
 *   pnpm --filter @pinprint/frontend render:scenes
 *   COMPOSE_ONLY=scene-gift pnpm ... render:scenes   # comma-separated `out` names only
 *
 * Run AFTER `render:posters` (it consumes public/showcase/<poster>.png).
 * On-demand asset generation — NOT part of `next build` or CI.
 */
import sharp, { type Sharp } from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const FRONTEND_DIR = process.cwd();
const SCENES_DIR = path.resolve(FRONTEND_DIR, "scripts/scenes");
const OUT_DIR = path.resolve(FRONTEND_DIR, "public/showcase");

type Composite = {
  out: string;
  scene: string;
  /** Poster slug under public/showcase, or null for scenes used as-is. */
  poster: string | null;
  /**
   * Optional integer upscale applied to the scene BEFORE compositing. The
   * generator caps out around 1.5K wide; for full-bleed uses we lanczos the
   * scene up and then composite the native-resolution poster render, so the
   * artwork (the part eyes land on) stays pixel-crisp.
   */
  upscale?: number;
  /**
   * Optional fraction (of height) to shift the whole scene DOWN: the top edge
   * is extended with a mirrored, blurred strip of wall and the same amount is
   * cropped off the bottom, so dimensions stay identical. Used to seat the
   * framed poster on the page's visual midline; `object-position` can't do
   * this because the full-bleed hero has no vertical crop slack.
   */
  shiftDown?: number;
  /**
   * After compositing, crop the output to the frame's outer edge (for scenes
   * that are a product shot of a single frame on a plain white background).
   * The outer edge is found by walking outward from the black rect until the
   * white backdrop starts. Produces a standalone framed-print element whose
   * wall shadow is applied in CSS, not baked.
   */
  cropToFrame?: boolean;
  /**
   * Skip palette quantization on the final PNG. Use for outputs blown up
   * full-bleed (e.g. the hero print) where 256-color banding is visible on
   * smooth gradients; costs file size, which is fine off the critical path
   * since Next.js `<Image>` re-encodes to right-sized WebP/AVIF for delivery.
   */
  truecolor?: boolean;
};

const SCENES: Composite[] = [
  { out: "scene-hero", scene: "scene-hero-raw.png", poster: "hero-poster" },
  // Layered hero: frameless room backdrop + a standalone framed print that the
  // layout positions (so it centers against the copy on every viewport).
  { out: "scene-hero-bg", scene: "scene-hero-bg-raw.png", poster: null, upscale: 2 },
  {
    out: "framed-hero",
    scene: "frame-blank-raw.png",
    poster: "hero-poster",
    cropToFrame: true,
    // The oak shell is only ~660px wide in the raw; scale it up before the
    // native-resolution poster lands inside so the element stays crisp at
    // high DPR / browser zoom.
    upscale: 4,
    truecolor: true,
  },
  { out: "scene-gift", scene: "scene-gift-raw.png", poster: "story-the-honeymoon" },
  { out: "scene-craft", scene: "scene-craft-raw.png", poster: null },
];

/**
 * Bounding box of the frame's solid-black poster area. Scenes also contain
 * scattered dark pixels (shadows, book spines), so a plain black-pixel bbox
 * overshoots badly. Instead a pixel only counts when it sits inside a long
 * solid black run BOTH horizontally and vertically — true only inside a large
 * filled rectangle.
 */
async function findBlackRect(img: Sharp) {
  const { data, info } = await img
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const THRESH = 40;
  const isBlack = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return data[i] < THRESH && data[i + 1] < THRESH && data[i + 2] < THRESH;
  };

  const minRunX = Math.round(width * 0.1);
  const minRunY = Math.round(height * 0.1);

  // Mark pixels inside horizontal runs >= minRunX.
  const hMark = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    let runStart = -1;
    for (let x = 0; x <= width; x++) {
      const black = x < width && isBlack(x, y);
      if (black && runStart < 0) runStart = x;
      if (!black && runStart >= 0) {
        if (x - runStart >= minRunX) hMark.fill(1, y * width + runStart, y * width + x);
        runStart = -1;
      }
    }
  }
  // Intersect with vertical runs >= minRunY.
  let minX = width,
    minY = height,
    maxX = -1,
    maxY = -1;
  for (let x = 0; x < width; x++) {
    let runStart = -1;
    for (let y = 0; y <= height; y++) {
      const solid = y < height && hMark[y * width + x] === 1;
      if (solid && runStart < 0) runStart = y;
      if (!solid && runStart >= 0) {
        if (y - runStart >= minRunY) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (runStart < minY) minY = runStart;
          if (y - 1 > maxY) maxY = y - 1;
        }
        runStart = -1;
      }
    }
  }
  if (maxX < 0) throw new Error("no solid black rectangle found in scene");
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Subtle inner shadow so the print sits inside the frame instead of on it. */
function innerShadowSvg(w: number, h: number): Buffer {
  const inset = Math.max(3, Math.round(Math.min(w, h) * 0.012));
  return Buffer.from(
    `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="b" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="${inset}" />
        </filter>
      </defs>
      <rect x="${-inset}" y="${-inset}" width="${w + 2 * inset}" height="${h + 2 * inset}"
        rx="1" fill="none" stroke="#1f1409" stroke-width="${inset * 2.5}"
        stroke-opacity="0.55" filter="url(#b)" />
    </svg>`,
  );
}

/**
 * Outer boundary of the frame surrounding `rect` (the black print area): from
 * each side's midpoint, walk outward across the oak until the near-white studio
 * backdrop begins.
 */
async function frameOuterBounds(
  img: Sharp,
  rect: { left: number; top: number; width: number; height: number },
) {
  const { data, info } = await img
    .clone()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const WHITE = 235;
  const isWhite = (x: number, y: number) => {
    const i = (y * width + x) * channels;
    return data[i] > WHITE && data[i + 1] > WHITE && data[i + 2] > WHITE;
  };
  const midY = rect.top + Math.round(rect.height / 2);
  const midX = rect.left + Math.round(rect.width / 2);

  let left = rect.left;
  while (left > 0 && !isWhite(left - 1, midY)) left--;
  let right = rect.left + rect.width - 1;
  while (right < width - 1 && !isWhite(right + 1, midY)) right++;
  let top = rect.top;
  while (top > 0 && !isWhite(midX, top - 1)) top--;
  let bottom = rect.top + rect.height - 1;
  while (bottom < height - 1 && !isWhite(midX, bottom + 1)) bottom++;

  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function composeOne({
  out,
  scene,
  poster,
  upscale,
  shiftDown,
  cropToFrame,
  truecolor,
}: Composite) {
  const scenePath = path.join(SCENES_DIR, scene);
  let sceneBuf: Buffer = await readFile(scenePath);
  if (upscale && upscale > 1) {
    const meta = await sharp(sceneBuf).metadata();
    sceneBuf = await sharp(sceneBuf)
      .resize((meta.width ?? 0) * upscale, (meta.height ?? 0) * upscale, {
        kernel: "lanczos3",
      })
      .sharpen({ sigma: 0.8 })
      .toBuffer();
  }
  if (shiftDown && shiftDown > 0) {
    const meta = await sharp(sceneBuf).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    const pad = Math.round(h * shiftDown);
    // Mirrored strip of the top rows, flipped and softened, becomes the new
    // ceiling-side wall; the same height comes off the bottom.
    const topStrip = await sharp(sceneBuf)
      .extract({ left: 0, top: 0, width: w, height: pad })
      .flip()
      .blur(6)
      .toBuffer();
    const body = await sharp(sceneBuf)
      .extract({ left: 0, top: 0, width: w, height: h - pad })
      .toBuffer();
    sceneBuf = await sharp({
      create: { width: w, height: h, channels: 3, background: "#f0ead9" },
    })
      .composite([
        { input: topStrip, left: 0, top: 0 },
        { input: body, left: 0, top: pad },
      ])
      .png()
      .toBuffer();
  }
  const base = sharp(sceneBuf);

  let composed: Sharp;
  let frameBounds: Awaited<ReturnType<typeof frameOuterBounds>> | undefined;
  if (poster) {
    const rect = await findBlackRect(base);
    if (cropToFrame) frameBounds = await frameOuterBounds(base, rect);
    // Posters are 2:3 but the AI frames only approximate it. Near-ratio frames
    // get a stretch-to-fill (imperceptible under ~6%); wider frames get a
    // contain-fit padded with the poster's own paper color, which reads as the
    // artwork's margin rather than a crop that beheads the title block.
    const posterPath = path.join(OUT_DIR, `${poster}.png`);
    const target = 2 / 3;
    const actual = rect.width / rect.height;
    const nearRatio = Math.abs(actual - target) / target < 0.06;
    let posterBuf: Buffer;
    if (nearRatio) {
      posterBuf = await sharp(posterPath)
        .resize(rect.width, rect.height, { fit: "fill" })
        .toBuffer();
    } else {
      const { data } = await sharp(posterPath)
        .extract({ left: 4, top: 4, width: 1, height: 1 })
        .raw()
        .toBuffer({ resolveWithObject: true });
      const paper = { r: data[0], g: data[1], b: data[2], alpha: 1 };
      posterBuf = await sharp(posterPath)
        .resize(rect.width, rect.height, { fit: "contain", background: paper })
        .toBuffer();
    }
    composed = base.composite([
      { input: posterBuf, left: rect.left, top: rect.top },
      {
        input: await sharp(innerShadowSvg(rect.width, rect.height)).png().toBuffer(),
        left: rect.left,
        top: rect.top,
      },
    ]);
  } else {
    composed = base;
  }

  if (frameBounds) {
    composed = sharp(await composed.png().toBuffer()).extract(frameBounds);
  }

  const png = await composed
    .png(
      truecolor
        ? { quality: 100, effort: 10, compressionLevel: 9 }
        : { palette: true, quality: 90, effort: 10, compressionLevel: 9 },
    )
    .toBuffer();
  await writeFile(path.join(OUT_DIR, `${out}.png`), png);
  console.log(`${out}.png (${(png.length / 1024).toFixed(0)} KB)`);
  return png;
}

/** 1200x630 OG card: cover-crop of the finished hero scene. */
async function ogCard(heroPng: Buffer) {
  const png = await sharp(heroPng)
    .resize(1200, 630, { fit: "cover", position: "attention" })
    .png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 })
    .toBuffer();
  await writeFile(path.join(OUT_DIR, "og-card.png"), png);
  console.log(`og-card.png (${(png.length / 1024).toFixed(0)} KB)`);
}

// COMPOSE_ONLY=scene-gift limits a run to specific `out` names — handy when
// only one raw scene changed and re-compositing all of them isn't needed.
const ONLY = process.env.COMPOSE_ONLY?.split(",").map((s) => s.trim());

async function main() {
  const targets = ONLY ? SCENES.filter((c) => ONLY.includes(c.out)) : SCENES;
  let hero: Buffer | undefined;
  for (const c of targets) {
    const png = await composeOne(c);
    if (c.out === "scene-hero") hero = png;
  }
  if (hero) await ogCard(hero);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
