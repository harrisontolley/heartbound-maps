# Lead Magnet Strategy — free poster design → paid print

> Product-direction doc. Records the chosen lead-magnet approach so it isn't lost. No code implemented yet.

## Context

Heartbound Maps lets users generate custom map/place fine-art posters. Question: is a **free downloadable design** a good lead magnet (Hormozi $100M Leads framework)? **Verdict: yes — near-textbook fit.** The free design natively exposes the next problem (a digital file is worthless on a wall → needs printing + framing), which is exactly the paid offer.

## The decision

**Screen-res free design, email-gated. Physical fine-art print + framing is the paid hero. High-res digital deferred as a later paid upsell (only if DIY demand shows).**

### Why (Hormozi lens)

- **Lead magnet rule:** solve a narrow problem completely and expose the next problem. Free design solves "I want beautiful custom map art of a place that matters"; exposes "the file is worthless on my wall." Paid offer = print + framing. Native, not bolted-on.
- **Value Equation:** free design raises **Perceived Likelihood** (buyer sees exact quality before paying) and lowers **Effort** (they already made it — one click to order). Both push conversion.
- Near-zero marginal cost per lead; clean ad hook.

### Free-rider leak — the one real risk, and the fix

- **Danger:** a print-ready high-res free file gets printed at a cheap local printer / competitor. The lead magnet feeds someone else's press.
- Two levers to stop it: **watermark** vs **resolution cap**. Watermark kills virality (nobody shares an ugly image; sharing = free ads). **Resolution cap protects silently** — file looks perfect on screen/phone/social, prints garbage above ~A5. Same protection, keeps virality, no brand ugliness. **Resolution cap wins.**

### Spec

- **Free (email-gated):** full finished design, screen resolution ~2000px long edge, no watermark. Beautiful on screen, phone wallpaper, Instagram. Un-printable large. Email = the captured lead.
- **Paid hero:** fine-art print + framing. Dream outcome = art on the wall, not the file. The free version shows exactly what the wall gets → the Perceived-Likelihood boost that converts.
- **Nurture:** email sequence → order the print, with real urgency/bonus (free shipping or framing upgrade if ordered within N days).
- **Deferred (validate first):** high-res digital download as a paid tripwire ($9–19). Adds SKUs + digital fulfilment + muddies premium positioning — don't build before data proves DIY demand (Hormozi: trim the fat).

### Positioning

Sell the **design** as free, the **finished piece** as the payoff. Aligns with the fine-art repositioning. Ad copy: *"Design your custom map art free — we print it museum-quality and ship it framed."*

### Why this over alternatives

- Kills the leak (resolution, not watermark) → keeps virality AND protects print sales.
- On-brand: free = preview, paid = the real thing.
- Cheapest to ship, most reversible. Can always loosen (give full-res) or add the digital tier later; cannot un-give a leaked high-res file.

## Implementation notes (when built)

The poster engine + SVG export already live in `frontend/src/lib/export`. New work:

1. **Screen-res export path** — cap output resolution (~2000px long edge) for the free download; keep the existing high-res path for print/fulfilment only.
2. **Email gate** — capture email before the free download; this is the actual lead. Wire to whatever list/ESP is chosen.
3. **Download flow + CTA** — after download, surface the "get it printed & framed" upsell.
4. **Nurture sequence** — email → order print, with time-boxed bonus.

Deferred: paid high-res digital tier (new SKU + digital delivery), only after DIY demand is validated.
