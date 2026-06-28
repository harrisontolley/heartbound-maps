import { type Context, Hono } from "hono";
import type { Order, TrackResult } from "@pinprint/shared";
import { findOrderByNumberAndEmail } from "../orders.js";

// Public order tracking — no auth, looked up by order number + email. The result
// is deliberately narrow: status, item labels, a sanitized timeline, and carrier
// tracking only. It never exposes user ids, the email, prices, poster configs, or
// Stripe/Artelo identifiers. A best-effort in-memory rate limit (per client key)
// blunts enumeration; a miss always returns a generic 404.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 30;
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Test seam: clear the rate-limit state between cases. */
export function __resetTrackRateLimit(): void {
  buckets.clear();
}

function rateLimited(key: string, now: number): boolean {
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > MAX_PER_WINDOW;
}

function clientKey(c: { req: { header: (k: string) => string | undefined } }): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

function toTrackResult(order: Order): TrackResult {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.createdAt,
    items: order.items.map((i) => ({ label: i.productLabel, quantity: i.quantity })),
    timeline: order.events.map((e) => ({
      status: e.status,
      message: e.message,
      createdAt: e.createdAt,
    })),
    tracking: order.tracking,
  };
}

export function buildTrackRouter(): Hono {
  const r = new Hono();

  async function lookup(c: Context, orderNumber: string, email: string) {
    if (rateLimited(clientKey(c), Date.now())) {
      return c.json({ error: "rate_limited" }, 429);
    }
    if (!orderNumber || !email) return c.json({ error: "not_found" }, 404);
    const order = await findOrderByNumberAndEmail(orderNumber.trim(), email.trim());
    if (!order) return c.json({ error: "not_found" }, 404);
    return c.json(toTrackResult(order));
  }

  r.get("/", async (c) =>
    lookup(c, c.req.query("number") ?? "", c.req.query("email") ?? ""),
  );

  r.post("/", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as {
      orderNumber?: string;
      email?: string;
    };
    return lookup(c, body.orderNumber ?? "", body.email ?? "");
  });

  return r;
}
