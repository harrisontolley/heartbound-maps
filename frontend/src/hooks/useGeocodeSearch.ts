"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import type { GeoResult } from "@/lib/types";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";

export type GeoStatus = "idle" | "loading" | "success" | "empty" | "error";

/**
 * Debounced autocomplete against the backend /geocode/search. Cancels in-flight requests
 * on each keystroke and only fires once the query reaches `minLength`.
 *
 * The transient states (idle for short queries, loading while the current query
 * has no fresh result yet) are derived during render — the effect only calls
 * setState asynchronously when a response arrives, so there are no cascading
 * renders and no stale-result flash when the query changes.
 */
export function useGeocodeSearch(
  query: string,
  { minLength = 3, debounceMs = 350 }: { minLength?: number; debounceMs?: number } = {},
) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [loadedQuery, setLoadedQuery] = useState("");
  const track = useTrackEvent();

  useEffect(() => {
    const q = query.trim();
    if (q.length < minLength) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/geocode/search?q=${encodeURIComponent(q)}`), {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as GeoResult[];
        setResults(data);
        setStatus(data.length ? "success" : "empty");
        setLoadedQuery(q);
        if (data.length === 0) {
          // The debounce means this fires once per settled query, not per
          // keystroke. Only the length is sent — the query itself could be a
          // home address (see events.ts).
          track(ANALYTICS_EVENTS.placeSearchFailed, {
            query_length: q.length,
            reason: "no_results",
          });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
        setStatus("error");
        setLoadedQuery(q);
        track(ANALYTICS_EVENTS.placeSearchFailed, {
          query_length: q.length,
          reason: "error",
        });
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, minLength, debounceMs, track]);

  const q = query.trim();
  const tooShort = q.length < minLength;
  const fresh = loadedQuery === q;
  const effStatus: GeoStatus = tooShort ? "idle" : fresh ? status : "loading";
  const effResults = tooShort || !fresh ? [] : results;

  return { results: effResults, status: effStatus };
}
