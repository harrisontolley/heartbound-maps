import type { GeoResult } from "@pinprint/shared";

// Server-side Nominatim client. Lives behind the route handlers so we can set a
// descriptive User-Agent (browsers can't), respect the ~1 req/s usage policy,
// and cache identical queries. Module-scope state persists per server instance.

const UA = "Pinprint/1.0 (poster-map demo; contact htolley0@gmail.com)";
const BASE = "https://nominatim.openstreetmap.org";
const TIMEOUT_MS = 8000;
const MIN_INTERVAL_MS = 1100;
const CACHE_MAX = 500;

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

/** Serialize upstream calls to no faster than one per ~1.1s. */
async function rateGate(): Promise<void> {
  const wait = lastCall + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
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
  const key = `s:${q.trim().toLowerCase()}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  await rateGate();
  const url = `${BASE}/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=8`;
  const data = (await fetchJson(url)) as NominatimItem[];
  const results = Array.isArray(data)
    ? data.map(normalize).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
    : [];
  cacheSet(key, results);
  return results;
}

export async function geocodeReverse(
  lat: number,
  lng: number,
): Promise<GeoResult | null> {
  const key = `r:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const hit = cacheGet(key);
  if (hit) return hit[0] ?? null;
  await rateGate();
  const url = `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
  const data = (await fetchJson(url)) as NominatimItem;
  if (!data || data.error) {
    cacheSet(key, []);
    return null;
  }
  const result = normalize(data);
  cacheSet(key, [result]);
  return result;
}
