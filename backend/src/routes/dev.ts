import { Hono } from "hono";
import { createOrder, type NewOrder, type NewOrderItem } from "../orders.js";
import { arteloFetch, getArteloConfig } from "../artelo.js";

// Dev-only order creation, so the account/track flows can be exercised before the
// real checkout ships. Guarded by DEV_SEED_TOKEN: every route 403s unless the env
// var is set AND the request sends a matching `x-dev-seed-token` header. With the
// token unset (production), the whole router is inert.

function authorized(token: string | undefined): boolean {
  const expected = process.env.DEV_SEED_TOKEN;
  return Boolean(expected) && token === expected;
}

function parseItems(raw: unknown): NewOrderItem[] {
  if (!Array.isArray(raw)) return [];
  const items: NewOrderItem[] = [];
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (typeof o.productId !== "string" || typeof o.productLabel !== "string") continue;
    items.push({
      productId: o.productId,
      productLabel: o.productLabel,
      quantity: typeof o.quantity === "number" ? o.quantity : 1,
      unitPriceCents: typeof o.unitPriceCents === "number" ? o.unitPriceCents : 0,
      posterConfig:
        o.posterConfig && typeof o.posterConfig === "object"
          ? (o.posterConfig as Record<string, unknown>)
          : {},
      arteloSku: typeof o.arteloSku === "string" ? o.arteloSku : undefined,
      assetUrl: typeof o.assetUrl === "string" ? o.assetUrl : undefined,
    });
  }
  return items;
}

export function buildDevRouter(): Hono {
  const r = new Hono();

  r.post("/orders", async (c) => {
    if (!authorized(c.req.header("x-dev-seed-token"))) {
      return c.json({ error: "forbidden" }, 403);
    }
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const items = parseItems(body.items);
    if (typeof body.email !== "string" || items.length === 0) {
      return c.json({ error: "invalid_order" }, 400);
    }
    const input: NewOrder = {
      userId: typeof body.userId === "string" ? body.userId : null,
      email: body.email,
      status: "pending_payment",
      stripePaymentIntentId:
        typeof body.stripePaymentIntentId === "string" ? body.stripePaymentIntentId : undefined,
      arteloOrderId:
        typeof body.arteloOrderId === "string" ? body.arteloOrderId : undefined,
      items,
    };
    const { orderNumber } = await createOrder(input);
    return c.json({ orderNumber }, 201);
  });

  // One-time helper: register our Artelo OrderStatusChange webhook and return the
  // signing `secret` to paste into ARTELO_WEBHOOK_SECRET. Body: { url } (the public
  // callback, e.g. https://<host>/_/backend/webhooks/artelo). DEV_SEED_TOKEN-guarded.
  r.post("/artelo/register-webhook", async (c) => {
    if (!authorized(c.req.header("x-dev-seed-token"))) {
      return c.json({ error: "forbidden" }, 403);
    }
    if (!getArteloConfig()) return c.json({ error: "artelo_unconfigured" }, 503);
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const url = typeof body.url === "string" ? body.url : "";
    if (!url) return c.json({ error: "missing_url" }, 400);
    const res = await arteloFetch("/webhooks/save", {
      method: "POST",
      body: JSON.stringify({ topic: "OrderStatusChange", url }),
    });
    const data = (await res.json().catch(() => null)) as unknown;
    if (!res.ok) return c.json({ error: "artelo_save_failed", status: res.status, data }, 502);
    return c.json(data, 200);
  });

  return r;
}
