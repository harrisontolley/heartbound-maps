# Heartbound Maps

Poster maps of the places that matter. Pick a **home** location, add the places
you have ties to (born / lived / visited / family), and Heartbound Maps renders a
portrait poster with an **arrow pointing in each place's true compass bearing**
from home, labeled with the great-circle distance — across four switchable
designs, with no overlapping labels. Export to SVG or print-quality PNG.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000  (opens pre-populated with a showcase)
```

| Script            | What it does                                  |
| ----------------- | --------------------------------------------- |
| `pnpm dev`        | Dev server (Turbopack)                        |
| `pnpm build`      | Production build                              |
| `pnpm test`       | Vitest (watch) · `pnpm test:run` for one-shot |
| `pnpm typecheck`  | `tsc --noEmit`                                |
| `pnpm lint`       | ESLint                                        |

## How it works

- **Geometry** (`src/lib/geo`) — Haversine distance + true initial bearing
  (`atan2`), bearing→screen-vector projection (North = up), 16-point compass,
  distance formatting. Pure, fully unit-tested.
- **Layout engine** (`src/lib/layout`) — the differentiator. Arrow *angle* is
  sacred (always the true bearing); only arrow *length* and the label box move.
  The engine is constructive and deterministic (no force relaxation): arrows
  seed at a distance-proportional length capped so the rest-position label
  (icon at the tip, text flowing outward) always fits the page; conflicts form
  connected groups that are resolved by a shaft-aware vertical pack (labels
  stay at their tips and split the difference — isotonic regression, so two
  clashing neighbours each move a little instead of one moving a lot) or, for
  dense same-direction fans, an ordered outward column with short non-crossing
  leaders; a fixpoint loop merges any new conflicts until the poster is clean.
  Hard invariants (zero label/label and label/arrow overlap, everything inside
  the content-safe rect, leader fans never cross) live in `layout/verify.ts`,
  shared by the engine, the unit tests (incl. a 600-seed multi-size stress
  sweep), and the visual harness (`scripts/render-layout-cases.tsx`, `pnpm
  render:layout` — renders the reported regression cases + stress seeds to
  PNGs with a debug overlay).
- **Templates** (`src/lib/templates`) — four style specs (vintage-cartography
  hero with three sub-styles, minimal-compass, bold-modern, night-sky). Geometry
  is shared; only style tokens differ.
- **Affiliations** (`src/lib/affiliations`) — born/lived/visited/family, each a
  color + vector glyph, adapted per template, shown in a legend.
- **Rendering** (`src/components/poster`) — a pure SVG `Poster` (viewBox
  1000×1500) consumed by both the live preview and the export. Labels are
  measured on a canvas (matching the rendered font) so boxes are exact.
- **Geocoding** (`src/app/api/geocode`) — server route handlers proxy Nominatim
  with a descriptive User-Agent, a ≥1.1s rate gate, and an in-memory LRU cache.
- **Export** (`src/lib/export`) — clones the live SVG, inlines every web font as
  a base64 `@font-face`, then serializes (SVG) or rasterizes at 3000×4500 (PNG).
  The poster has no external images, so the canvas is never tainted.

## Note on the spec's sanity check

The brief states Brisbane→Sydney bearing ≈ 209°. The standard great-circle
formula (which the brief also provides as code) actually yields **~193°** —
Sydney is *west* of Brisbane, so the bearing is slightly west of due south
(still "SSW"). Distance ≈ 732 km matches. The implementation and its unit test
use the correct ~193°.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · zustand ·
react-leaflet + OpenStreetMap · Nominatim · Vitest.

## Out of scope (per the brief)

Checkout, payments, accounts, persistence/sharing, order fulfilment, color
customization, multiple sizes/orientations, exact-DPI print PDFs.
