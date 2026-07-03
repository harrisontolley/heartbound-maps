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

## scene-room-raw.png (published as-is at /showcase/room-study.png)

Used by `LandingPoster.tsx` as the live-mockup room: the LIVE poster SVG is
CSS-mapped onto the frame's black area at runtime, so this scene is published
uncomposited. The measured black-rect fractions live in `PRINT_QUAD` there.

> Interior photograph of a calm home study corner in warm afternoon light. A
> single picture frame hangs on a warm ivory plaster wall above a light oak
> desk with a closed notebook, a small brass lamp and a ceramic cup. The frame
> is thin natural oak, portrait orientation, 2:3 aspect ratio, photographed
> perfectly straight-on with no perspective distortion, frame edges perfectly
> vertical and horizontal, and the area inside the frame is solid pure black
> with no mat. Warm cream and oak palette, soft shadows, photorealistic,
> landscape 16:10 composition with the frame centered.

## scene-gift-raw.png

> Interior photograph of a gift moment: a framed picture leaning against a
> warm ivory plaster wall, standing on light oak floorboards, next to a roll
> of unbleached kraft wrapping paper, a spool of thin cotton twine and folded
> ivory tissue paper. The picture frame is thin natural oak, portrait
> orientation, photographed perfectly straight-on with no perspective
> distortion, and the area inside the frame is solid pure black with a white
> mat border. Soft warm side light, cream and clay palette, photorealistic,
> landscape 3:2 composition with the frame left of center.
