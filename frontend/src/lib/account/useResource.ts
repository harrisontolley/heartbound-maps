"use client";

import { useCallback, useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { ApiError, apiGet } from "@/lib/apiClient";
import { describeError, type AccountError } from "@/lib/account/errorCopy";

// Client data hook for the account section. Fetches a backend resource with the
// Neon Auth Bearer token attached (via apiGet → apiFetch). Pass null to skip.
//
// Two robustness measures keep users from ever seeing a raw HTTP error:
//   • The fetch is deferred until the Neon Auth session resolves, so we never
//     fire before the JWT is mintable (the cause of the spurious mount-time 401).
//   • A 401 is retried once — the second authToken() call mints/refreshes the
//     token — before the error is surfaced as friendly copy.
//
// Follows the repo's fetch-in-effect convention (see useGeocodeSearch): the effect
// only calls setState *after* the await, never synchronously, and the transient
// loading/stale state is derived during render — so there are no cascading renders.

export type Resource<T> = {
  data: T | null;
  error: AccountError | null;
  loading: boolean;
  reload: () => Promise<void>;
};

async function fetchWithAuthRetry<T>(path: string): Promise<T> {
  try {
    return await apiGet<T>(path);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      // Token may have just expired or not yet been minted; one more attempt
      // forces a fresh token via authToken() before we give up.
      return await apiGet<T>(path);
    }
    throw e;
  }
}

export function useResource<T>(path: string | null): Resource<T> {
  const session = authClient.useSession();
  const ready = !session.isPending;
  const signedIn = Boolean(session.data);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<AccountError | null>(null);
  const [loadedPath, setLoadedPath] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!path) return;
    if (!ready) return; // wait for the session to resolve before fetching
    let cancelled = false;
    void (async () => {
      // Session resolved to signed-out: surface an auth error rather than a 401.
      if (!signedIn) {
        if (cancelled) return;
        setData(null);
        setError(describeError(new ApiError(401, "unauthorized", path)));
        setLoadedPath(path);
        return;
      }
      try {
        const result = await fetchWithAuthRetry<T>(path);
        if (cancelled) return;
        setData(result);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setData(null);
        setError(describeError(e));
      } finally {
        if (!cancelled) setLoadedPath(path);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [path, tick, ready, signedIn]);

  const reload = useCallback(async () => {
    setLoadedPath(null); // force the stale state so retries show the loader
    setTick((t) => t + 1);
  }, []);

  // Derived: while the session is resolving, or the loaded path lags the
  // requested one, show loading (not the previous path's data/error).
  const stale = loadedPath !== path;
  return {
    data: stale ? null : data,
    error: stale ? null : error,
    loading: path !== null && (!ready || stale),
    reload,
  };
}
