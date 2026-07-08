import {
  arteloProductInfoFor,
  DEFAULT_FRAME_COLOR,
  FRAME_COLORS_BY_MATERIAL,
  type FrameColor,
  type FrameMaterial,
  type FrameSelection,
} from "@heartbound/shared";
import { arteloFetch, getArteloConfig } from "./artelo.js";
import { signAssetUrl } from "./blob.js";
import { capturePostHogServerEvent } from "./posthog.js";
import { ensurePrintAsset, physicalInches } from "./renderPrint.js";
import { fetchPngDimensions } from "./pngMeta.js";
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

/** The `posterConfig` fields this module reads to determine frame/format. */
type PosterConfigFrameFields = {
  format?: string;
  /** Current shape (see packages/shared/src/commerce.ts FrameSelection). */
  frame?: { material?: string; color?: string } | null;
  /** Legacy shape — orders placed before the 8-color frame picker shipped. */
  addFrame?: boolean;
};

/** Material for a legacy `addFrame: true` order — the only frame ever offered before. */
const LEGACY_FRAME_MATERIAL: FrameMaterial = "Oak";

/**
 * Resolve a line item's frame selection from its stored `posterConfig`,
 * supporting both the current `{material, color}` shape and the legacy
 * `addFrame: boolean` shape from orders placed before the frame picker
 * shipped — those map to the one frame that ever existed (Oak/NaturalOak).
 * Falls back to unframed on anything malformed rather than guessing.
 */
function frameFromPosterConfig(config: PosterConfigFrameFields): FrameSelection {
  if (config.frame !== undefined) {
    const f = config.frame;
    if (!f) return null;
    const colors = FRAME_COLORS_BY_MATERIAL[f.material as FrameMaterial] as
      | readonly FrameColor[]
      | undefined;
    if (colors && f.color && colors.includes(f.color as FrameColor)) {
      return { material: f.material as FrameMaterial, color: f.color as FrameColor };
    }
    return null;
  }
  // Legacy shape: no `frame` key at all means this order predates it.
  return config.addFrame === true
    ? { material: LEGACY_FRAME_MATERIAL, color: DEFAULT_FRAME_COLOR }
    : null;
}

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

/**
 * Build the Artelo create-order request body from a paid order. Pure + sync so it
 * unit-tests without network. Posters are private blobs, so the URL we expose to
 * Artelo is resolved through `resolveAssetUrl` — the caller signs each asset (see
 * submitOrderToArtelo) and passes a lookup; it defaults to identity. Exported for tests.
 */
export function buildCreateOrderBody(
  order: FulfillmentOrder,
  isTestOrder: boolean,
  resolveAssetUrl: (assetUrl: string) => string = (u) => u,
) {
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
      const config = it.posterConfig as PosterConfigFrameFields;
      // Digital downloads aren't fulfilled by Artelo.
      if (config.format === "digital") return null;
      const frame = frameFromPosterConfig(config);
      const productInfo = arteloProductInfoFor(it.productId, frame);
      if (!productInfo) return null; // product we don't fulfil through Artelo
      if (!it.assetUrl) return null; // no print-ready asset → can't submit this line
      return {
        orderItemId: `${order.orderNumber}-${index}`,
        quantity: it.quantity,
        unitPrice: (it.unitPriceCents ?? 0) / 100,
        productInfo: {
          ...productInfo,
          designs: [{ sourceImage: { url: resolveAssetUrl(it.assetUrl) }, fitOptions: {} }],
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
 * Artelo's minimum acceptable print resolution. A server render is always exactly
 * 300 DPI; this floor guards the browser-PNG fallback (which caps at 7000px, so a
 * 24×36 lands ~194 DPI — still fine) and future size changes that could push an
 * asset below print quality. Below this we fail loud rather than ship a soft print.
 */
const DPI_FLOOR = 150;

/** True for a line item that should be fulfilled as a physical Artelo print. */
function isArteloPrintItem(it: FulfillmentOrder["items"][number]): boolean {
  const config = it.posterConfig as PosterConfigFrameFields;
  if (config.format === "digital") return false;
  return arteloProductInfoFor(it.productId, frameFromPosterConfig(config)) !== null;
}

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

  // Render (or reuse) an exact-DPI print PNG per print line, preferring the
  // server render over the browser-canvas PNG. ensurePrintAsset never throws and
  // falls back to the client PNG on any failure; we point the line at whichever
  // asset it chose so signing + the Artelo body use it.
  for (const [index, it] of order.items.entries()) {
    if (!isArteloPrintItem(it)) continue;
    const chosen = await ensurePrintAsset({
      orderItemId: it.id,
      orderNumber: order.orderNumber,
      index,
      productId: it.productId,
      clientAssetUrl: it.assetUrl,
      svgAssetUrl: it.svgAssetUrl,
      renderAssetUrl: it.renderAssetUrl,
    });
    if (chosen) it.assetUrl = chosen.url;
  }

  // Posters are private blobs — mint a short-lived signed GET URL per distinct
  // asset so Artelo can fetch it (legacy public blobs pass through unchanged).
  const assetUrls = [...new Set(order.items.map((it) => it.assetUrl).filter((u): u is string => !!u))];
  const signed = new Map(await Promise.all(assetUrls.map(async (u) => [u, await signAssetUrl(u)] as const)));
  const body = buildCreateOrderBody(order, cfg.testOrders, (u) => signed.get(u) ?? u);
  if (body.items.length === 0) {
    return { submitted: false, reason: "no_printable_items" };
  }

  // DPI floor: verify each chosen print asset actually meets Artelo's minimum
  // resolution for its physical size. Below the floor we fail loud (logged failed
  // fulfilment row + timeline event) and DO NOT submit — the admin retry lever
  // stays available. Server renders always pass; this catches the client fallback.
  for (const it of order.items) {
    if (!isArteloPrintItem(it) || !it.assetUrl) continue;
    const inch = physicalInches(it.productId);
    if (!inch) continue;
    const dims = await fetchPngDimensions(signed.get(it.assetUrl) ?? it.assetUrl);
    if (!dims) continue; // couldn't measure (transient) — let Artelo validate instead
    const effectiveDpi = Math.min(dims.w / inch.widthIn, dims.h / inch.heightIn);
    if (effectiveDpi < DPI_FLOOR) {
      await recordFulfillmentAttempt({
        orderId: order.id,
        status: "failed",
        isTest: cfg.testOrders,
        currency: order.currency,
        requestPayload: body,
        error: `dpi_below_minimum:${dims.w}x${dims.h}`,
      }).catch(() => {});
      await appendOrderEvent(order.id, {
        message: `Fulfilment blocked: print asset below ${DPI_FLOOR} DPI (${dims.w}×${dims.h} for ${it.productLabel})`,
        source: "system",
      }).catch(() => {});
      return { submitted: false, reason: "dpi_below_minimum" };
    }
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
    await capturePostHogServerEvent("order_fulfilled", order.id, {
      order_id: order.id,
      is_test_order: cfg.testOrders,
    });

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
