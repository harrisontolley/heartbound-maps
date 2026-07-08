---
version: 1.0
name: heartbound-warm-gallery
description: Heartbound Maps's brand system reads like a small fine-art gallery that happens to sell one perfect object. The canvas is warm ivory (`#faf8f3`) holding warm charcoal ink (`#1f1b16`). One accent exists, a cartographer's terracotta (`#b5573a`), and it is reserved for the product's own visual language — pin and arrow marks, bearing ticks, diagram strokes — never for buttons or headlines. Display runs Fraunces (the same optical serif the poster's warm-minimal look uses, so chrome and artwork share a voice); Inter carries body, UI, and the tracked-uppercase micro-labels that echo the poster's typographic place labels. CTAs are quiet near-black ink pills. Photography is warm interior lifestyle; the room sells the print. No discount chrome, no emoji, no em dashes in copy, no star widgets.

colors:
  primary: "#2b2620"
  primary-active: "#1f1b16"
  ink: "#1f1b16"
  body: "#55504a"
  body-strong: "#2b2620"
  muted: "#857c6f"
  muted-soft: "#aaa193"
  hairline: "#e9e2d4"
  hairline-soft: "#f1ebdf"
  hairline-strong: "#d9cfbc"
  canvas: "#faf8f3"
  canvas-soft: "#fdfcf8"
  surface-card: "#fffefb"
  surface-strong: "#f2ede3"
  on-primary: "#ffffff"
  accent: "#b5573a"
  accent-deep: "#8f4128"
  accent-soft: "#f4e3da"
  semantic-error: "#dc2626"
  semantic-success: "#16a34a"

typography:
  display-mega:
    fontFamily: "'Fraunces', 'Times New Roman', serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: -1.6px
  display-xl:
    fontFamily: "'Fraunces', serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: -0.96px
  display-lg:
    fontFamily: "'Fraunces', serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.36px
  display-md:
    fontFamily: "'Fraunces', serif"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.3px
  display-sm:
    fontFamily: "'Fraunces', serif"
    fontSize: 24px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: 0
  title-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  title-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.44
    letterSpacing: 0.18px
  body-md:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0.16px
  body-strong:
    fontFamily: "'Inter', sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.55
    letterSpacing: 0.16px
  body-sm:
    fontFamily: "'Inter', sans-serif"
    fontSize: 15px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: 0.15px
  caption:
    fontFamily: "'Inter', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  micro-label:
    fontFamily: "'Inter', sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.96px
    textTransform: uppercase
  button:
    fontFamily: "'Inter', sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: 0
  nav-link:
    fontFamily: "'Inter', sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
---

## Overview

Heartbound Maps's chrome is a warm gallery: ivory walls, charcoal ink, oak-frame warmth, and one terracotta mark borrowed from the map itself. The system exists to make the poster — the actual product — the only loud thing on any page.

**Key characteristics:**

- Warm ivory canvas (`{colors.canvas}`), warm charcoal ink (`{colors.ink}`). No pure white, no pure black, no cool grays.
- One accent: terracotta (`{colors.accent}`), scoped to the cartographic motif. Pin marks, bearing arrows in diagrams, eyebrow tick marks, the "Popular" tick on pricing. **Never** CTA fills, never headlines, never body text.
- CTAs are quiet ink pills (`{colors.primary}`, `{rounded.pill}`). One primary action per surface.
- Display face is **Fraunces** at weight 400 (light optical grades at large sizes). It is the same serif the poster's warm-minimal look uses: chrome and product rhyme.
- Inter carries body, UI, nav. The signature micro element is the **micro-label**: 12px Inter 600, uppercase, +0.96px tracking, with `·` separators — the chrome echo of the poster's tracked place labels. Used for eyebrows, spec strips ("HAHNEMÜHLE 310GSM · GICLÉE · ARCHIVAL"), and data captions.
- Hairlines are warm (`{colors.hairline}` family). Cards float on 1px hairlines plus at most one soft shadow tier.
- Photography: warm interior lifestyle scenes with the real product composited in, plus close-up craft detail. No flat mockup grids on marketing surfaces.
- 96px section rhythm, 1200px max content width.

## The cartographic signature

The brand's structural grammar comes from the poster: tracked-out labels, bearing arrows, distances, compass ticks. Where a generic site would use numbered markers or icon bullets, Heartbound Maps uses the product's own language — a terracotta tick, a bearing degree, a distance in km. Any decorative device that could appear on any other site should be replaced with one that could only appear here.

## Color rules

- `{colors.accent}` (terracotta `#b5573a`): cartographic marks only. `{colors.accent-deep}` is the AA-safe text variant when a small accent label must be text (e.g. "Popular"). `{colors.accent-soft}` is the only permitted tint plate, behind small marks — never behind full sections.
- Poster SVG art carries its own palette per template and never consumes chrome tokens.
- Semantic success/error unchanged, forms only.

## Typography rules

- Display stays at Fraunces 400. Never bold display copy; scale carries hierarchy.
- Negative tracking on display sizes (-0.3 to -1.6px); slightly loose (+0.15px) Inter body.
- Micro-labels are the only uppercase element on the page.
- Copy voice: warm, specific, short declaratives with periods. No em dashes. No emoji. No exclamation marks. Specifics over adjectives ("310gsm cotton paper", not "premium quality").

## Elevation

| Level | Treatment | Use |
|---|---|---|
| Flat | `{colors.canvas}` | Page floor, footer |
| Soft band | `{colors.canvas-soft}` | Alternating sections, poster stage wall |
| Card | `{colors.surface-card}` + 1px `{colors.hairline}` | Content cards |
| Hover | `0 4px 16px rgba(31, 27, 22, 0.05)` | Hovered cards (single tier) |
| Artwork | `0 24px 48px -12px rgba(31, 27, 22, 0.25)` | The poster/frame only — the one deep shadow on any page |

The deep shadow is reserved for the product. Nothing else on the page gets it.

## Components

- **top-nav** — `{colors.canvas}` at 85% + blur, hairline bottom, 64px. Wordmark (Fraunces) left, sparse center nav, cart/account + one ink pill right. Keep the header near-empty: the page's job is to funnel to the studio.
- **button-primary** — ink pill: `{colors.primary}` bg, white text, 15px/500, 10×20px padding, 40px height, `{rounded.pill}`. Press state `{colors.primary-active}`.
- **button-outline** — transparent pill, 1px `{colors.hairline-strong}` border, ink text.
- **button-tertiary** — inline ink text link.
- **micro-label strip** — full-width hairline-bounded row of micro-labels with `·` separators; the trust/spec treatment (replaces logo bars and star widgets).
- **feature-card** — `{colors.surface-card}`, `{rounded.xl}`, 24px padding, 1px hairline.
- **pricing row** — price set beside material spec in one calm phrase ("$91. 16 × 24 in, Hahnemühle 310gsm."). Anchor prices small, muted, struck through — data kept, chrome quiet. Popular tier gets a terracotta tick, not an inverted card.
- **text-input** — `{colors.surface-card}`, `{rounded.md}`, 44px, 1px `{colors.hairline-strong}`; focus ring 2px ink.
- **poster stage** — `{colors.canvas-soft}` gallery wall, artwork shadow (see Elevation), no decoration.

## Do

- Reserve the ink pill for the single primary action per surface.
- Reserve terracotta for cartographic marks.
- State prices next to material specs, quietly.
- Use real, verifiable claims (paper weight, ink type, bearing math). Specifics are the brand's trust currency.
- Respect `prefers-reduced-motion`; keep motion to reveals and micro-interactions.

## Don't

- No discount banners, countdowns, or badge clutter. The permanent framing-anchor strikethrough is the only price comparison, and it whispers.
- No emoji, no em dashes, no exclamation marks in chrome copy.
- No fabricated testimonials, review counts, or press logos.
- No gradient orbs, glassmorphism, or tech-startup atmosphere.
- No pure `#ffffff`/`#000000` in chrome.
- Never restyle the poster SVG (`src/components/poster/*`, `src/lib/templates/*`) with chrome tokens.

## Responsive

| Name | Width | Key changes |
|---|---|---|
| Mobile | < 640px | display-mega 64→34px; cards 1-up; hamburger nav |
| Tablet | 640–1024px | display 48px; cards 2-up |
| Desktop | 1024–1280px | full scale; cards 3–5-up per grid |
| Wide | > 1280px | content caps at 1200px |

Touch targets ≥ 40px; visible keyboard focus everywhere (2px ink ring).
