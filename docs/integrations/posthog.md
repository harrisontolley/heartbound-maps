# PostHog

Product analytics, session replay, feature flags, and error tracking — all four are
wired in the client provider. Initialisation is **env-guarded**: with no
`NEXT_PUBLIC_POSTHOG_KEY` the provider is a no-op, so the app builds and runs without
it (and tests/CI stay clean).

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_POSTHOG_KEY` | frontend | `phc_…` project key. Safe to expose. |
| `NEXT_PUBLIC_POSTHOG_HOST` | frontend | `/ingest` — the reverse-proxy path (below). |
| `NEXT_PUBLIC_POSTHOG_UPSTREAM` | frontend | Region the proxy forwards to (`us`/`eu`). |
| `POSTHOG_PROJECT_API_KEY` | backend | Same kind of `phc_…` project key, for server-side capture (`backend/src/posthog.ts`). Separate from the frontend's so it can be rotated/disabled independently. Leave unset to disable. |
| `POSTHOG_HOST` | backend | Capture API base URL, e.g. `https://us.i.posthog.com` (no `/ingest` proxy needed server-side — no ad blocker in the loop). |
| `POSTHOG_PERSONAL_API_KEY` | backend/MCP | Only for the PostHog MCP server, not the app. |

Project key: <https://us.posthog.com> → Project settings.

## Where the code lives

- `frontend/src/app/providers.tsx` — `"use client"` `PostHogProvider`. Enables
  autocapture + pageviews, **session replay**, and **exception capture**. No-ops when
  the key is unset.
- `frontend/src/app/layout.tsx` — wraps `{children}` in `<Providers>`.
- `frontend/src/lib/flags.ts` — `useFeatureFlag(key)` helper (the flag pattern; no flag
  is consumed yet).
- `frontend/next.config.ts` — `rewrites()` reverse-proxy: `/ingest/*` → PostHog.
- `frontend/src/lib/analytics/events.ts` + `useTrackEvent.ts` — the typed client
  event registry; call sites use `useTrackEvent()`, never raw `posthog.capture()`.
- `backend/src/posthog.ts` — `capturePostHogServerEvent(event, distinctId, props)`,
  a lazy/env-guarded fetch wrapper (no SDK) for the canonical server-side events
  (`checkout_completed` in `webhooks.ts`, `order_fulfilled` in `fulfillment.ts`).

## Reverse proxy (why `/ingest`)

Ad blockers drop requests to `*.posthog.com`. Routing events through our own origin
(`/ingest`) keeps capture working. `NEXT_PUBLIC_POSTHOG_HOST=/ingest` tells `posthog-js`
to send there; `next.config.ts` rewrites `/ingest/*` to `NEXT_PUBLIC_POSTHOG_UPSTREAM`.

## The four capabilities

- **Product analytics** — autocapture + manual `posthog.capture('event', props)`.
- **Session replay** — `disable_session_recording: false` in the provider; **mask
  inputs by default** for privacy (`maskAllInputs`). Don't record payment fields.
- **Feature flags** — read via `useFeatureFlag` / `posthog.isFeatureEnabled(key)`;
  bootstrap from the provider to avoid a flicker on first paint.
- **Error tracking** — exceptions auto-captured; PostHog replaces Sentry here.

## Gotchas

- Only `NEXT_PUBLIC_*` is available in the browser — never reference a secret here.
- Initialise once, client-side only (the provider handles this); never `init` in a
  Server Component.
- Mask PII in replays; exclude the (future) checkout fields.

## Verify

```bash
pnpm --filter @pinprint/frontend build      # builds with and without the key set
# With NEXT_PUBLIC_POSTHOG_KEY set, run `pnpm dev` and confirm requests hit /ingest in
# the browser Network tab and events land in the PostHog dashboard.
```

## MCP

The PostHog MCP server is in `.mcp.json` (`https://mcp.posthog.com/mcp`, Bearer
`POSTHOG_PERSONAL_API_KEY`) — query insights, flags, and errors from the agent session.

## Event taxonomy

Client-side event names + property shapes are typed in
`frontend/src/lib/analytics/events.ts` (`ANALYTICS_EVENTS`,
`AnalyticsEventProps`) — that file is the source of truth; this table is a
human-readable summary. Fire client events through `useTrackEvent()`
(`frontend/src/lib/analytics/useTrackEvent.ts`), not raw `posthog.capture()`,
so the event name/property shape is checked at compile time. Server-side
events (marked below) are captured from `backend/src/posthog.ts` instead,
since they must be trustworthy even when client JS never runs.

| Event | Fired | Key properties |
| --- | --- | --- |
| `landing_cta_click` | Any tracked `LinkButton` click (pass `trackId`/`trackLocation`) | `cta_id`, `location`, `href` |
| `faq_item_expand` | An FAQ `<details>` opened (`FaqItemRow`) | `question`, `group` |
| `studio_step_advance` | Wizard step changes (`PosterStudio.goTo`) | `from_step`, `to_step`, `direction` (`next`/`back`/`jump`) |
| `look_selected` | A look card picked, in the studio grid or the landing style gallery | `look_id`, `template_id`, `source` (`studio_grid`/`landing_gallery`) |
| `place_added` | A place added/promoted in the studio (`StepPlaces`) | `places_count`, `affiliation_type`, `outcome` (`home`/`added`/`duplicate`) |
| `size_selected` | A size card picked (`SizePicker`) | `product_id`, `price_cents` |
| `frame_selected` | Frame material/color chosen (`FrameUpsellCard`) | `frame_material`, `frame_color`, `upcharge_cents` |
| `add_to_cart` | An item added to cart (`PosterStudio.addToCart`) | `product_id`, `format`, `framed` |
| `mailing_list_signup` | Mailing-list form submitted (`MailingListForm`) | `reasons`, `has_other_text` |
| `checkout_started` / `checkout_failed` | Cart checkout click / API error (`cart/page.tsx`) | `cart_item_count`, `subtotal_cents` / `error_code` |
| `checkout_success_viewed` | Success page resolves order status (`checkout/success`, once per order) | `order_number`, `status` |
| `checkout_completed` *(server)* | Order marked paid (webhook) | `order_id`, `total_cents`, `currency` |
| `order_fulfilled` *(server)* | Artelo submission succeeds | `order_id`, `is_test_order` |

Admin mutations are deliberately *not* PostHog events — they're durably logged to
the `admin_actions` table (see `docs/admin.md`), which is the better audit trail.
