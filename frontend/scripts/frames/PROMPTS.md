# Frame swatch prompts

Product photographs of each of the 8 frame color options (`FrameUpsellCard`'s
picker, `packages/shared/src/commerce.ts` `FRAME_COLORS_BY_MATERIAL`). Each
shows the frame's mitred corner — two rails meeting at 90° — photographed at
the same distance/angle/background across all 8, so they read as one
consistent set (the same convention Artelo's own frame-color picker uses,
but these are our own renders, not their photos). Square 1:1, plain neutral
studio background, no glass reflections.

Generated with `google/gemini-3-pro-image-preview` via OpenRouter (the
generate-image skill script; key in the repo-root `.env.local`). Output:
`public/frames/<material>-<color>.png` (lowercase, e.g. `oak-natural.png`).

Shared prompt skeleton — only the frame-material clause changes per color:

> Studio product photograph of a picture frame's mitred corner, two frame
> rails meeting at a 90-degree joint, filling most of the frame, photographed
> straight-on at a slight elevated angle, on a plain seamless light warm-grey
> studio background, soft even lighting, no glass glare, ultra sharp focus,
> photorealistic, square 1:1 composition. {frame_clause}

| file | frame_clause |
| --- | --- |
| `oak-natural.png` | Thin solid oak wood frame, natural light-oak finish, visible fine wood grain, satin lacquer sheen. |
| `oak-black.png` | Thin solid oak wood frame, painted matte black, subtle wood grain still visible through the finish. |
| `oak-white.png` | Thin solid oak wood frame, whitewashed matte white finish, subtle wood grain still visible through the finish. |
| `oak-walnut.png` | Thin solid oak wood frame, stained a rich dark walnut brown, prominent wood grain, satin lacquer sheen. |
| `metal-white.png` | Thin aluminum metal frame, matte white powder-coated finish, crisp machined edges. |
| `metal-black.png` | Thin aluminum metal frame, matte black powder-coated finish, crisp machined edges. |
| `metal-silver.png` | Thin aluminum metal frame, brushed silver finish, crisp machined edges. |
| `metal-gold.png` | Thin aluminum metal frame, brushed warm-gold finish, crisp machined edges. |
