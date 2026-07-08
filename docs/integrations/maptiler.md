# MapTiler (geocoding + optional basemap)

Geocoding powers the location selector: forward search/autocomplete in `PlaceSearch`
and reverse geocoding when you click-to-drop a pin on the map. The default upstream is
the **public Nominatim** endpoint, which has no SLA and is restricted by the
[OSMF usage policy](https://operations.osmfoundation.org/policies/nominatim/) (≈1 req/s,
"serious business usage is discouraged," may be blocked without notice). MapTiler is a
managed, SLA-backed geocoder that **permits storing results** and offers real
autocomplete.

**Env-guarded** exactly like the other integrations: unset `MAPTILER_API_KEY` →
geocoding falls back to Nominatim, so the app builds/runs and tests stay hermetic
without a key. Set the key → MapTiler. The frontend never changes — both upstreams map
into the same `GeoResult` contract (`packages/shared`).

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `MAPTILER_API_KEY` | backend | Key from <https://cloud.maptiler.com/account/keys/> (free tier). **Server-only** — read only in `backend/src/nominatim.ts`, never `NEXT_PUBLIC_`. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | frontend | **Optional.** MapLibre basemap style for the picker. Unset → keyless OpenFreeMap "positron". Set to a MapTiler style URL (`…/style.json?key=…`) for an SLA-backed basemap. Publishable — restrict the key to your domains. |

## Where the code lives

- `backend/src/nominatim.ts` — `getMaptilerKey()` / `isMaptilerConfigured()`; `searchUpstream` / `reverseUpstream` branch on the key (MapTiler skips the Nominatim ~1 req/s gates — it's a high-limit paid API), `normalizeMaptiler()` maps the GeoJSON FeatureCollection → `GeoResult`. The two-tier cache (L1 LRU + L2 Redis) is preserved; cache keys are namespaced by provider (`mt` / `osm`) so flipping the key never serves cross-provider entries.
- `backend/src/app.ts` — `/geocode/search` + `/geocode/reverse` routes (unchanged); `/health/integrations` reports `maptiler`.
- `frontend/src/components/map/MapPicker.tsx` — MapLibre GL picker; basemap from `NEXT_PUBLIC_MAP_STYLE_URL` (defaults to OpenFreeMap).

## Gotchas

- **Endpoint shapes:** forward is `…/geocoding/{query}.json?key=…&autocomplete=true`; reverse is `…/geocoding/{lng},{lat}.json?key=…` — note **lng,lat** order (the opposite of Nominatim's `lat`/`lon` params).
- **Key in the URL:** the key is a query param. `fetchJson` errors carry only the HTTP status, never the URL — keep it that way so the key can't leak into logs/Sentry.
- **Billing model:** geocoding is billed per request (free tier ~100k/mo on the free plan; check current limits). Pick "sessions" vs per-request tracking in the MapTiler dashboard to suit autocomplete. Storage of results is permitted (unlike Mapbox's Temporary geocoding) — relevant because we persist the chosen coordinate to print the poster.

## Verify

`GET /health/integrations` → `"maptiler": true` once the key is set. Then in the studio
(Step 2 / Step 3) search a city (autocomplete) and click the map (reverse geocode);
results should be identical in shape to the Nominatim path. Unit tests:
`pnpm --filter @heartbound/backend exec vitest run src/nominatim.test.ts`.
