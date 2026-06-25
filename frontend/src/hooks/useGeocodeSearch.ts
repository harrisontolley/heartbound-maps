"use client";

import { useEffect, useState } from "react";
import type { GeoResult } from "@/lib/types";

export type GeoStatus = "idle" | "loading" | "success" | "empty" | "error";

/**
 * Debounced autocomplete against /api/geocode/search. Cancels in-flight requests
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

  useEffect(() => {
    const q = query.trim();
    if (q.length < minLength) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("request failed");
        const data = (await res.json()) as GeoResult[];
        setResults(data);
        setStatus(data.length ? "success" : "empty");
        setLoadedQuery(q);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
        setStatus("error");
        setLoadedQuery(q);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, minLength, debounceMs]);

  const q = query.trim();
  const tooShort = q.length < minLength;
  const fresh = loadedQuery === q;
  const effStatus: GeoStatus = tooShort ? "idle" : fresh ? status : "loading";
  const effResults = tooShort || !fresh ? [] : results;

  return { results: effResults, status: effStatus };
}
