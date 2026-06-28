import { Ratelimit } from "@upstash/ratelimit";
import type { GeoResult } from "@pinprint/shared";
import { getRedis, rk } from "./redis.js";

// Server-side Nominatim client. Lives behind the route handlers so we can set a
// descriptive User-Agent (browsers can't), respect the ~1 req/s usage policy,
// and cache identical queries. Two cache tiers: an in-memory LRU (L1, per
// instance) in front of a shared Redis cache (L2), so a result geocoded on one
// serverless instance is reused by every other. A distributed gate keeps the
// fleet-wide upstream rate within Nominatim's policy. All Redis paths degrade to
// the original per-instance behaviour when Redis is unconfigured.

const UA = "Pinprint/1.0 (poster-map demo; contact htolley0@gmail.com)";
const BASE = "https://nominatim.openstreetmap.org";
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

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      "Accept-Language": "en",
      Referer: "https://pinprint.app",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

export async function geocodeSearch(q: string): Promise<GeoResult[]> {
  const norm = q.trim().toLowerCase();
  const l1Key = `s:${norm}`;
  const l1 = cacheGet(l1Key);
  if (l1) return l1;
  const l2Key = rk("geo", "s", norm);
  const l2 = await l2Get(l2Key);
  if (l2) {
    cacheSet(l1Key, l2);
    return l2;
  }
  await nominatimGate();
  await rateGate();
  const url = `${BASE}/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`;
  const data = (await fetchJson(url)) as NominatimItem[];
  const results = Array.isArray(data)
    ? data.map(normalize).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
    : [];
  cacheSet(l1Key, results);
  await l2Set(l2Key, results);
  return results;
}

export async function geocodeReverse(
  lat: number,
  lng: number,
): Promise<GeoResult | null> {
  const coords = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const l1Key = `r:${coords}`;
  const l1 = cacheGet(l1Key);
  if (l1) return l1[0] ?? null;
  const l2Key = rk("geo", "r", coords);
  const l2 = await l2Get(l2Key);
  if (l2) {
    cacheSet(l1Key, l2);
    return l2[0] ?? null;
  }
  await nominatimGate();
  await rateGate();
  const url = `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const data = (await fetchJson(url)) as NominatimItem;
  if (!data || data.error) {
    cacheSet(l1Key, []);
    await l2Set(l2Key, []);
    return null;
  }
  const result = normalize(data);
  cacheSet(l1Key, [result]);
  await l2Set(l2Key, [result]);
  return result;
}
