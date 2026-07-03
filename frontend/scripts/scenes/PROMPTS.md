# Lifestyle scene prompts

Raw AI-generated interior scenes for the landing page. Each scene that will
receive a composited poster is prompted to contain a **thin natural-oak frame,
photographed perfectly straight-on, with the area inside the frame solid pure
black** — `compose-scenes.ts` finds that black rectangle automatically and
cover-fits the real engine-rendered poster into it, so the product shown is
always the real product.

Generated with `google/gemini-3-pro-image-preview` via OpenRouter
(the generate-image skill script; key in the repo-root `.env.local`).

## scene-hero-raw.png

> Interior photograph of a warm, quiet living room corner in soft morning
> light. A single empty picture frame hangs centered on a warm ivory plaster
> wall: thin natural oak frame, portrait orientation, 2:3 aspect ratio, the
> area inside the frame is solid pure black. The frame is photographed
> perfectly straight-on, no perspective distortion, frame edges perfectly
> vertical and horizontal. Below the frame sits a light oak sideboard with a
> small stack of art books and a ceramic vase with dried grasses. To the left,
> part of a linen armchair. Warm cream and clay color palette, soft shadows,
> fine-art gallery calm, photorealistic, wide 3:2 landscape composition with
> the frame right of center.

## scene-craft-raw.png (no composite)

> Macro photograph, extreme close-up of the corner of a thick sheet of
> textured cotton fine-art paper, heavy 310gsm stock with a visible etching
> texture and deckled edge, resting on a natural oak table beside the mitred
> corner of a thin natural oak picture frame with glass. Soft raking morning
> light shows the paper tooth and thickness. Warm ivory and oak palette,
> shallow depth of field, photorealistic product photography, calm and
> luxurious, landscape 3:2.

## scene-hero-close-raw.png

Close-up frame scene (kept for reference; the shipped hero uses the wide scene below).

> Interior photograph, close view of a large empty picture frame hanging on a
> warm ivory plaster wall, the frame filling about two thirds of the image.
> The frame is thin natural oak, portrait orientation, 2:3 aspect ratio,
> photographed perfectly straight-on with no perspective distortion, frame
> edges perfectly vertical and horizontal. The entire area inside the frame is
> a single uniform pure black rectangle, completely flat solid black with no
> mat, no border, no reflections and no texture inside the frame. At the right
> edge of the image, part of a light oak sideboard with a ceramic vase of
> dried grasses. Soft warm morning side light casts a gentle shadow from the
> frame onto the wall. Cream and clay palette, photorealistic, landscape 3:2
> composition with the frame just left of center.

## frame-blank-raw.png (→ /showcase/framed-hero.png)

The hero's framed print is a standalone element (`cropToFrame` in
compose-scenes.ts): poster composited into the black rect at native render
resolution, then cropped to the frame's outer edge. Wall shadow is CSS.

> Product photograph of a thin natural oak picture frame, photographed
> perfectly straight-on, filling almost the entire image with only a tiny
> plain pure white margin around it. Portrait orientation, 2:3 aspect ratio.
> The area inside the frame is a single uniform solid pure black rectangle:
> completely flat black, no mat, no glass reflections, no texture. The oak is
> light, fine-grained, with clean mitred corners. Soft even studio light, no
> cast shadow, plain pure white background. Photorealistic, ultra sharp.

## scene-hero-bg-raw.png (→ /showcase/scene-hero-bg.png)

The hero background: the wide scene with its frame removed via Gemini EDIT
mode (input scene-hero-wide-raw.png), so the poster can live in the DOM and
center against the copy on every viewport.

> Remove the picture frame from the wall completely, leaving clean empty warm
> ivory plaster wall where it was. Change absolutely nothing else in the
> image: keep the sideboard, vase, books, dried grasses, lighting and colors
> exactly the same.

## scene-hero-wide-raw.png

Source for the bg edit above; its baked composite is retired.

> Very wide interior photograph of a warm, quiet living room wall in soft
> morning light, panoramic 21:9 composition. On the right third hangs a large
> picture frame: thin natural oak, portrait orientation, 2:3 aspect ratio,
> photographed perfectly straight-on with no perspective distortion, the area
> inside the frame solid pure black with no mat. The left two thirds of the
> image is calm, empty warm ivory plaster wall with soft light gradation,
> above a long light oak sideboard running the full width with a ceramic vase,
> a stack of art books and dried grasses near the right. Warm cream and clay
> palette, fine-art gallery calm, photorealistic.

## scene-room-raw.png (published as-is at /showcase/room-lounge.png)

Used by `LandingPoster.tsx` as the live-mockup room: the LIVE poster SVG is
CSS-mapped onto the frame's black area at runtime, so this scene is published
uncomposited. The measured black-rect fractions live in `PRINT_QUAD` there.
The raw generation's black rect came out ~9% wider than 2:3, so the published
file is the raw squeezed horizontally (1312→1203 px) until the rect is exactly
2:3 — regenerate the squeeze if you swap this scene (see PR notes). Black-rect
detection needs `THRESH ≈ 8` here: the shadowed green wall corners sit under
the default 40.

> Professional interior photograph, close view of a large picture frame in a
> moody sophisticated lounge. The frame fills about three quarters of the
> image height, centered, photographed perfectly straight-on with no
> perspective distortion, frame edges perfectly vertical and horizontal. Thin
> natural oak frame, portrait orientation, 2:3 aspect ratio, the entire area
> inside the frame is a single uniform solid pure black rectangle, completely
> flat black, no mat, no reflections. The wall is deep forest green painted
> plaster, clearly green not black, evenly lit enough to stay well above
> shadow black. At the bottom edge, the top of a cognac leather chair and a
> small brass table lamp glowing warm. Intimate evening light, photorealistic
> high-end interior magazine photography, landscape 16:10 composition.

## scene-gift-raw.png

Deliberately a cooler, brighter, more modern room than the rest of the site's
warm-ivory default (hero, craft) or the moody green lounge (scene-room-raw) —
the point is to show the print looks at home in more than one kind of room.
The frame is also much larger in-image than the first version (was ~35% of
image height with a lot of empty wall; now ~65-70%) so the composited artwork
actually reads at landing-page card size.

> Photorealistic interior product photograph, landscape 3:2 composition,
> editorial high-end design magazine style. A single thin natural oak picture
> frame, portrait orientation, leaning against a wall (not hanging),
> photographed perfectly straight-on with no perspective distortion, frame
> edges perfectly vertical and horizontal. The frame fills approximately
> 65-70% of the image height, positioned left of center. The area inside the
> frame, inside a thin white mat border, is a single uniform solid pure black
> rectangle: completely flat matte black, no texture, no reflections, no
> gradient, no glare. The wall behind is a smooth, bright, cool dove-grey
> painted plaster (not ivory or cream), and the floor is pale polished
> concrete (not oak floorboards). Crisp bright cool daylight streams in from a
> large window out of frame, casting soft, cool-toned shadows, not warm golden
> light. To the right of the frame, small and pushed to the edge: a neatly
> wrapped gift box in kraft brown paper with a thin natural twine bow, a small
> spool of twine, and a folded piece of ivory tissue paper, scaled small so
> they do not compete with the frame. Generous calm negative space. Modern,
> airy, minimal, photorealistic, sharp focus throughout.
