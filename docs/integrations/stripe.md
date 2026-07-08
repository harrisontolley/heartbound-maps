# Stripe

Payments. Checkout is fully built: `backend/src/checkout.ts::priceCheckout()`
prices every cart server-side from `packages/shared/src/commerce.ts` and hands
Stripe **inline `price_data`** per line item — there is no persistent Stripe
Product/Price catalogue to manage, even with 8 frame color variants, since the
price is computed fresh per request rather than looked up by a price ID.

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | backend | `sk_test_…` in dev. Never reaches the client. |
| `STRIPE_WEBHOOK_SECRET` | backend | `whsec_…`. Verifies the webhook signature. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | frontend | `pk_test_…`. Safe to expose; used by Stripe.js at checkout (not wired yet). |

Test keys: <https://dashboard.stripe.com/test/apikeys>. Stay in **test mode**.

## Where the code lives

- `backend/src/stripe.ts` — lazy, env-guarded client (`getStripe()` returns `null`
  when `STRIPE_SECRET_KEY` is unset), `isConfigured()`, and `constructWebhookEvent()`.
- `backend/src/app.ts` → `registerRoutes()` — `POST /webhooks/stripe` and the
  `stripe` field of `GET /health/integrations`.
- Order/payment types that the frontend will read go in `packages/shared/src/index.ts`.

## Webhooks

The single biggest footgun: **signature verification needs the raw, unparsed request
body.** Do not `JSON.parse` before verifying. The handler reads `await c.req.text()`
and the `stripe-signature` header, then calls `stripe.webhooks.constructEvent(raw,
sig, STRIPE_WEBHOOK_SECRET)`. A bad/missing signature → `400`. The route is mounted at
both `/webhooks/stripe` and `/_/backend/webhooks/stripe` (Vercel does not strip the
service prefix — see `app.ts`).

### Local webhook loop (Stripe CLI)

```bash
stripe login
stripe listen --forward-to localhost:8787/webhooks/stripe   # prints whsec_… → STRIPE_WEBHOOK_SECRET
stripe trigger payment_intent.succeeded                       # fire a test event
```

## Gotchas

- Raw body for signatures (above). Amounts are in the **smallest currency unit**
  (pence/cents), integers. Make every mutation **idempotent** (Stripe retries
  webhooks; use the event `id`). Treat `payment_intent.succeeded` (or
  `checkout.session.completed`) as the source of truth for "paid", never the client.

## Verify

```bash
pnpm --filter @heartbound/backend test       # hermetic signature accept/reject (backend/src/stripe.test.ts)
curl -s localhost:8787/health/integrations  # { "stripe": true|false, ... }
curl -i -X POST localhost:8787/webhooks/stripe   # no signature → 400
```

## MCP

The Stripe MCP server is in `.mcp.json` (`npx @stripe/mcp`, reads `STRIPE_SECRET_KEY`).
It can inspect test-mode objects and search Stripe docs from the agent session.

## Go-live checklist

Everything above is built and verified in **test mode**. These are the
remaining steps — all user-executed, none of them a code change — before
real checkout can accept a real card. Do them in this order:

1. ~~Register the live webhook endpoint.~~ **DONE 2026-07-08**: endpoint
   `we_1TqurIR7frRQ6vdr4kmYljTu` (live mode) at
   `https://heartboundmaps.com/_/backend/webhooks/stripe`, subscribed to
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `payment_intent.succeeded`, `charge.refunded`, `checkout.session.expired`,
   and `charge.dispute.created` (the events `backend/src/webhooks.ts::
   handleStripeEvent` switches on). NOTE the webhook URL needs the
   `/_/backend` service prefix — Vercel routes the bare `/webhooks/stripe`
   path to the frontend, which 404s.
2. ~~Add the live keys to Vercel Production~~ **DONE 2026-07-08**:
   `STRIPE_SECRET_KEY` (`sk_live_…`) and `STRIPE_WEBHOOK_SECRET` (the
   endpoint's `whsec_…`) are both set in Vercel Production; they activate on
   the next production deploy.
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` isn't actually used yet (Checkout is
   server-redirected, not Stripe.js-embedded) — skip it unless that changes.
3. **No product/price migration needed.** Since pricing is dynamic
   `price_data`, there's nothing to "promote" from test to live mode — the
   same code path just starts hitting Stripe's live API once the key changes.
4. **Run real test-card purchases against the live-configured deploy**
   before announcing launch, including one framed order **per material (one
   oak, one metal)** — confirm each order reaches `paid`, a `fulfillments`
   row appears, and the digital-delivery email sends. Per-material matters:
   only `PremiumOak`/`NaturalOak` has ever been verified against Artelo's
   live order validator (the 2026-07-03 COGS spike only priced the others),
   and `submitOrderToArtelo` swallows submission errors — a rejected
   frameStyle/frameColor combo would be a paid order that silently never
   gets produced. (Once real, immediately also flip `ARTELO_TEST_ORDERS` to
   `false` in Vercel — see docs/integrations/artelo.md — or Stripe will
   charge real money for orders Artelo silently never produces.)
5. **Revert to test mode is just as easy**: swap the keys back. Nothing else
   depends on which mode is active.
