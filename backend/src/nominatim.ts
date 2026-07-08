import { Ratelimit } from "@upstash/ratelimit";
import type { GeoResult } from "@heartbound/shared";
import { getRedis, rk } from "./redis.js";

// Server-side geocoding client. Lives behind the route handlers so we can keep
// the key server-side (browsers never see it) and cache identical queries. Two
// cache tiers: an in-memory LRU (L1, per instance) in front of a shared Redis
// cache (L2), so a result geocoded on one serverless instance is reused by every
// other. All Redis paths degrade to the original per-instance behaviour when
// Redis is unconfigured.
//
// Upstream is MapTiler when MAPTILER_API_KEY is set (managed, has an SLA, allows
// storage, real autocomplete), and falls back to public Nominatim otherwise.
// The Nominatim path keeps the descriptive User-Agent + ~1 req/s gates that its
// usage policy demands; the MapTiler path skips those gates (high-limit paid
// API). Both upstreams map into the same GeoResult contract, so callers and the
// frontend are provider-agnostic. Cache keys are namespaced by provider so a
// key being added/removed never serves cross-provider entries.

const UA = "Heartbound Maps/1.0 (poster-map demo; contact htolley0@gmail.com)";
const BASE = "https://nominatim.openstreetmap.org";
const MAPTILER_BASE = "https://api.maptiler.com/geocoding";

/** The MapTiler key, or null when unset (→ Nominatim fallback). Read per-call. */
function getMaptilerKey(): string | null {
  return process.env.MAPTILER_API_KEY ?? null;
}

/** True when MAPTILER_API_KEY is present. No network call (for /health). */
export function isMaptilerConfigured(): boolean {
  return Boolean(process.env.MAPTILER_API_KEY);
}

const TIMEOUT_MS = 8000;
const MIN_INTERVAL_MS = 1100;
const CACHE_MAX = 500;

// L2 (Redis) TTLs: geocoding results are stable, so cache positives for a month;
// negatives (typos, no-match) for a day so a corrected query isn't stuck empty.
const TTL_POS_S = 60 * 60 * 24 * 30;
const TTL_NEG_S = 60 * 60 * 24;
const L2_TIMEOUT_MS = 600;

const cache = new Map<string, GeoResult[]>();

function cacheGet(key: string): GeoResult[] | undefined {
  const v = cache.get(key);
  if (v) {
    cache.delete(key); // re-insert to mark most-recently-used
    cache.set(key, v);
  }
  return v;
}

function cacheSet(key: string, val: GeoResult[]): void {
  cache.set(key, val);
  if (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
}

let lastCall = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Serialize upstream calls to no faster than one per ~1.1s (per instance). */
async function rateGate(): Promise<void> {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

// L2 read: returns the cached array (incl. [] for a cached negative), or undefined
// on a miss/error/timeout. A bounded race keeps a slow Redis off the hot path.
async function l2Get(key: string): Promise<GeoResult[] | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;
  try {
    const v = await Promise.race([
      redis.get<GeoResult[]>(key),
      sleep(L2_TIMEOUT_MS).then(() => undefined),
    ]);
    return v ?? undefined; // null (miss) → undefined; [] (negative) preserved
  } catch {
    return undefined;
  }
}

// L2 write: store the array directly (the SDK JSON-serializes — do NOT stringify).
async function l2Set(key: string, val: GeoResult[]): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, val, { ex: val.length > 0 ? TTL_POS_S : TTL_NEG_S });
  } catch {
    // best-effort: a failed cache write just means the next miss re-fetches
  }
}

// Distributed upstream gate: one Ratelimit shared via Redis so the *fleet-wide*
// rate to Nominatim stays ~1 req/1.1s, not N× that across instances. Best-effort
// — on contention it waits briefly then proceeds rather than failing the user.
let nominatimLimiter: Ratelimit | null = null;
function getNominatimLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  if (!nominatimLimiter) {
    nominatimLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, "1100 ms"),
      prefix: rk("geo"),
      analytics: false,
      timeout: 1000,
    });
  }
  return nominatimLimiter;
}

async function nominatimGate(): Promise<void> {
  const limiter = getNominatimLimiter();
  if (!limiter) return;
  try {
    const { success, reset } = await limiter.limit("nominatim:upstream");
    if (!success) {
      const wait = Math.min(Math.max(reset - Date.now(), 0), 1500);
      if (wait > 0) await sleep(wait);
    }
  } catch {
    // ignore — the per-instance rateGate() below still serializes
  }
}

type NominatimItem = {
  place_id?: number;
  osm_type?: string;
  osm_id?: number;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  type?: string;
  addresstype?: string;
  category?: string;
  error?: string;
};

function normalize(item: NominatimItem): GeoResult {
  const fullName = item.display_name ?? "";
  const label =
    item.name && item.name.trim() ? item.name : fullName.split(",")[0].trim();
  const id =
    item.place_id != null
      ? String(item.place_id)
      : `${item.osm_type ?? ""}${item.osm_id ?? ""}` || fullName;
  return {
    id,
    label,
    fullName,
    lat: Number(item.lat),
    lng: Number(item.lon),
    kind: item.addresstype ?? item.type ?? item.category,
  };
}

// MapTiler returns a GeoJSON FeatureCollection. We only need a few fields.
type MaptilerFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  place_type?: string[];
  center?: [number, number]; // [lng, lat]
  properties?: { kind?: string; place_designation?: string; country_code?: string };
};

export function normalizeMaptiler(f: MaptilerFeature): GeoResult {
  const center = Array.isArray(f.center) ? f.center : [NaN, NaN];
  const fullName = f.place_name ?? "";
  const label =
    f.text && f.text.trim() ? f.text : (fullName.split(",")[0]?.trim() ?? "");
  return {
    id: f.id ?? fullName,
    label,
    fullName,
    lng: Number(center[0]),
    lat: Number(center[1]),
    // Best analog to Nominatim's addresstype, used for the result "kind" chip.
    kind: f.properties?.place_designation ?? f.properties?.kind ?? f.place_type?.[0],
  };
}

const finite = (r: GeoResult): boolean =>
  Number.isFinite(r.lat) && Number.isFinite(r.lng);

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en",
      Referer: "https://heartboundmaps.com",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Error carries only the status, never the URL (which holds the MapTiler key).
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  return res.json();
}

// Forward query against the active upstream. MapTiler when keyed (autocomplete,
// no rate gate); else the gated Nominatim path.
async function searchUpstream(q: string): Promise<GeoResult[]> {
  const key = getMaptilerKey();
  if (key) {
    const url = `${MAPTILER_BASE}/${encodeURIComponent(q)}.json?key=${key}&autocomplete=true&limit=8&language=en`;
    const data = (await fetchJson(url)) as { features?: MaptilerFeature[] };
    return (data.features ?? []).map(normalizeMaptiler).filter(finite);
  }
  await nominatimGate();
  await rateGate();
  const url = `${BASE}/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`;
  const data = (await fetchJson(url)) as NominatimItem[];
  return Array.isArray(data) ? data.map(normalize).filter(finite) : [];
}

// Reverse query against the active upstream. MapTiler reverse takes `lng,lat`.
async function reverseUpstream(
  lat: number,
  lng: number,
): Promise<GeoResult | null> {
  const key = getMaptilerKey();
  if (key) {
    const url = `${MAPTILER_BASE}/${lng},${lat}.json?key=${key}&limit=1&language=en`;
    const data = (await fetchJson(url)) as { features?: MaptilerFeature[] };
    const f = data.features?.[0];
    const r = f ? normalizeMaptiler(f) : null;
    return r && finite(r) ? r : null;
  }
  await nominatimGate();
  await rateGate();
  const url = `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const data = (await fetchJson(url)) as NominatimItem;
  if (!data || data.error) return null;
  const r = normalize(data);
  return finite(r) ? r : null;
}

export async function geocodeSearch(q: string): Promise<GeoResult[]> {
  const provider = getMaptilerKey() ? "mt" : "osm";
  const norm = q.trim().toLowerCase();
  const l1Key = `s:${provider}:${norm}`;
  const l1 = cacheGet(l1Key);
  if (l1) return l1;
  const l2Key = rk("geo", provider, "s", norm);
  const l2 = await l2Get(l2Key);
  if (l2) {
    cacheSet(l1Key, l2);
    return l2;
  }
  const results = await searchUpstream(q);
  cacheSet(l1Key, results);
  await l2Set(l2Key, results);
  return results;
}

export async function geocodeReverse(
  lat: number,
  lng: number,
): Promise<GeoResult | null> {
  const provider = getMaptilerKey() ? "mt" : "osm";
  const coords = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const l1Key = `r:${provider}:${coords}`;
  const l1 = cacheGet(l1Key);
  if (l1) return l1[0] ?? null;
  const l2Key = rk("geo", provider, "r", coords);
  const l2 = await l2Get(l2Key);
  if (l2) {
    cacheSet(l1Key, l2);
    return l2[0] ?? null;
  }
  const result = await reverseUpstream(lat, lng);
  if (!result) {
    cacheSet(l1Key, []);
    await l2Set(l2Key, []);
    return null;
  }
  cacheSet(l1Key, [result]);
  await l2Set(l2Key, [result]);
  return result;
}
