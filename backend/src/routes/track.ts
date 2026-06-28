import { type Context, Hono } from "hono";
import type { Order, TrackResult } from "@pinprint/shared";
import { findOrderByNumberAndEmail } from "../orders.js";
import { __resetRateLimits, enforce } from "../rateLimit.js";

// Public order tracking — no auth, looked up by order number + email. The result
// is deliberately narrow: status, item labels, a sanitized timeline, and carrier
// tracking only. It never exposes user ids, the email, prices, poster configs, or
// Stripe/Artelo identifiers. A distributed (Redis) rate limit, falling back to
// in-memory, blunts enumeration; a miss always returns a generic 404.

/** Test seam: clear the shared (in-memory fallback) rate-limit state between cases. */
export function __resetTrackRateLimit(): void {
  __resetRateLimits();
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
    if (await enforce(c, "track", { max: 30, windowMs: 60_000 })) {
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
