import { Hono } from "hono";
import type {
  AdminActionResult,
  OrderShippingAddress,
  OrderStatus,
} from "@pinprint/shared";
import { type AuthVariables, requireAdmin } from "../auth.js";
import { adminGetMetrics, adminGetOrderDetail, adminListOrders } from "../adminStore.js";
import {
  advanceOrderStatus,
  appendOrderEvent,
  clearArteloOrderId,
  findOrderById,
  getArteloOrderId,
  getOrderPaymentInfo,
  setArteloStatus,
  setRefundAmount,
  updateOrderShipping,
} from "../orders.js";
import { refundPaymentIntent } from "../stripe.js";
import { cancelArteloOrder, fetchArteloOrder, submitOrderToArtelo } from "../fulfillment.js";
import { getArteloConfig } from "../artelo.js";
import { mapArteloStatus, trackingFromShipments } from "../webhooks.js";
import { recordAdminAction } from "../observability.js";

// Operator-only admin API. Every route is behind requireAdmin (valid Neon Auth
// session whose email is on the ADMIN_EMAILS allowlist), and every mutation
// writes an admin_actions audit row. Returns a fresh router per mount, like the
// other routers (registerRoutes runs twice). Order ids here are the INTERNAL uuid
// (not the public PP-… number) so they can't be guessed from a tracking page.

const VALID_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function parseShipping(body: unknown): OrderShippingAddress | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const line1 = str(b.line1);
  const city = str(b.city);
  const postal = str(b.postal);
  const country = str(b.country);
  if (!line1 || !city || !postal || !country) return null;
  return {
    name: str(b.name) || undefined,
    line1,
    line2: str(b.line2) || undefined,
    city,
    region: str(b.region) || undefined,
    postal,
    country: country.toUpperCase().slice(0, 2),
  };
}

export function buildAdminRouter(): Hono<{ Variables: AuthVariables }> {
  const r = new Hono<{ Variables: AuthVariables }>();
  r.use("*", requireAdmin);

  const actor = (c: { get: (k: "user") => { email?: string } | null }) =>
    c.get("user")?.email ?? "unknown";

  // Cheap "am I an admin?" probe for the dashboard to gate its UI (the real gate
  // is requireAdmin on every route — this just lets the client avoid rendering an
  // admin shell it would only get 403s from).
  r.get("/me", (c) => c.json({ email: actor(c), admin: true }));

  // ── Reads ──────────────────────────────────────────────────────────────────
  r.get("/orders", async (c) => {
    const statusParam = c.req.query("status");
    const status =
      statusParam && VALID_STATUSES.includes(statusParam as OrderStatus)
        ? (statusParam as OrderStatus)
        : undefined;
    const limit = Number(c.req.query("limit") ?? 50);
    const offset = Number(c.req.query("offset") ?? 0);
    return c.json(
      await adminListOrders({
        status,
        search: c.req.query("search") ?? undefined,
        limit: Number.isFinite(limit) ? limit : 50,
        offset: Number.isFinite(offset) ? offset : 0,
      }),
    );
  });

  r.get("/metrics", async (c) => c.json(await adminGetMetrics()));

  r.get("/orders/:id", async (c) => {
    const detail = await adminGetOrderDetail(c.req.param("id"));
    if (!detail) return c.json({ error: "not_found" }, 404);
    return c.json(detail);
  });

  // ── Refund ─────────────────────────────────────────────────────────────────
  r.post("/orders/:id/refund", async (c) => {
    const orderId = c.req.param("id");
    const body = (await c.req.json().catch(() => ({}))) as { amountCents?: number; reason?: string };
    const info = await getOrderPaymentInfo(orderId);
    if (!info) return c.json({ error: "not_found" }, 404);
    if (!info.paymentIntentId) return c.json({ error: "no_payment_intent" }, 400);

    const remaining = info.totalCents - info.amountRefundedCents;
    // Reject a non-positive partial amount explicitly (a fat-fingered negative
    // must not silently fall through to a full refund).
    if (body.amountCents !== undefined && !(body.amountCents > 0)) {
      return c.json({ error: "invalid_amount" }, 400);
    }
    const amountCents = body.amountCents ? Math.floor(body.amountCents) : undefined;
    if (amountCents !== undefined && amountCents > remaining) {
      return c.json({ error: "amount_exceeds_remaining", remaining }, 400);
    }

    try {
      const result = await refundPaymentIntent(info.paymentIntentId, {
        amountCents,
        reason: body.reason,
        // Key on order + amount + the cumulative-already-refunded: a double click
        // of the SAME intent dedupes (same prior total), but two legitimate
        // sequential partial refunds of the same amount differ (prior total moved).
        idempotencyKey: `admin-refund-${orderId}-${amountCents ?? "full"}-${info.amountRefundedCents}`,
      });
      await setRefundAmount(orderId, result.cumulativeRefundedCents);
      const fullyRefunded = result.cumulativeRefundedCents >= info.totalCents;
      if (fullyRefunded && info.status !== "refunded") {
        await advanceOrderStatus(orderId, "refunded", {
          message: `Refunded by ${actor(c)}`,
          source: "stripe",
        });
      } else {
        await appendOrderEvent(orderId, {
          message: `Partial refund of ${result.amountCents} by ${actor(c)}`,
          source: "stripe",
        });
      }
      await recordAdminAction({
        actorEmail: actor(c),
        action: "refund",
        orderId,
        detail: { ...result, reason: body.reason },
      });
      const out: AdminActionResult = { ok: true, message: "refunded", detail: { ...result } };
      return c.json(out);
    } catch (err) {
      return c.json({ ok: false, error: "refund_failed", message: String(err) }, 502);
    }
  });

  // ── Cancel (Artelo cancel + optional refund) ────────────────────────────────
  r.post("/orders/:id/cancel", async (c) => {
    const orderId = c.req.param("id");
    const body = (await c.req.json().catch(() => ({}))) as { refund?: boolean; reason?: string };
    const info = await getOrderPaymentInfo(orderId);
    if (!info) return c.json({ error: "not_found" }, 404);

    const detail: Record<string, unknown> = {};
    const arteloId = await getArteloOrderId(orderId);
    if (arteloId && getArteloConfig()) {
      try {
        detail.artelo = await cancelArteloOrder(arteloId);
      } catch (err) {
        detail.arteloError = String(err);
      }
    }

    const shouldRefund = body.refund !== false && info.paymentIntentId && info.amountRefundedCents < info.totalCents;
    if (shouldRefund && info.paymentIntentId) {
      try {
        const refund = await refundPaymentIntent(info.paymentIntentId, {
          reason: body.reason ?? "order_cancelled",
          idempotencyKey: `admin-cancel-refund-${orderId}`,
        });
        await setRefundAmount(orderId, refund.cumulativeRefundedCents);
        detail.refund = refund;
      } catch (err) {
        detail.refundError = String(err);
      }
    }

    await advanceOrderStatus(orderId, "cancelled", {
      message: `Cancelled by ${actor(c)}${body.reason ? `: ${body.reason}` : ""}`,
      source: "system",
    });
    await recordAdminAction({ actorEmail: actor(c), action: "cancel", orderId, detail });
    return c.json({ ok: true, message: "cancelled", detail } satisfies AdminActionResult);
  });

  // ── Retry fulfilment ────────────────────────────────────────────────────────
  r.post("/orders/:id/retry-fulfillment", async (c) => {
    const orderId = c.req.param("id");
    const order = await findOrderById(orderId);
    if (!order) return c.json({ error: "not_found" }, 404);
    // Clear any prior (failed) Artelo id so the idempotency guard doesn't skip it.
    await clearArteloOrderId(orderId);
    const result = await submitOrderToArtelo(orderId);
    await recordAdminAction({
      actorEmail: actor(c),
      action: "retry_fulfillment",
      orderId,
      detail: { ...result },
    });
    return c.json({ ok: result.submitted, message: result.reason ?? "submitted", detail: { ...result } });
  });

  // ── Sync from Artelo (reconcile status/tracking) ────────────────────────────
  r.post("/orders/:id/sync", async (c) => {
    const orderId = c.req.param("id");
    const arteloId = await getArteloOrderId(orderId);
    if (!arteloId) return c.json({ error: "not_submitted" }, 400);
    if (!getArteloConfig()) return c.json({ error: "artelo_unconfigured" }, 503);
    const snapshot = await fetchArteloOrder(arteloId);
    if (!snapshot) return c.json({ error: "artelo_fetch_failed" }, 502);
    if (snapshot.status) {
      await setArteloStatus(orderId, snapshot.status);
      const mapped = mapArteloStatus(snapshot.status);
      if (mapped) {
        await advanceOrderStatus(orderId, mapped, {
          message: `Synced from Artelo: ${snapshot.status}`,
          source: "artelo",
          tracking: trackingFromShipments(snapshot.shipments),
        });
      }
    }
    await recordAdminAction({
      actorEmail: actor(c),
      action: "sync",
      orderId,
      detail: { status: snapshot.status },
    });
    return c.json({ ok: true, message: "synced", detail: { status: snapshot.status } });
  });

  // ── Update shipping address (local only — Artelo has no edit endpoint) ───────
  r.patch("/orders/:id/address", async (c) => {
    const orderId = c.req.param("id");
    const shipping = parseShipping(await c.req.json().catch(() => null));
    if (!shipping) return c.json({ error: "invalid_address" }, 400);
    const order = await findOrderById(orderId);
    if (!order) return c.json({ error: "not_found" }, 404);
    await updateOrderShipping(orderId, shipping);
    await appendOrderEvent(orderId, {
      message: `Shipping address updated by ${actor(c)}`,
      source: "system",
    });
    await recordAdminAction({ actorEmail: actor(c), action: "update_address", orderId, detail: { shipping } });
    // Surface the caveat: Artelo can't edit an address post-submission.
    const submitted = await getArteloOrderId(orderId);
    return c.json({
      ok: true,
      message: submitted
        ? "address updated locally — already submitted to Artelo; cancel + re-create to change the print destination"
        : "address updated",
    } satisfies AdminActionResult);
  });

  return r;
}
