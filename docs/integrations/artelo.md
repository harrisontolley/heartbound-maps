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
| `BLOB_READ_WRITE_TOKEN` | backend | Vercel Blob token — stores the print-ready PNG the browser uploads. |

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
- `packages/shared/src/commerce.ts` — `ARTELO_PRODUCT_BY_ID` + `arteloProductInfoFor()`:
  our `productId` → Artelo `productInfo` (catalog product, paper, frame, size, orientation).
- Frontend: `lib/export/exportPngBlob` (rasterize) + `lib/upload/uploadPosterPng` (Blob upload),
  wired from `components/PosterStudio.tsx` at add-to-cart.

## Verification status (2026-06-28)

Verified end-to-end against the **live** Artelo API with the production key:

- `authentication/check` → `200 {success:true}`.
- `POST /catalog/get-costs` and `POST /orders/create` accept our exact mapping for all three
  sizes, unframed **and** framed (`frameStyle:"Oak"`, `frameColor:"BlackOak"`). Test orders
  (`isTestOrder:true`) return `status:"Ignored"` with the COGS breakdown in `details`.
- `GET /orders/get-by-id?orderId=…` and `DELETE /orders/cancel?id=…` confirmed.

Live landed COGS (production + US shipping), Matte Poster 2:3 — used for pricing/margins:

| size | unframed | framed (Oak) |
| --- | --- | --- |
| 12×18 | $11.62 | $33.86 |
| 16×24 | $14.14 | $44.35 |
| 24×36 | $23.55 | $89.16 |

## Product mapping (confirmed against the live validator)

An Artelo order line references a product by **attributes**, not a SKU. The offered
2:3 portrait ladder maps to the **Poster + Matte** line:

| productId | catalogProductId | paperType | size | orientation |
| --- | --- | --- | --- | --- |
| `portrait-12x18` | `IndividualArtPrint` | `MattePoster` | `x12x18` | `Vertical` |
| `portrait-16x24` | `IndividualArtPrint` | `MattePoster` | `x16x24` | `Vertical` |
| `portrait-24x36` | `IndividualArtPrint` | `MattePoster` | `x24x36` | `Vertical` |

Confirmed enum values (from `POST /catalog/get-costs` and `/orders/create` validation errors):
- **size**: leading-`x` WxH inches, e.g. `x12x18`, `x16x24`, `x24x36` (and many more).
- **paperType**: `MattePoster`, `GlossyPoster`, `SemiGlossPoster`, `SemiMatteLinenPoster`,
  `GlossyPhoto`/`LusterPhoto`/`PearlPhoto`/`MattePhoto`/`SemiMattePhoto`/`RagSatinPhoto`,
  `ArchivalMatteFineArt`/`HotPressFineArt`/`ColdPressFineArt`/`WatercolorFineArt`/`VelvetFineArt`/`PearlFineArt`/`GermanEtchingFineArt`, `Foil`.
- **frameStyle**: `Unframed`, `Oak`, `Metal`, `PremiumOak`, `PremiumMetal`.
- **frameColor** (required even when unframed): `Unframed`, `{Natural,Black,White,Walnut}Oak`,
  `{White,Black,Silver,Gold}Metal`, plus the `Premium*` variants. Default framed = `Oak`/`BlackOak`.

To retune paper/frame, edit `ARTELO_PRODUCT_BY_ID` in `packages/shared/src/commerce.ts`.

## Canonical flow

1. Browser rasterizes the poster to a print-ready PNG at add-to-cart and uploads it to
   Vercel Blob (client-upload via `POST /uploads/token`); the public URL rides along to checkout.
2. Stripe webhook (`checkout.session.completed`) marks the order `paid` and calls
   `submitOrderToArtelo`.
3. `POST /orders/create` with `customerAddress`, `items[].productInfo` (+ `designs[].sourceImage.url`
   = the Blob URL), `orderId` (our order number), `createdAt`, `currency`, `total`, `isTestOrder`.
4. Persist Artelo's returned `id` to `orders.artelo_order_id`; log the attempt + COGS to `fulfillments`.
5. Register the `OrderStatusChange` webhook once; Artelo POSTs to `/webhooks/artelo` on status changes →
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
- The print **asset must be a publicly reachable URL** at submit time — Artelo fetches it.
  We pass the Vercel Blob URL as `designs[].sourceImage.url` (no separate upload/poll needed).
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
  x16x24 needs ≥ 2400×3600 px) or create-order returns a DPI 400. The studio rasterizes at print size.
- **Artelo has no address-edit endpoint.** To change a shipping address after submission you must cancel
  + re-create (only possible pre-production). Admin "Edit address" updates our record only.
- **No Blob store = no physical orders.** The print asset is uploaded to Vercel Blob; if
  `BLOB_READ_WRITE_TOKEN` / a Blob store isn't configured, `POST /uploads/token` 503s and physical
  checkout can't complete. Provision a Blob store and set the token before going live.

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
