/**
 * Visual QA harness for the label-placement engine.
 *
 * Renders the named regression cases (the reported real-world failures) plus
 * optional stress seeds through the REAL pipeline (computePlaces → computeLayout
 * → <Poster>) to PNGs in `frontend/.layout-renders/`, with a debug overlay
 * (label boxes, safe rect, tips, home disc) and a per-case invariant scoreboard.
 *
 *   pnpm --filter @heartbound/frontend render:layout               # named cases
 *   pnpm ... render:layout --seeds 30                            # + stress seeds
 *   pnpm ... render:layout --size 1200x1200                      # non-default size
 *   pnpm ... render:layout --svg                                 # also keep SVGs
 *   pnpm ... render:layout --no-overlay                          # clean render
 *
 * No dev server or browser needed — <Poster> is pure and server-renderable.
 * Text width uses a char-metric approximation of the canvas measurer (node has
 * no canvas); box outlines in the overlay show exactly what the engine reasoned
 * about.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Poster } from "../src/components/poster/Poster";
import { LABEL_ICON_GAP, labelStrings } from "../src/components/poster/labelText";
import { computePlaces } from "../src/lib/geo";
import { computeLayoutWithDiagnostics } from "../src/lib/layout/computeLayout";
import { defaultLayoutConfig } from "../src/lib/layout/config";
import type { LaidOut, LayoutConfig, MeasureFn } from "../src/lib/layout/types";
import type { Computed } from "../src/lib/types";
import { leaderCrossings, verifyLayout } from "../src/lib/layout/verify";
import { getTemplate } from "../src/lib/templates/registry";
import type { Affiliation, Place } from "../src/lib/types";

const FRONTEND_DIR = process.cwd();
const OUT_DIR = path.resolve(FRONTEND_DIR, ".layout-renders");
const EMIT_SVG = process.argv.includes("--svg");
const OVERLAY = !process.argv.includes("--no-overlay");
const seedsArg = process.argv.indexOf("--seeds");
const SEEDS = seedsArg >= 0 ? Number(process.argv[seedsArg + 1] ?? 0) : 0;
const sizeArg = process.argv.indexOf("--size");
const SIZE = sizeArg >= 0 ? process.argv[sizeArg + 1] : "1000x1500";
const [W, H] = SIZE.split("x").map(Number);

const TEMPLATE = getTemplate("vintage-cartography");

// ---------------------------------------------------------------- cities ----
const CITY: Record<string, { lat: number; lng: number; label: string }> = {
  berlin: { lat: 52.52, lng: 13.405, label: "Berlin" },
  jerusalem: { lat: 31.7683, lng: 35.2137, label: "Jerusalem" },
  shanghai: { lat: 31.2304, lng: 121.4737, label: "Shanghai" },
  brisbane: { lat: -27.4698, lng: 153.0251, label: "Brisbane" },
  sf: { lat: 37.7749, lng: -122.4194, label: "San Francisco" },
  ny: { lat: 40.7128, lng: -74.006, label: "New York" },
  london: { lat: 51.5074, lng: -0.1278, label: "London" },
  bangkok: { lat: 13.7563, lng: 100.5018, label: "Bangkok" },
  chiangmai: { lat: 18.7883, lng: 98.9853, label: "Chiang Mai" },
  tokyo: { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  seattle: { lat: 47.6062, lng: -122.3321, label: "Seattle" },
  miami: { lat: 25.7617, lng: -80.1918, label: "Miami" },
  jakarta: { lat: -6.2088, lng: 106.8456, label: "Jakarta" },
  melbourne: { lat: -37.8136, lng: 144.9631, label: "Melbourne" },
  sydney: { lat: -33.8688, lng: 151.2093, label: "Sydney" },
};

const AFFS: Affiliation[] = ["visited", "lived", "family", "born"];

function place(id: string, i: number): Place {
  const c = CITY[id];
  return { id, label: c.label, fullName: c.label, lat: c.lat, lng: c.lng, affiliation: AFFS[i % AFFS.length] };
}

type Case = { name: string; home: string; places: string[] };

const CASES: Case[] = [
  { name: "t1-berlin", home: "berlin", places: ["jerusalem", "shanghai"] },
  { name: "t2-brisbane-sf-ny", home: "brisbane", places: ["sf", "ny"] },
  { name: "t2b-brisbane-sf-ny-london", home: "brisbane", places: ["sf", "ny", "london"] },
  { name: "t3-brisbane-bkk-cnx", home: "brisbane", places: ["bangkok", "chiangmai"] },
  { name: "t3b-brisbane-bkk-cnx-sha-lon", home: "brisbane", places: ["bangkok", "chiangmai", "shanghai", "london"] },
  { name: "t4-newyork-five", home: "ny", places: ["tokyo", "seattle", "london", "bangkok", "miami"] },
  { name: "t5-jakarta-au", home: "jakarta", places: ["brisbane", "melbourne", "sydney"] },
];

// ------------------------------------------------------------- measurer -----
// Node has no canvas: approximate glyph advance per font size, calibrated
// against real chromium-canvas measurements of EB Garamond smallcaps/italic
// (e.g. "San Francisco" @ 31px smallcaps + 2.5px tracking = 218px). The
// overlay draws the resulting boxes, so what the engine reasoned about is
// visible even where the rasterizer's fallback serif differs slightly.
const NAME_CHAR = 0.46;
const DIST_CHAR = 0.455;

const measure: MeasureFn = (item: Computed) => {
  const { name, dist } = labelStrings(item, TEMPLATE, "km");
  const nameW = name.length * TEMPLATE.nameSize * NAME_CHAR + name.length * TEMPLATE.nameLetterSpacing;
  const distW = dist.length * TEMPLATE.distSize * DIST_CHAR + dist.length * TEMPLATE.distLetterSpacing;
  return {
    w: TEMPLATE.iconSize + LABEL_ICON_GAP + Math.max(nameW, distW),
    h: 2 * TEMPLATE.lineHeight,
  };
};

// -------------------------------------------------------------- overlay -----
function overlay(items: LaidOut[], cfg: LayoutConfig): string {
  const parts: string[] = [`<g fill="none" stroke-width="1">`];
  parts.push(
    `<rect x="${cfg.margin}" y="${cfg.margin}" width="${cfg.width - 2 * cfg.margin}" height="${cfg.safeBottom - cfg.margin}" stroke="#2563eb" stroke-dasharray="6 4" opacity="0.45"/>`,
  );
  parts.push(`<circle cx="${cfg.cx}" cy="${cfg.cy}" r="${cfg.homeRadius}" stroke="#2563eb" stroke-dasharray="3 3" opacity="0.45"/>`);
  for (const it of items) {
    const b = it.labelBox;
    parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" stroke="#dc2626" opacity="0.55"/>`);
    parts.push(`<circle cx="${it.tip.x}" cy="${it.tip.y}" r="2.5" fill="#dc2626" stroke="none"/>`);
    if (it.needsLeader) {
      parts.push(
        `<line x1="${it.tip.x}" y1="${it.tip.y}" x2="${b.anchorX}" y2="${b.anchorY}" stroke="#c026d3" opacity="0.7"/>`,
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

// --------------------------------------------------------------- render -----
async function renderCase(
  name: string,
  home: Place,
  computed: Computed[],
  width: number,
  height: number,
): Promise<boolean> {
  const cfg = defaultLayoutConfig(width, height);
  const { items, diagnostics } = computeLayoutWithDiagnostics(computed, cfg, measure);

  const problems = verifyLayout(items, cfg);
  const crossings = leaderCrossings(items, { x: cfg.cx, y: cfg.cy });
  const leaders = items.filter((o) => o.needsLeader);
  const leaderLen = leaders.reduce(
    (s, o) => s + Math.hypot(o.tip.x - o.labelBox.anchorX, o.tip.y - o.labelBox.anchorY),
    0,
  );

  let svg = renderToStaticMarkup(
    <Poster home={home} items={items} template={TEMPLATE} units="km" width={width} height={height} idPrefix={name} />,
  );
  // librsvg can't resolve CSS vars — swap the next/font vars for real serifs.
  svg = svg.replace(/var\(--font-playfair\)/g, "Georgia, serif").replace(/var\(--font-garamond\)/g, "Georgia, serif");
  if (OVERLAY) svg = svg.replace("</svg>", `${overlay(items, cfg)}</svg>`);

  const base = path.join(OUT_DIR, `${name}-${width}x${height}`);
  if (EMIT_SVG) await writeFile(`${base}.svg`, svg);
  await sharp(Buffer.from(svg)).png().toFile(`${base}.png`);

  const ok = problems.length === 0;
  const flag = ok ? (crossings === 0 ? " ok " : "XING") : "FAIL";
  console.log(
    `[${flag}] ${name.padEnd(34)} ${String(width + "x" + height).padEnd(10)} places=${items.length} leaders=${leaders.length} (${Math.round(leaderLen)}px) crossings=${crossings} passes=${diagnostics.iterations} fallback=${diagnostics.fallbackUsed ? "col" : "-"}${
      ok ? "" : ` problems=${JSON.stringify(problems)}`
    }`,
  );
  return ok && crossings === 0;
}

const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  let allOk = true;

  for (const c of CASES) {
    const homeCity = CITY[c.home];
    const home: Place = { id: "home", label: homeCity.label, fullName: homeCity.label, lat: homeCity.lat, lng: homeCity.lng, affiliation: "lived" };
    const computed = computePlaces(home, c.places.map((p, i) => place(p, i)));
    allOk = (await renderCase(c.name, home, computed, W, H)) && allOk;
  }

  for (let seed = 0; seed < SEEDS; seed++) {
    const rng = mulberry32(seed + 1);
    const n = 3 + Math.floor(rng() * 6);
    const names = Object.keys(CITY);
    const computed: Computed[] = Array.from({ length: n }, (_, k) => {
      const cluster = Math.floor(rng() * 4) * 90;
      const bearingDeg = (cluster + (rng() - 0.5) * 40 + 360) % 360;
      const cityName = names[Math.floor(rng() * names.length)];
      return {
        ...place(cityName, k),
        id: `${cityName}-${k}`,
        distanceKm: 50 + Math.floor(rng() * 17950),
        bearingDeg,
      };
    });
    const home: Place = { id: "home", label: "Stress Home", fullName: "", lat: 0, lng: 0, affiliation: "lived" };
    allOk = (await renderCase(`seed-${String(seed).padStart(3, "0")}`, home, computed, W, H)) && allOk;
  }

  console.log(allOk ? "\nALL CLEAN" : "\nDEFECTS FOUND");
  process.exit(allOk ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
