// Artelo print-on-demand fulfilment. No SDK — a thin fetch wrapper, scaffolded
// like db.ts: env-guarded, null when unconfigured so the app builds without a key.
// Bearer-auth against the Artelo "open" API. See docs/integrations/artelo.md.
//
// Artelo has no separate sandbox host — orders carry an `isTestOrder` flag (test
// orders are marked "Ignored", never produced, never charged). We default to test
// mode so nothing real is produced until ARTELO_TEST_ORDERS is explicitly "false".

import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_BASE = "https://www.artelo.io/api/open";

export type ArteloConfig = {
  apiKey: string;
  baseUrl: string;
  /** When true, orders are submitted with isTestOrder=true (nothing produced). */
  testOrders: boolean;
};

/** Returns Artelo config, or null when ARTELO_API_KEY is not configured. */
export function getArteloConfig(): ArteloConfig | null {
  const apiKey = process.env.ARTELO_API_KEY;
  if (!apiKey) return null;
  const baseUrl = (process.env.ARTELO_API_BASE ?? DEFAULT_BASE).replace(/\/$/, "");
  // Default to test orders; only real fulfilment when explicitly opted out.
  const testOrders = process.env.ARTELO_TEST_ORDERS !== "false";
  return { apiKey, baseUrl, testOrders };
}

/** Whether the Artelo API key is present (no network call). */
export function isArteloConfigured(): boolean {
  return Boolean(process.env.ARTELO_API_KEY);
}

/** The HMAC secret Artelo signs webhook bodies with (from POST /webhooks/save). */
export function getArteloWebhookSecret(): string | null {
  return process.env.ARTELO_WEBHOOK_SECRET ?? null;
}

/**
 * Verify an Artelo webhook signature. Artelo signs with
 * `HMAC-SHA256(JSON.stringify(body), secret)` (hex) and sends it in the
 * `x-artelo-signature` header (their documented scheme re-stringifies the parsed
 * body, so we mirror that). Returns true when the signature matches.
 *
 * When ARTELO_WEBHOOK_SECRET is unset we can't verify. Outside production we
 * accept (return true) so the unconfigured/dev path still 204s, mirroring the
 * rest of the integration's "no-op when unconfigured" behaviour. In production
 * we fail CLOSED — the handler mutates order status, so an unsigned callback
 * must never be trusted just because the secret wasn't configured (contrast the
 * Stripe path, which already rejects). Set the secret in any real deployment.
 */
export function verifyArteloWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = getArteloWebhookSecret();
  if (!secret) return process.env.VERCEL_ENV !== "production"; // prod: fail closed
  if (!signature) return false;
  let canonical: string;
  try {
    canonical = JSON.stringify(JSON.parse(rawBody));
  } catch {
    return false;
  }
  const expected = createHmac("sha256", secret).update(canonical).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Authenticated fetch against the Artelo API (attaches the Bearer token + base
 * URL). Throws when unconfigured. Callers own request/response shapes — see
 * docs/integrations/artelo.md.
 */
export async function arteloFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cfg = getArteloConfig();
  if (!cfg) throw new Error("artelo_not_configured");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${cfg.apiKey}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${cfg.baseUrl}${path}`, { ...init, headers });
}
