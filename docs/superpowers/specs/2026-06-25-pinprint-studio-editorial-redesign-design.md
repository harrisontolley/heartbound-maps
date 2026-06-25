# Pinprint Studio — Editorial Redesign (DESIGN.md)

**Date:** 2026-06-25
**Status:** Approved design — ready for implementation planning

## Overview

Restyle the Pinprint **studio UI chrome** to the editorial design system defined in
`DESIGN.md` (the "ElevenLabs" analysis): an off-white canvas holding warm near-black
ink, EB Garamond serif display at weight 300, Inter body, pastel atmospheric gradient
orbs, and ink pill CTAs. The redesign is **purely presentational** — no behavior, data
flow, or feature changes.

The user chose **full editorial atmosphere**: the gradient orbs are prominent behind the
poster preview and soften the header/sidebar, with larger serif moments — the studio
should read like an editorial surface, not a utilitarian dashboard, while staying a
usable working tool.

## Scope

### In scope — the studio chrome

| File | Role |
|---|---|
| `src/app/globals.css` | Token foundation (colors, radii, fonts, body) + orb helpers |
| `src/app/layout.tsx` | Body background/text, base type |
| `src/components/PosterStudio.tsx` | App shell: header, sidebar, preview stage, template tabs |
| `src/components/controls/PlaceSearch.tsx` | Search input + results dropdown |
| `src/components/controls/PlaceList.tsx` | Home row, place rows, empty state |
| `src/components/controls/AffiliationPicker.tsx` | Tie-type glyph buttons |
| `src/components/controls/CustomizePanel.tsx` | Size / colors / text / decoration controls |
| `src/components/map/MapPicker.tsx` | Map pin colors (frame/caption/loading restyled in PosterStudio) |
| `src/components/ui/GradientOrbs.tsx` | **New** — atmospheric orb layer |
| `src/components/ui/Button.tsx` | **New** — button primitive (primary/outline/tertiary) |
| `src/components/ui/PillButton.tsx` | **New** — segmented/selectable pill primitive |

### Out of scope — explicitly NOT touched

- **Poster templates and rendering** — `src/lib/templates/*`, `src/components/poster/*`
  (`Poster`, `Legend`, `PlaceLabel`, `CompassRose`, `Arrow`, `PaperTexture`, etc.). These
  are the product output; each is a deliberate, distinct design. They must render
  pixel-identically after the redesign.
- **Fonts module** — `src/lib/fonts.ts`. Untouched, which guarantees the `--font-playfair`,
  `--font-garamond`, `--font-archivo`, `--font-jetbrains-mono`, `--font-inter` CSS variables
  the posters depend on stay defined.
- **Logic** — geometry (`src/lib/geo`), layout engine (`src/lib/layout`), export
  (`src/lib/export`), geocoding (`src/app/api/geocode`, `src/lib/server`), the store
  (`src/lib/store`), hooks. No behavior, props, or state changes.
- **No new pages/features** — no marketing/landing page, no checkout, etc.

## Why the posters are safe (de-risking)

Poster templates reference fonts via **raw CSS variables** in their style objects
(`titleFamily: "var(--font-playfair)"`, etc.) and carry their own `paper`/`ink`/`accent`
colors. They do **not** use the chrome's Tailwind theme utilities (`bg-canvas`,
`font-display`, …) or the chrome's color classes. Therefore:

1. Adding editorial color/radius/font tokens to `@theme` cannot affect posters.
2. Repurposing the unused `font-display`/`font-serif` Tailwind utilities for chrome
   headings cannot affect posters.
3. As long as `fonts.ts` and the template/poster files are untouched, posters are
   guaranteed unaffected.

`GradientOrbs` is pure CSS (no `<image>`), so the poster export canvas stays untainted —
but it is chrome-only anyway and never enters the exported SVG.

## Implementation approach

**Token-driven via Tailwind 4 `@theme`.** Define every `DESIGN.md` value as a CSS custom
property in `globals.css`; Tailwind 4 generates the utilities automatically. Restyle each
chrome component using semantic classes (`bg-canvas`, `text-ink`, `border-hairline`,
`rounded-pill`, `font-display`). This honors `DESIGN.md`'s "use token refs everywhere —
never inline hex," matches the existing `@theme inline` block, and isolates posters.

Rejected alternatives: inline arbitrary hex per component (violates the token rule,
unmaintainable); a separate TS tokens module (unnecessary indirection given Tailwind 4).

## Design tokens (add to `globals.css` under `@theme`)

### Colors → `--color-*` (yields `bg-*`, `text-*`, `border-*`)

| Token | Hex | Use |
|---|---|---|
| `canvas` | `#f5f5f5` | Page floor, header, preview stage |
| `canvas-soft` | `#fafafa` | Sidebar panel, alt bands |
| `surface-card` | `#ffffff` | Cards, inputs, dropdown, poster card |
| `surface-strong` | `#f0efed` | Badges, icon plates, hover, caption strips |
| `ink` | `#0c0a09` | Display + primary text, home pin |
| `primary` | `#292524` | Primary ink-pill fill |
| `primary-active` | `#0c0a09` | Pill press state |
| `body` | `#4e4e4e` | Running text |
| `body-strong` | `#292524` | Emphasis |
| `muted` | `#777169` | Subtitles, captions |
| `muted-soft` | `#a8a29e` | Disabled / faint |
| `hairline` | `#e7e5e4` | 1px dividers, card outlines |
| `hairline-soft` | `#f0efed` | Lighter divider |
| `hairline-strong` | `#d6d3d1` | Stronger outline, input border |
| `on-primary` | `#ffffff` | Text on ink pill |
| `gradient-mint` | `#a7e5d3` | Orb |
| `gradient-peach` | `#f4c5a8` | Orb |
| `gradient-lavender` | `#c8b8e0` | Orb |
| `gradient-sky` | `#a8c8e8` | Orb |
| `gradient-rose` | `#e8b8c4` | Orb |
| `success` | `#16a34a` | Confirmation |
| `error` | `#dc2626` | Validation errors |

Affiliation colors (born `#b07b2b`, lived `#3f7d5d`, visited `#3a6ea5`, family `#c0504e`)
stay as-is in `affiliations/registry.ts` — they are functional indicators tied to the
poster output, not chrome theme colors.

### Radii → `--radius-*` (yields `rounded-*`)

`xs 4` · `sm 6` · `md 8` · `lg 12` · `xl 16` · `xxl 24` · `pill 9999`.

### Fonts → `--font-*`

- `--font-display: var(--font-garamond)` — chrome display/headings (EB Garamond, the
  documented Waldenburg substitute), **weight 300**, negative tracking.
- `--font-sans: var(--font-inter)` — body/nav/buttons/captions (unchanged).
- The poster-only vars (`--font-playfair`, `--font-archivo`, `--font-jetbrains-mono`)
  remain defined via `fonts.ts`; the chrome simply doesn't repurpose them.

### Type usage in the chrome (dense tool — uses the small end of the scale)

| Context | Spec |
|---|---|
| Wordmark "Pinprint", empty-state heading | EB Garamond, ~24px (`display-sm`), weight 300 |
| Section group labels ("Size", "Colors", "Style", …) | Inter, 12px/600, +0.96px, uppercase (`caption-uppercase`), `muted` |
| Component titles ("Customize") | Inter, 18–20px/500 |
| Body / inputs / rows | Inter, 15–16px/400, +0.15–0.16px tracking |
| Buttons / nav | Inter, 15px/500 |

The big display sizes (`display-mega` 64px etc.) are **not** used in the studio — this is a
working tool, not a marketing hero.

### Elevation

- Cards: `surface-card` + 1px `hairline`.
- Soft drop (dropdown, map frame, hover): `0 4px 16px rgba(0,0,0,0.04)`.
- Poster card: `surface-card` + a present-but-soft drop (it is the visual hero floating on
  the orb field); existing corner rounding kept.

## Atmosphere — `GradientOrbs` component (new)

`src/components/ui/GradientOrbs.tsx` — a pure presentational layer of soft, blurred radial
blooms using the five gradient tokens.

- Absolutely positioned, `pointer-events-none`, `aria-hidden`, sits behind content (low
  z-index); content uses `relative`/`z-10` as needed.
- Accepts a small set of preset arrangements (e.g. `preview`, `header`, `sidebar`,
  `card`) so callers pick placement/intensity without bespoke CSS.
- Each orb: large radial-gradient circle (color → transparent), heavy blur, low opacity.
- `prefers-reduced-motion`: static (no drift). Animation is out of scope per `DESIGN.md`;
  blooms are static by default.

**Placements (full editorial):**

1. **Preview stage** — the centerpiece: 2–3 large mint/peach/lavender/sky orbs arranged
   around the floating poster card.
2. **Header** — one faint bloom behind the "Pinprint" wordmark.
3. **Sidebar** — one subtle bloom at the top, behind the search.
4. **Empty state** — orb inside the `gradient-orb-card` prompt.

## Component-by-component mapping

### `layout.tsx`
- `<body>`: `bg-canvas text-body` (replaces `bg-neutral-100 text-neutral-900`), Inter base
  with +0.16px tracking, antialiased. Metadata unchanged.

### `PosterStudio.tsx` — shell
- Root: `bg-canvas`, full-height flex (unchanged structure).
- **Header** (`top-nav` band): `bg-canvas` + bottom `border-hairline` + `GradientOrbs`
  bloom. Left: **Pinprint** wordmark in `font-display` (EB Garamond 300, ~24px) + tagline
  in Inter caption `muted`. Right cluster:
  - Bearing toggle (Direct/Map) and units toggle (km/mi) → editorial **segmented pills**
    via `PillButton`: `rounded-pill` container, `hairline-strong` border; active segment =
    `primary` ink fill + `on-primary`; inactive = transparent + `body`, hover
    `surface-strong`. Tooltips preserved.
  - **SVG** → `Button variant="outline"` (transparent pill, `hairline-strong` border, ink
    text). **Download PNG** → `Button variant="primary"` (ink pill, `on-primary`). Disabled
    states keep current opacity behavior. Loading labels ("…", "Rendering…") preserved.
- **Sidebar** `<aside>`: `bg-canvas-soft`, right `border-hairline`, generous padding,
  faint top orb. Notice text → `muted`.
- **Map frame + loading** (these live here, not in `MapPicker.tsx`): the wrapper around
  `<MapPicker/>` → `bg-surface-card`, `rounded-xl`, 1px `hairline`, overflow-hidden, soft
  drop; caption strip → `bg-surface-strong` + `muted` text; the `dynamic(...)` loading
  placeholder → `bg-surface-strong` (replaces `animate-pulse bg-neutral-100`).
- **Preview stage** `<main>`: `bg-canvas` with the prominent `GradientOrbs preview` layer
  behind the floating poster card. Poster card: `bg-surface-card` + soft drop; existing
  `aspect-ratio` + sizing logic untouched; the `<Poster/>` element and its props are
  unchanged.
- **Template selector bar**: `bg-canvas-soft` + bottom hairline. Each template → `PillButton`
  (active = ink fill). Vintage variant sub-row: `caption-uppercase` "Style" label (`muted`)
  + smaller `PillButton`s; "— pick your favourite" hint in `muted`.

### `PlaceSearch.tsx`
- Input → `text-input` token: `bg-surface-card`, `rounded-md`, 1px `hairline-strong`,
  ~44px, body text; focus → 2px `ink` border.
- Dropdown: `bg-surface-card`, `rounded-xl`, 1px `hairline`, soft drop. Rows: hover
  `surface-strong`, bottom `hairline-soft` divider. `kind` chip → `badge-pill`
  (`surface-strong`, `caption-uppercase`). Loading/empty → `muted`; error → `text-error`.

### `PlaceList.tsx`
- **HomeRow**: `bg-surface-card`, `rounded-lg`, 1px `hairline`. "Home" badge → **ink** pill
  (`primary` fill, `on-primary`, `caption-uppercase`). Label input inline (transparent,
  `body-strong`). `fullName` → `muted`. Remove ✕ → `muted` → hover `error`.
- **PlaceRow**: `bg-surface-card`, `rounded-lg`, 1px `hairline`. `AffiliationPicker` +
  label input (`body`) + set-home ⌂ + remove ✕ (`muted` → hover `ink`/`error`). Distance
  `tabular-nums` `muted`.
- **Empty state**: `gradient-orb-card` — `bg-canvas-soft`, `rounded-xxl`, padding, a
  `GradientOrbs card` bloom; prompt heading in `font-display` + supporting line in Inter
  `body-sm` `muted` (replaces the dashed-border box).

### `AffiliationPicker.tsx`
- Keep the four functional colors and glyphs. Active state → `bg-surface-strong` +
  `ring-hairline-strong`, `rounded-md`; inactive → reduced opacity (current behavior).

### `CustomizePanel.tsx`
- `<details>` → card: `bg-surface-card`, `rounded-xl`, 1px `hairline`. Summary "Customize"
  in Inter title (500). `Heading` helper → `caption-uppercase` `muted` (already close).
- **Size** buttons → `PillButton` (active = ink fill; inactive = transparent + 
  `hairline-strong` + `body`); ratio sub-label `muted`/`muted-soft`.
- **ColorRow**: label `muted`; native color swatch framed with `hairline`, `rounded-sm`;
  "reset" → `muted` text button (tertiary).
- **Toggle** (checkbox): `accent-ink`, `rounded-sm`; label `body-sm` `muted`.
- **TextRow**: `text-input` style (surface-card, `rounded-md`, `hairline-strong`, focus
  ink); placeholder `muted-soft`.
- **Reset to template defaults** → `Button variant="outline"` (small pill).

### `MapPicker.tsx`
- Pins only: home `dot` → `ink` `#0c0a09`; place pin keeps its warm accent `#e4572e`
  (functional). The map container's water background (`#aadaff`) is functional map styling
  and stays.
- Leaflet/map behavior, click-to-add, fit-bounds — unchanged. (The surrounding frame,
  caption strip, and loading placeholder are restyled in `PosterStudio.tsx`, above.)

## Shared primitives (new, targeted DRY)

The editorial pill repeats across 5 places (bearing, units, template, vintage variant,
size) and the button pattern across 3 (SVG, Download PNG, Reset). Two minimal primitives
remove the duplication and keep token usage consistent:

- `src/components/ui/Button.tsx` — `variant: "primary" | "outline" | "tertiary"`, optional
  `size`, passes through `disabled`/`onClick`/`title`/`children`. Encapsulates the pill
  geometry + token classes.
- `src/components/ui/PillButton.tsx` — selectable/segmented pill with an `active` boolean;
  active = ink fill + `on-primary`, inactive = transparent + `body` + hairline border.

Both are thin, presentational, and independently testable. If churn should be minimized
these can be inlined instead, but the spec assumes the primitives exist.

## Success criteria

1. **Posters render pixel-identically** — `fonts.ts`, `templates/*`, and `poster/*` are
   not modified; a poster still renders in the preview and exports to SVG/PNG unchanged.
2. **Behavior unchanged** — search, add/remove/promote place, home editing, units/bearing
   toggles, template/variant/size switching, customization, map click-to-add, export all
   work exactly as before. No prop/state/handler changes.
3. **Tokens, not hex** — all chrome styling uses the `@theme` token utilities; no inline
   hex in chrome components (affiliation/pin colors excepted, as documented).
4. **Quality gates pass** — `pnpm typecheck`, `pnpm lint`, and `pnpm test:run` (existing
   vitest suite) all green.
5. **Responsive preserved** — the `lg` breakpoint behavior (sidebar stacks under the
   preview below `lg`) still works; orbs scale down but don't disappear.
6. **Visual verification** — the studio is run and visually confirmed to match the
   editorial system (off-white canvas, serif wordmark, ink pills, hairline cards, orb
   atmosphere behind the preview).

## Risks & mitigations

- **Accidentally restyling a poster** → never edit `poster/*` or `templates/*`; verify a
  poster export after the change.
- **Breaking poster fonts** → never edit `fonts.ts`; keep all `--font-*` vars defined.
- **Orbs hurting legibility** → keep orb opacity low and `pointer-events-none`; content on
  raised z-index; verify text contrast over orb regions.
- **Tailwind 4 token naming** → confirm `@theme` `--color-*`/`--radius-*`/`--font-*`
  generate the expected utilities during the first build.
