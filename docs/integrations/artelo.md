# Artelo

Print-on-demand fulfilment: once an order is paid (Stripe), we submit it to Artelo,
which prints the poster and ships it. No SDK — plain `fetch` against their REST API
(`https://www.artelo.io/api/open`, Bearer auth).

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `ARTELO_API_KEY` | backend | From the Artelo dashboard → Integrations → Connect Integration → API. Sent as `Authorization: Bearer …`. |
| `ARTELO_API_BASE` | backend | `https://www.artelo.io/api/open`. No separate sandbox host. |
| `ARTELO_WEBHOOK_SECRET` | backend | HMAC secret returned by `POST /webhooks/save` when you register the webhook. Verifies `x-artelo-signature` on callbacks. |
| `ARTELO_TEST_ORDERS` | backend | When **not** exactly `"false"`, orders submit with `isTestOrder=true` (Artelo marks them `Ignored`: never produced, never charged). Set `false` to go live. **Defaults to test.** |
| `BLOB_READ_WRITE_TOKEN` | backend | Vercel Blob token — stores the print-ready PNG the browser uploads (as a **private** blob) and signs the short-lived Artelo-fetch URL. |
| `BLOB_SIGNED_URL_TTL_DAYS` | backend | Optional. TTL of the signed GET URL handed to Artelo. Default `30`. Must outlive Artelo's fetch (see gotchas). |
| `CRON_SECRET` | backend | Bearer secret for the daily blob-GC cron (`/jobs/blob-gc`). Vercel injects it on cron requests; the route 503s when unset. |
| `BLOB_ORPHAN_TTL_HOURS` | backend | Optional. Age after which an *unreferenced* uploaded blob is GC'd. Default `48`. |
| `BLOB_RETENTION_DAYS` | backend | Optional. Age (from order creation) after which artwork for a **terminal** order is GC'd. Default `90`. |

No sandbox/live split of base URL or key — the single account toggles real vs test
fulfilment per-order via `isTestOrder`. Rate limit: 50 requests / 10s → `429`.

## Where the code lives

- `backend/src/artelo.ts` — env-guarded config (`getArteloConfig()` returns `null`
  when `ARTELO_API_KEY` is unset), `isArteloConfigured()`, `arteloFetch()` (attaches
  the Bearer header + base URL), and `verifyArteloWebhookSignature()`.
- `backend/src/fulfillment.ts` — `submitOrderToArtelo(orderId)`: builds the create-order
  body, POSTs `/orders/create`, logs the attempt + COGS to the `fulfillments` table,
  and records the Artelo order id. `buildCreateOrderBody()` is exported for tests.
- `backend/src/webhooks.ts` — `handleStripeEvent` fires the submit after an order goes
  `paid`; `handleArteloPayload` + `mapArteloStatus` advance status from callbacks.
- `backend/src/app.ts` → `registerRoutes()` — `POST /webhooks/artelo` (signature-verified),
  `POST /uploads/token` (Blob client-upload), and the `artelo` field of `GET /health/integrations`.
- `backend/src/fulfillment.ts` also exposes the admin/ops calls: `cancelArteloOrder()`
  (`DELETE /orders/cancel?id=…`), `fetchArteloOrder()` (`GET /orders/get-by-id?orderId=…`,
  used by admin "Sync"), and `fetchArteloCosts()` (`POST /catalog/get-costs`, the margin checker).
- `backend/src/routes/admin.ts` — operator endpoints that drive the above (cancel / sync /
  retry-fulfilment); see `docs/admin.md`.
- `backend/src/routes/dev.ts` — `POST /dev/artelo/register-webhook` (one-time, DEV_SEED_TOKEN-guarded).
- `backend/src/blob.ts` — env-guarded Blob helpers: `signAssetUrl()` (private blob → short-lived signed
  GET URL for Artelo), `listPosterBlobs()` / `deletePosterBlobs()` for GC.
- `backend/src/blobGc.ts` + `backend/src/routes/jobs.ts` — the lifecycle GC (`selectBlobsToDelete()` is the
  pure, tested decision) and the `CRON_SECRET`-guarded `GET|POST /jobs/blob-gc` route (Vercel cron in `vercel.json`).
- `packages/shared/src/commerce.ts` — `ARTELO_PRODUCT_BY_ID` + `arteloProductInfoFor()`:
  our `productId` → Artelo `productInfo` (catalog product, paper, frame, size, orientation).
- Frontend: `lib/export/exportPngBlob` (rasterize) + `lib/upload/uploadPosterPng` (Blob upload),
  wired from `components/PosterStudio.tsx` at add-to-cart.

## Verification status (2026-06-28)

Verified end-to-end against the **live** Artelo API with the production key:

- `authentication/check` → `200 {success:true}`.
- `POST /catalog/get-costs` and `POST /orders/create` accept our exact mapping for all three
  sizes, unframed **and** framed (`frameStyle:"PremiumOak"`, `frameColor:"NaturalOak"`). Test orders
  (`isTestOrder:true`) return `status:"Ignored"` with the COGS breakdown in `details`.
- `GET /orders/get-by-id?orderId=…` and `DELETE /orders/cancel?id=…` confirmed.

Live landed COGS (production + US shipping), 2:3 — used for pricing/margins. **Substrates
updated 2026-07-01**: loose prints use Hahnemühle German Etching 310gsm (`GermanEtchingFineArt`);
framed prints use Hot Press 300gsm 100% cotton rag (`HotPressFineArt`) with a premium natural-oak
ready-to-hang frame (`PremiumOak`/`NaturalOak`, framing service on). Verified live 2026-07-01,
**re-verified live 2026-07-03 (unchanged)**:

| size | unframed (German Etching 310gsm) | framed Premium Oak Natural (Hot Press cotton rag) |
| --- | --- | --- |
| 12×18 | $27.21 | $49.47 |
| 16×24 | $41.14 | $67.88 |
| 24×36 | $74.14 | $115.98 |

Retail against these (2026-07-03 reprice): loose $65 / $95 / $175 (~58/57/58% gross margin),
framed totals held at $124 / $168 / $289 (~60%) via smaller frame upcharges ($59/$73/$114).
After Stripe (2.9% + $0.30), loose nets ~54–55%, framed ~57%.

(Prior loose Hot Press unframed COGS, for reference: $16.74 / $22.51 / $38.55.
Prior framed Archival Matte Oak COGS, for reference: $35.91 / $46.98 / $93.46.
Prior Matte Poster unframed COGS, for reference: $11.62 / $14.14 / $23.55.)

### Frame-variant COGS spike (2026-07-03) — for the 8-color frame picker

Probed `POST /catalog/get-costs` for every `frameStyle` tier × size, plus a color-sensitivity
check (4 Oak colors at 16×24), via a throwaway script against the live API (not shipped —
research only). Landed COGS (production + US shipping), Hot Press cotton rag paper:

| size | Oak | Metal | PremiumOak | PremiumMetal |
| --- | --- | --- | --- | --- |
| 12×18 | $40.88 | $40.88 | $49.47 | $46.31 |
| 16×24 | $55.83 | $55.83 | $67.88 | $63.67 |
| 24×36 | $113.38 | $100.42 | $115.98 | $109.65 |

Two findings that shape the 8-variant frame picker (`packages/shared/src/commerce.ts`
`FRAME_VARIANTS`):

1. **`frameColor` never moves the price** — all 4 Oak colors (Natural/Black/White/Walnut) at
   16×24 quoted identically ($47.37 production + $8.46 shipping = $55.83). Cost varies only by
   `frameStyle` tier, so pricing keys off material (Oak vs Metal), not the specific color.
2. **All 8 offered colors map onto the `Premium*` tiers** (`PremiumOak` for the 4 oak colors,
   `PremiumMetal` for the 4 metal colors), matching the frame already in production use today
   (`PremiumOak`/`NaturalOak`) rather than the plain `Oak`/`Metal` tier — keeps every color
   choice at the same "ready-to-hang, premium" quality level instead of quietly downgrading
   some colors to a cheaper tier.
3. **Retail stays a single flat frame upcharge regardless of material** ($59/$73/$114, same
   framed totals $124/$168/$289 as today) rather than pricing Oak and Metal separately, even
   though PremiumMetal's COGS runs $3–6 lower per size — the gap is small relative to the
   upcharge itself, and one upcharge is simpler to communicate than a pricing matrix. This
   makes PremiumMetal's margin a little higher than PremiumOak's, never lower. Revisit if
   Metal becomes the more popular choice and the margin gap matters at volume.

## Product mapping (confirmed against the live validator)

An Artelo order line references a product by **attributes**, not a SKU. The offered
2:3 portrait ladder maps to the **Fine Art** line — loose prints use Hahnemühle German Etching
310gsm (`GermanEtchingFineArt`); framed prints use Hot Press 100% cotton rag (`HotPressFineArt`)
which reads cleaner behind glass; framed orders add a premium natural-oak frame and framing service
(commerce.ts `LOOSE_PAPER_TYPE` / `FRAMED_PAPER_TYPE`):

| productId | catalogProductId | paperType (loose) | paperType (framed) | size | orientation |
| --- | --- | --- | --- | --- | --- |
| `portrait-12x18` | `IndividualArtPrint` | `GermanEtchingFineArt` | `HotPressFineArt` | `x12x18` | `Vertical` |
| `portrait-16x24` | `IndividualArtPrint` | `GermanEtchingFineArt` | `HotPressFineArt` | `x16x24` | `Vertical` |
| `portrait-24x36` | `IndividualArtPrint` | `GermanEtchingFineArt` | `HotPressFineArt` | `x24x36` | `Vertical` |

Confirmed enum values (from `POST /catalog/get-costs` and `/orders/create` validation errors):
- **size**: leading-`x` WxH inches, e.g. `x12x18`, `x16x24`, `x24x36` (and many more).
- **paperType**: `MattePoster`, `GlossyPoster`, `SemiGlossPoster`, `SemiMatteLinenPoster`,
  `GlossyPhoto`/`LusterPhoto`/`PearlPhoto`/`MattePhoto`/`SemiMattePhoto`/`RagSatinPhoto`,
  `ArchivalMatteFineArt`/`HotPressFineArt`/`ColdPressFineArt`/`WatercolorFineArt`/`VelvetFineArt`/`PearlFineArt`/`GermanEtchingFineArt`, `Foil`.
- **frameStyle**: `Unframed`, `Oak`, `Metal`, `PremiumOak`, `PremiumMetal`.
- **frameColor** (required even when unframed): `Unframed`, `{Natural,Black,White,Walnut}Oak`,
  `{White,Black,Silver,Gold}Metal`, plus the `Premium*` variants. Default framed = `PremiumOak`/`NaturalOak`.

To retune paper/frame, edit `ARTELO_PRODUCT_BY_ID` in `packages/shared/src/commerce.ts`.

## Canvas is NOT available via the open API

Artelo markets canvas / gallery wraps on its website, but the **open API we fulfil through
does not expose canvas** — verified live (2026-06-30) against `POST /catalog/get-costs`:

- `catalogProductId` accepts only `IndividualArtPrint`, `SetOf{2,3,4,5,6,8,9,10,12,15}ArtPrints`,
  the place-named framed lines `Brighton|Bristol|Camden|Hudson|Kent|Warwick|Windsor|York`,
  `PictureFrame`, `SetOf{2,3,4,6,9,12}Frames`. No canvas.
- `paperType` accepts only the papers above + `Foil`. No canvas material.
- The `size` enum (~180 inch/metric values) has no canvas product, and there is no
  catalog-list endpoint (`/catalog`, `/catalog/products`, `/catalog/get-products` → 404).

Canvas is Shopify/Etsy/dashboard-only. **To revisit:** ask Artelo dev support whether canvas
is orderable via the open API and, if so, which `catalogProductId` + `paperType` to use (and
whether it's enabled for our account). If enabled, the wiring is small — model canvas as new
`productId`s reusing the portrait 2:3 viewBox, add `ARTELO_PRODUCT_BY_ID` entries, widen the
`catalogProductId` literal type to a union, surface via a parallel offered list, keep it unframed.

## Canonical flow

1. Browser uploads two **private** blobs at add-to-cart (client-upload via `POST /uploads/token`):
   the serialized vector SVG (`order_items.svg_asset_url` — the print master) and a browser-canvas
   PNG (`order_items.asset_url` — now only the **fallback** print asset; the canvas caps at
   7000px, so a 24×36 lands at ~194 DPI). Both URLs ride along to checkout.
2. Stripe webhook (`checkout.session.completed`) marks the order `paid` and defers
   `submitOrderToArtelo` past the webhook response (`waitUntil`; `backend/src/defer.ts`) —
   the render in step 3 can take ~32 s, longer than Stripe's retry window.
3. **Canonical: the server renders the exact-DPI print PNG from the order's SVG at fulfilment.**
   `ensurePrintAsset` (`backend/src/renderPrint.ts`) signs + fetches the SVG, preprocesses it
   (strip embedded fonts, resolve `var(--font-*)`, emulate small-caps), rasterizes with resvg at
   the product's true 300-DPI size (24×36 → 7200×10800), uploads it privately as
   `posters/print-<order>-<idx>.png`, and persists `order_items.render_asset_url` (reused on
   retries/reprints — never re-rendered). On any failure it falls back to the browser PNG.
4. **DPI floor guard**: before submitting, the chosen asset's pixel dimensions (read from the
   PNG IHDR via a ranged fetch) are validated against the physical size. Effective DPI < 150
   (Artelo's floor) fails loud — a `failed` `fulfillments` row (`dpi_below_minimum:<w>x<h>`)
   plus an order event — and the order is **not** submitted (the admin retry lever remains).
   Server renders always pass; this guards the client-fallback path and future size changes.
5. `POST /orders/create` with `customerAddress`, `items[].productInfo` (+ `designs[].sourceImage.url`
   = a **short-lived signed URL** for the chosen asset — every URL handed to Artelo is signed,
   never a raw private blob URL), `orderId` (our order number), `createdAt`, `currency`, `total`,
   `isTestOrder`.
6. Persist Artelo's returned `id` to `orders.artelo_order_id`; log the attempt + COGS to `fulfillments`.
7. Register the `OrderStatusChange` webhook once; Artelo POSTs to `/webhooks/artelo` on status changes →
   we map `InProduction/Shipped/Delivered/Canceled` to our status and record tracking.

## Observability

- `orders.artelo_order_id`, `orders.artelo_submitted_at`, `orders.artelo_status` (raw Artelo status).
- `fulfillments` — one row per submission attempt: request/response payloads, `is_test`, `attempt_count`,
  and Artelo's COGS (`production_cost_cents`, `shipping_cost_cents`, `tax_cents`). Margin = order
  `total_cents` − COGS.
- `order_events` — the human status timeline (source `artelo`).

## Gotchas

- **`createdAt` is required** on `/orders/create` (ISO string). Easy to miss.
- **`frameColor` + `frameStyle` are always required**, including unframed (`"Unframed"`).
- The print **asset must be a reachable URL** at submit time — Artelo fetches it. The PNG is a
  **private** Vercel Blob (it encodes the buyer's personal locations, so it must not be world-readable),
  so we mint a short-lived **signed** GET URL per asset at submit time (`signAssetUrl` in `backend/src/blob.ts`)
  and pass it as `designs[].sourceImage.url` (no separate upload/poll needed). Reprints re-sign from the
  retained blob. Legacy public blobs pass through unsigned, so in-flight orders keep working.
  - **Signed-URL TTL vs Artelo's fetch.** If Artelo lazily re-fetches the asset at production (not just at
    create), the signed URL must still be valid then — keep `BLOB_SIGNED_URL_TTL_DAYS` generous (default 30)
    and re-confirm Artelo's ingestion timing if shortening it.
- Webhook signature is `HMAC-SHA256(JSON.stringify(parsedBody), ARTELO_WEBHOOK_SECRET)` hex — Artelo
  re-stringifies the parsed body, so we verify against `JSON.stringify(JSON.parse(raw))`, not raw bytes.
- Webhook must respond < 10s; failed deliveries retry up to 20× then the webhook is auto-deleted.
- Submit is fire-and-forget from the Stripe webhook and never throws — a fulfilment failure must not
  fail the Stripe webhook (Stripe would retry). Failed attempts are logged for retry (admin "Retry").
- **`DELETE /orders/cancel` takes `id` as a QUERY param (`?id=<uuid>`), not a JSON body** — a body is
  ignored and the request fails validation. (`get-by-id` uses `?orderId=`; cancel uses `?id=`.)
- **Test/`Ignored` orders can't be cancelled** — cancel returns `400 "You cannot cancel this order"`.
  That's expected; the admin "Cancel" still refunds via Stripe and marks the order cancelled locally.
- **Design resolution is validated**: the source image must meet 150 DPI for the chosen size (e.g.
  x16x24 needs ≥ 2400×3600 px) or create-order returns a DPI 400. The server render is exactly
  300 DPI; our own pre-submit DPI floor guard (see Canonical flow) blocks anything below 150 DPI
  before Artelo ever sees it.
- **Artelo has no address-edit endpoint.** To change a shipping address after submission you must cancel
  + re-create (only possible pre-production). Admin "Edit address" updates our record only.
- **No Blob store = no physical orders.** The print asset is uploaded to Vercel Blob; if
  `BLOB_READ_WRITE_TOKEN` / a Blob store isn't configured, `POST /uploads/token` 503s and physical
  checkout can't complete. Provision a Blob store and set the token before going live.
- **Artwork lifecycle (cost + privacy).** A daily cron (`/jobs/blob-gc`, `CRON_SECRET`-guarded; see
  `backend/src/blobGc.ts`) deletes orphaned uploads (never tied to an order, older than
  `BLOB_ORPHAN_TTL_HOURS`) and artwork for terminal orders past `BLOB_RETENTION_DAYS`. Without it, every
  preview ever uploaded — most never bought — lives forever. Dry-run: `POST /jobs/blob-gc?dryRun=1`.

## Verify

```bash
# Readiness:
curl -s localhost:8787/health/integrations               # { "artelo": true|false, ... }
curl -i -X POST localhost:8787/webhooks/artelo            # malformed → 400; valid → 204

# Auth + catalogue (needs ARTELO_API_KEY):
curl -s -H "Authorization: Bearer $ARTELO_API_KEY" https://www.artelo.io/api/open/authentication/check
curl -s -H "Authorization: Bearer $ARTELO_API_KEY" -H 'content-type: application/json' \
  -X POST https://www.artelo.io/api/open/catalog/get-costs \
  -d '{"catalogProductId":"IndividualArtPrint","size":"x16x24","paperType":"MattePoster","frameStyle":"Unframed","shippingDestination":"US","quantity":1,"includeMats":false,"includeFramingService":false,"includeHangingPins":false}'

# Register the status webhook (returns the signing secret → ARTELO_WEBHOOK_SECRET):
curl -s -H "x-dev-seed-token: $DEV_SEED_TOKEN" -H 'content-type: application/json' \
  -X POST localhost:8787/dev/artelo/register-webhook \
  -d '{"url":"https://<public-host>/_/backend/webhooks/artelo"}'
```
