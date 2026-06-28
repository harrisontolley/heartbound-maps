import { arteloProductInfoFor } from "@pinprint/shared";
import { arteloFetch, getArteloConfig } from "./artelo.js";
import {
  appendOrderEvent,
  getOrderForFulfillment,
  recordFulfillmentAttempt,
  setArteloOrderId,
  setArteloStatus,
  type FulfillmentOrder,
} from "./orders.js";

// Print fulfilment: hand a paid order to Artelo. Called fire-and-forget from the
// Stripe webhook once an order with physical items reaches "paid". Idempotent
// (skips if already submitted) and self-contained — it logs every attempt to the
// `fulfillments` table (request/response + Artelo's COGS) and never throws back
// into the webhook. See docs/integrations/artelo.md.

/** Round a dollar amount to integer cents. */
function toCents(dollars: unknown): number | null {
  const n = typeof dollars === "number" ? dollars : Number(dollars);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

/** Sum Artelo's tax fields off the response `details` block, in cents. */
function taxCentsFromDetails(details: Record<string, unknown> | undefined): number | null {
  if (!details) return null;
  const parts = ["gst", "hst", "pst", "usSalesTax"]
    .map((k) => toCents(details[k]))
    .filter((c): c is number => c !== null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) : null;
}

/** Build the Artelo create-order request body from a paid order. Exported for tests. */
export function buildCreateOrderBody(order: FulfillmentOrder, isTestOrder: boolean) {
  const s = order.shipping;
  const customerAddress = {
    name: s.name ?? undefined,
    email: order.email || undefined,
    street1: s.line1 ?? undefined,
    street2: s.line2 ?? undefined,
    city: s.city ?? undefined,
    state: s.region ?? undefined,
    zipcode: s.postal ?? undefined,
    country: s.country ?? undefined,
  };

  const items = order.items
    .map((it, index) => {
      const config = it.posterConfig as { format?: string; addFrame?: boolean };
      // Digital downloads aren't fulfilled by Artelo.
      if (config.format === "digital") return null;
      const addFrame = config.addFrame === true;
      const productInfo = arteloProductInfoFor(it.productId, addFrame);
      if (!productInfo) return null; // product we don't fulfil through Artelo
      if (!it.assetUrl) return null; // no print-ready asset → can't submit this line
      return {
        orderItemId: `${order.orderNumber}-${index}`,
        quantity: it.quantity,
        unitPrice: (it.unitPriceCents ?? 0) / 100,
        productInfo: {
          ...productInfo,
          designs: [{ sourceImage: { url: it.assetUrl }, fitOptions: {} }],
        },
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const body = {
    orderId: order.orderNumber,
    createdAt: new Date().toISOString(), // required by Artelo's create schema
    currency: (order.currency ?? "usd").toUpperCase(),
    total: order.totalCents / 100,
    isTestOrder,
    customerAddress,
    items,
  };
  return body;
}

/**
 * Cancel an Artelo order (best-effort; Artelo allows it pre-production). The id is
 * passed as a query parameter — Artelo's DELETE /orders/cancel reads `?id=<uuid>`,
 * not a JSON body (verified against the live API).
 */
export async function cancelArteloOrder(
  arteloOrderId: string,
): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const res = await arteloFetch(`/orders/cancel?id=${encodeURIComponent(arteloOrderId)}`, {
    method: "DELETE",
  });
  const text = await res.text();
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

export type ArteloOrderSnapshot = {
  status?: string;
  shipments?: unknown;
  details?: Record<string, unknown>;
  raw: unknown;
};

/** Fetch the live Artelo order (status, shipments, costs) for reconciliation. */
export async function fetchArteloOrder(arteloOrderId: string): Promise<ArteloOrderSnapshot | null> {
  const res = await arteloFetch(`/orders/get-by-id?orderId=${encodeURIComponent(arteloOrderId)}`, {
    method: "GET",
  });
  if (!res.ok) return null;
  const text = await res.text();
  let raw: unknown;
  try {
    raw = text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
  const order = (raw ?? {}) as Record<string, unknown>;
  return {
    status: typeof order.status === "string" ? order.status : undefined,
    shipments: order.shipments,
    details: order.details as Record<string, unknown> | undefined,
    raw,
  };
}

/** Live Artelo production+shipping cost for a product spec (the margin checker). */
export async function fetchArteloCosts(input: {
  catalogProductId: string;
  size: string;
  paperType: string;
  frameStyle: string;
  includeFramingService: boolean;
  includeMats?: boolean;
  includeHangingPins?: boolean;
  shippingDestination: string;
  quantity?: number;
}): Promise<{ productionCost: number; shippingCost: number } | null> {
  const res = await arteloFetch("/catalog/get-costs", {
    method: "POST",
    body: JSON.stringify({
      catalogProductId: input.catalogProductId,
      size: input.size,
      paperType: input.paperType,
      frameStyle: input.frameStyle,
      includeFramingService: input.includeFramingService,
      includeMats: input.includeMats ?? false,
      includeHangingPins: input.includeHangingPins ?? false,
      shippingDestination: input.shippingDestination,
      quantity: input.quantity ?? 1,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json().catch(() => null)) as {
    productionCost?: number;
    shippingCost?: number;
  } | null;
  if (!data) return null;
  return {
    productionCost: Number(data.productionCost ?? 0),
    shippingCost: Number(data.shippingCost ?? 0),
  };
}

export type SubmitResult = { submitted: boolean; reason?: string };

/**
 * Submit a paid order to Artelo. Idempotent and side-effect-logged: writes a
 * `fulfillments` row on every attempt, sets artelo_order_id/status on success,
 * and appends an order-timeline event. Never throws.
 */
export async function submitOrderToArtelo(orderId: string): Promise<SubmitResult> {
  const cfg = getArteloConfig();
  if (!cfg) return { submitted: false, reason: "artelo_not_configured" };

  let order: FulfillmentOrder | null;
  try {
    order = await getOrderForFulfillment(orderId);
  } catch {
    return { submitted: false, reason: "load_failed" };
  }
  if (!order) return { submitted: false, reason: "order_not_found" };
  if (order.arteloOrderId) return { submitted: false, reason: "already_submitted" };

  const body = buildCreateOrderBody(order, cfg.testOrders);
  if (body.items.length === 0) {
    return { submitted: false, reason: "no_printable_items" };
  }

  try {
    const res = await arteloFetch("/orders/create", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }

    const data = (parsed ?? {}) as Record<string, unknown>;
    const arteloOrderId = typeof data.id === "string" ? data.id : null;

    if (!res.ok || !arteloOrderId) {
      await recordFulfillmentAttempt({
        orderId: order.id,
        status: "failed",
        isTest: cfg.testOrders,
        currency: order.currency,
        requestPayload: body,
        responsePayload: parsed,
        error: `artelo_create_failed:${res.status}`,
      });
      await appendOrderEvent(order.id, {
        message: `Artelo submission failed (${res.status})`,
        source: "system",
      }).catch(() => {});
      return { submitted: false, reason: `http_${res.status}` };
    }

    const details = data.details as Record<string, unknown> | undefined;
    const arteloStatus = typeof data.status === "string" ? data.status : null;

    await recordFulfillmentAttempt({
      orderId: order.id,
      status: "submitted",
      isTest: cfg.testOrders,
      arteloOrderId,
      currency: order.currency,
      productionCostCents: toCents(details?.productionCost),
      shippingCostCents: toCents(details?.arteloShipping),
      taxCents: taxCentsFromDetails(details),
      requestPayload: body,
      responsePayload: parsed,
    });
    await setArteloOrderId(order.id, arteloOrderId);
    if (arteloStatus) await setArteloStatus(order.id, arteloStatus).catch(() => {});
    await appendOrderEvent(order.id, {
      message: `Submitted to Artelo${cfg.testOrders ? " (test order)" : ""}`,
      source: "artelo",
    }).catch(() => {});

    return { submitted: true };
  } catch (err) {
    await recordFulfillmentAttempt({
      orderId: order.id,
      status: "failed",
      isTest: cfg.testOrders,
      currency: order.currency,
      requestPayload: body,
      error: err instanceof Error ? err.message : "unknown_error",
    }).catch(() => {});
    return { submitted: false, reason: "exception" };
  }
}
