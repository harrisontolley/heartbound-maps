"use client";

import { apiUrl } from "@/lib/api";

// Authenticated client-side calls to the Hono backend. The Neon Auth session lives
// in the browser, so the JWT is attached here (not from an RSC) — which also makes
// it work in local dev, where the frontend (:3000) and backend (:8787) are
// cross-origin and the auth cookie is never sent to the backend.

// Minting the backend JWT is subtle on the Next client:
//   • createAuthClient() returns the raw Better Auth client, which has NO real
//     getJWTToken() — accessing it proxies to a nonexistent
//     /api/auth/get-j-w-t-token (404).
//   • The session object's own `token` field is the *opaque* session token, not
//     a JWKS-signed JWT, so the backend's jwtVerify rejects it.
// The JWKS-verifiable JWT comes from Neon Auth's dedicated /token endpoint. We
// hit it through the same-origin proxy; the httpOnly session cookie authenticates
// the request and the body is { token }.

/** Current session JWT for the backend, or null when signed out / unavailable. */
export async function authToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/token", {
      headers: { accept: "application/json" },
      credentials: "same-origin",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: string | null };
    return body?.token ?? null;
  } catch {
    return null;
  }
}

/** fetch() against the backend with the Bearer token attached when signed in. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await authToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(apiUrl(path), { ...init, headers });
}

/**
 * Error from a non-2xx backend response. Carries the HTTP `status` and the
 * backend's machine `code` (the `error` field, e.g. "unauthorized",
 * "auth_unconfigured", "not_found") so callers can render user-facing copy
 * instead of the raw `message` (which is for logs only — never shown to users).
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    readonly path: string,
  ) {
    super(`GET ${path} → ${status}${code ? ` (${code})` : ""}`);
    this.name = "ApiError";
  }
}

/** Best-effort read of the backend's `{ error: "code" }` body; null if absent. */
async function errorCode(res: Response): Promise<string | null> {
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

/** Convenience: GET + parse JSON, throwing an {@link ApiError} on a non-2xx response. */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) throw new ApiError(res.status, await errorCode(res), path);
  return (await res.json()) as T;
}

/** Convenience: send a JSON body with `method`, parse JSON, throw on non-2xx. */
export async function apiSend<T>(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body?: unknown,
): Promise<T> {
  const res = await apiFetch(path, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) throw new ApiError(res.status, await errorCode(res), path);
  return (await res.json().catch(() => ({}))) as T;
}
