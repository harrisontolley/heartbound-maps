import { randomInt, randomUUID } from "node:crypto";
import type {
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  OrderSummary,
  OrderTracking,
  OrderShippingAddress,
  CheckoutOrderStatus,
  EventSource,
} from "@pinprint/shared";
import { getSql } from "./db.js";

// Order persistence + the helpers the Stripe/Artelo webhooks and the dev/seed
// endpoints share. Every function is env-guarded: with DATABASE_URL unset getSql()
// is null and reads return [] / null while writes throw a clear error (callers in
// webhooks swallow it so an unconfigured deploy still 204s).

const ORDER_NUMBER_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L

/**
 * Public, human-friendly order number: PP-XXXXXXXX. Order numbers are exposed via
 * the public /track lookup (number + email), so they're generated with a CSPRNG
 * (crypto.randomInt) and 8 chars (~31^8 ≈ 8.5e11 space) to make guessing/enumeration
 * impractical — email match is still required on top.
 */
export function generateOrderNumber(): string {
  let s = "";
  for (let i = 0; i < 8; i += 1) {
    s += ORDER_NUMBER_ALPHABET[randomInt(ORDER_NUMBER_ALPHABET.length)];
  }
  return `PP-${s}`;
}

// ── Row shapes (snake_case from Postgres) ────────────────────────────────────
type OrderRow = {
  id: string;
  order_number: string;
  user_id: string | null;
  email: string;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  ship_name: string | null;
  ship_line1: string | null;
  ship_line2: string | null;
  ship_city: string | null;
  ship_region: string | null;
  ship_postal: string | null;
  ship_country: string | null;
  tracking_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  created_at: string;
};

type ItemRow = {
  product_id: string;
  product_label: string;
  quantity: number;
  unit_price_cents: number;
  poster_config: Record<string, unknown>;
  artelo_sku: string | null;
  asset_url: string | null;
};

type EventRow = {
  status: OrderStatus | null;
  message: string;
  source: EventSource;
  created_at: string;
};

function trackingOf(row: OrderRow): OrderTracking | undefined {
  if (!row.tracking_carrier && !row.tracking_number && !row.tracking_url) return undefined;
  return {
    carrier: row.tracking_carrier ?? undefined,
    number: row.tracking_number ?? undefined,
    url: row.tracking_url ?? undefined,
  };
}

function summaryOf(row: OrderRow, items: ItemRow[]): OrderSummary {
  const itemCount = items.reduce((n, it) => n + it.quantity, 0);
  const first = items[0]?.product_label ?? "Fine art print";
  const distinct = items.length;
  const previewLabel = distinct > 1 ? `${first} + ${distinct - 1} more` : first;
  return {
    orderNumber: row.order_number,
    status: row.status,
    currency: row.currency,
    totalCents: row.total_cents,
    createdAt: new Date(row.created_at).toISOString(),
    itemCount,
    previewLabel,
  };
}

function mapItem(it: ItemRow): OrderItem {
  return {
    productId: it.product_id,
    productLabel: it.product_label,
    quantity: it.quantity,
    unitPriceCents: it.unit_price_cents,
    arteloSku: it.artelo_sku ?? undefined,
    assetUrl: it.asset_url ?? undefined,
    posterConfig: it.poster_config ?? {},
  };
}

function mapEvent(e: EventRow): OrderEvent {
  return {
    status: e.status,
    message: e.message,
    source: e.source,
    createdAt: new Date(e.created_at).toISOString(),
  };
}

function fullOrder(row: OrderRow, items: ItemRow[], events: EventRow[]): Order {
  const shippingAddress =
    row.ship_line1 || row.ship_name
      ? {
          name: row.ship_name ?? undefined,
          line1: row.ship_line1 ?? undefined,
          line2: row.ship_line2 ?? undefined,
          city: row.ship_city ?? undefined,
          region: row.ship_region ?? undefined,
          postal: row.ship_postal ?? undefined,
          country: row.ship_country ?? undefined,
        }
      : undefined;
  return {
    ...summaryOf(row, items),
    email: row.email,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    items: items.map(mapItem),
    events: events.map(mapEvent),
    tracking: trackingOf(row),
    shippingAddress,
  };
}

// ── Reads ────────────────────────────────────────────────────────────────────

/** Order-history summaries for a user, newest first. */
export async function listOrdersForUser(userId: string): Promise<OrderSummary[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    select * from orders where user_id = ${userId} order by created_at desc
  `) as unknown as OrderRow[];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const items = (await sql`
    select order_id, product_id, product_label, quantity
    from order_items where order_id = any(${ids})
  `) as unknown as (ItemRow & { order_id: string })[];
  return rows.map((r) =>
    summaryOf(r, items.filter((it) => it.order_id === r.id)),
  );
}

async function loadOrder(row: OrderRow | undefined): Promise<Order | null> {
  const sql = getSql();
  if (!sql || !row) return null;
  const items = (await sql`
    select product_id, product_label, quantity, unit_price_cents, poster_config,
           artelo_sku, asset_url
    from order_items where order_id = ${row.id} order by created_at asc
  `) as unknown as ItemRow[];
  const events = (await sql`
    select status, message, source, created_at
    from order_events where order_id = ${row.id} order by created_at asc
  `) as unknown as EventRow[];
  return fullOrder(row, items, events);
}

/** Full order detail for its authenticated owner (null if not theirs). */
export async function getOrderForUser(
  userId: string,
  orderNumber: string,
): Promise<Order | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select * from orders where order_number = ${orderNumber} and user_id = ${userId} limit 1
  `) as unknown as OrderRow[];
  return loadOrder(rows[0]);
}

/** Public-tracking lookup: order number + matching email (case-insensitive). */
export async function findOrderByNumberAndEmail(
  orderNumber: string,
  email: string,
): Promise<Order | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select * from orders
    where order_number = ${orderNumber} and lower(email) = lower(${email})
    limit 1
  `) as unknown as OrderRow[];
  return loadOrder(rows[0]);
}

// ── Writes (webhooks + dev/seed) ─────────────────────────────────────────────

export type NewOrderItem = {
  productId: string;
  productLabel: string;
  quantity: number;
  unitPriceCents: number;
  posterConfig?: Record<string, unknown>;
  arteloSku?: string;
  assetUrl?: string;
  /** Vector SVG asset URL — see CheckoutItemInput.svgAssetUrl. */
  svgAssetUrl?: string;
  /** Bonus phone wallpaper PNG (9:16) — see CheckoutItemInput.phoneWallpaperAssetUrl. */
  phoneWallpaperAssetUrl?: string;
  /** Bonus desktop wallpaper PNG (16:9) — see CheckoutItemInput.desktopWallpaperAssetUrl. */
  desktopWallpaperAssetUrl?: string;
};

export type NewOrder = {
  userId?: string | null;
  email: string;
  status?: OrderStatus;
  currency?: string;
  shippingCents?: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  arteloOrderId?: string;
  shipping?: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    region?: string;
    postal?: string;
    country?: string;
  };
  items: NewOrderItem[];
  createdAt?: string; // override for realistic seed timelines
};

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL not configured");
  return sql;
}

/** Insert an order + its items + an initial "order placed" event, atomically. */
export async function createOrder(input: NewOrder): Promise<{ id: string; orderNumber: string }> {
  const sql = requireSql();
  const id = randomUUID();
  const orderNumber = generateOrderNumber();
  const status: OrderStatus = input.status ?? "pending_payment";
  const subtotal = input.items.reduce((n, it) => n + it.unitPriceCents * it.quantity, 0);
  const shipping = input.shippingCents ?? 0;
  const total = subtotal + shipping;
  const s = input.shipping ?? {};
  const createdAt = input.createdAt ?? new Date().toISOString();

  await sql`
    insert into orders (
      id, order_number, user_id, email, status, currency,
      subtotal_cents, shipping_cents, total_cents,
      stripe_payment_intent_id, stripe_checkout_session_id, artelo_order_id,
      ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postal, ship_country,
      created_at, updated_at
    ) values (
      ${id}, ${orderNumber}, ${input.userId ?? null}, ${input.email}, ${status}, ${input.currency ?? "usd"},
      ${subtotal}, ${shipping}, ${total},
      ${input.stripePaymentIntentId ?? null}, ${input.stripeCheckoutSessionId ?? null}, ${input.arteloOrderId ?? null},
      ${s.name ?? null}, ${s.line1 ?? null}, ${s.line2 ?? null}, ${s.city ?? null},
      ${s.region ?? null}, ${s.postal ?? null}, ${s.country ?? null},
      ${createdAt}, ${createdAt}
    )
  `;
  for (const it of input.items) {
    await sql`
      insert into order_items (
        order_id, product_id, product_label, quantity, unit_price_cents,
        poster_config, artelo_sku, asset_url, svg_asset_url,
        phone_wallpaper_asset_url, desktop_wallpaper_asset_url, created_at
      ) values (
        ${id}, ${it.productId}, ${it.productLabel}, ${it.quantity}, ${it.unitPriceCents},
        ${JSON.stringify(it.posterConfig ?? {})}::jsonb, ${it.arteloSku ?? null}, ${it.assetUrl ?? null},
        ${it.svgAssetUrl ?? null}, ${it.phoneWallpaperAssetUrl ?? null},
        ${it.desktopWallpaperAssetUrl ?? null}, ${createdAt}
      )
    `;
  }
  await sql`
    insert into order_events (order_id, status, message, source, created_at)
    values (${id}, ${status}, 'Order placed', 'system', ${createdAt})
  `;
  return { id, orderNumber };
}

/** Append a timeline event without changing status (informational). */
export async function appendOrderEvent(
  orderId: string,
  event: { status?: OrderStatus | null; message: string; source: EventSource; payload?: unknown },
): Promise<void> {
  const sql = requireSql();
  await sql`
    insert into order_events (order_id, status, message, source, payload)
    values (${orderId}, ${event.status ?? null}, ${event.message}, ${event.source},
            ${event.payload === undefined ? null : JSON.stringify(event.payload)}::jsonb)
  `;
}

/** Advance an order's status, append a matching event, optionally set tracking. */
export async function advanceOrderStatus(
  orderId: string,
  status: OrderStatus,
  opts: { message: string; source: EventSource; payload?: unknown; tracking?: OrderTracking } = {
    message: "",
    source: "system",
  },
): Promise<void> {
  const sql = requireSql();
  const t = opts.tracking;
  // Stamp the lifecycle timestamp matching this transition (set-once via coalesce)
  // so "when was this paid/cancelled/refunded" is a column read, not an event scan.
  await sql`
    update orders set
      status = ${status},
      paid_at      = case when ${status} = 'paid'      then coalesce(paid_at, now())      else paid_at end,
      cancelled_at = case when ${status} = 'cancelled' then coalesce(cancelled_at, now()) else cancelled_at end,
      refunded_at  = case when ${status} = 'refunded'  then coalesce(refunded_at, now())  else refunded_at end,
      tracking_carrier = coalesce(${t?.carrier ?? null}, tracking_carrier),
      tracking_number = coalesce(${t?.number ?? null}, tracking_number),
      tracking_url = coalesce(${t?.url ?? null}, tracking_url),
      updated_at = now()
    where id = ${orderId}
  `;
  await appendOrderEvent(orderId, {
    status,
    message: opts.message || status,
    source: opts.source,
    payload: opts.payload,
  });
}

export type LocatedOrder = { id: string; status: OrderStatus };

export async function findOrderByStripePaymentIntent(id: string): Promise<LocatedOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, status from orders where stripe_payment_intent_id = ${id} limit 1
  `) as unknown as LocatedOrder[];
  return rows[0] ?? null;
}

export async function findOrderByStripeCheckoutSession(id: string): Promise<LocatedOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, status from orders where stripe_checkout_session_id = ${id} limit 1
  `) as unknown as LocatedOrder[];
  return rows[0] ?? null;
}

export async function findOrderByArteloId(id: string): Promise<LocatedOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, status from orders where artelo_order_id = ${id} limit 1
  `) as unknown as LocatedOrder[];
  return rows[0] ?? null;
}

/** Attach an Artelo order id to an order (set once when fulfilment is submitted). */
export async function setArteloOrderId(orderId: string, arteloOrderId: string): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set artelo_order_id = ${arteloOrderId}, artelo_submitted_at = now(), updated_at = now()
    where id = ${orderId}
  `;
}

/** Record Artelo's raw fulfilment status (distinct from our order_status enum). */
export async function setArteloStatus(orderId: string, arteloStatus: string): Promise<void> {
  const sql = requireSql();
  await sql`update orders set artelo_status = ${arteloStatus}, updated_at = now() where id = ${orderId}`;
}

/**
 * Record the cumulative refunded amount on an order (in cents). Monotonic via
 * greatest() so the admin refund call and the later `charge.refunded` webhook —
 * which both report Stripe's cumulative `amount_refunded` — converge idempotently
 * without double-counting. Does not change status; the caller decides whether a
 * full refund should advance the order to `refunded`.
 */
export async function setRefundAmount(orderId: string, cumulativeCents: number): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set
      amount_refunded_cents = greatest(amount_refunded_cents, ${cumulativeCents}),
      updated_at = now()
    where id = ${orderId}
  `;
}

/** The Stripe payment-intent id + paid total for an order (for refunds). */
export async function getOrderPaymentInfo(
  orderId: string,
): Promise<{ paymentIntentId: string | null; totalCents: number; amountRefundedCents: number; status: OrderStatus } | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select stripe_payment_intent_id, total_cents, amount_refunded_cents, status
    from orders where id = ${orderId} limit 1
  `) as unknown as {
    stripe_payment_intent_id: string | null;
    total_cents: number;
    amount_refunded_cents: number;
    status: OrderStatus;
  }[];
  const row = rows[0];
  if (!row) return null;
  return {
    paymentIntentId: row.stripe_payment_intent_id,
    totalCents: row.total_cents,
    amountRefundedCents: row.amount_refunded_cents ?? 0,
    status: row.status,
  };
}

/** The Artelo order id for an order (for cancel/sync), or null. */
export async function getArteloOrderId(orderId: string): Promise<string | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select artelo_order_id from orders where id = ${orderId} limit 1
  `) as unknown as { artelo_order_id: string | null }[];
  return rows[0]?.artelo_order_id ?? null;
}

/** Overwrite an order's shipping address (admin correction). */
export async function updateOrderShipping(
  orderId: string,
  shipping: OrderShippingAddress,
): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set
      ship_name    = ${shipping.name ?? null},
      ship_line1   = ${shipping.line1 ?? null},
      ship_line2   = ${shipping.line2 ?? null},
      ship_city    = ${shipping.city ?? null},
      ship_region  = ${shipping.region ?? null},
      ship_postal  = ${shipping.postal ?? null},
      ship_country = ${shipping.country ?? null},
      updated_at = now()
    where id = ${orderId}
  `;
}

/** Clear the Artelo order id so a failed/cancelled order can be re-submitted. */
export async function clearArteloOrderId(orderId: string): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set artelo_order_id = null, artelo_submitted_at = null, updated_at = now()
    where id = ${orderId}
  `;
}

// ── Fulfilment (Artelo submission audit + COGS) ──────────────────────────────

/** Full order shape the fulfilment submitter needs to build an Artelo order. */
export type FulfillmentOrder = {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  totalCents: number;
  arteloOrderId: string | null;
  shipping: OrderShippingAddress;
  items: {
    /** order_items row id — lets the renderer persist render_asset_url per line. */
    id: string;
    productId: string;
    productLabel: string;
    quantity: number;
    unitPriceCents: number;
    /** Browser-canvas PNG (the fallback print asset). */
    assetUrl: string | null;
    /** Serialized vector SVG the server render rasterizes from (Phase B). */
    svgAssetUrl: string | null;
    /** Exact-DPI server-rendered PNG, once produced (Phase C; idempotent reuse). */
    renderAssetUrl: string | null;
    posterConfig: Record<string, unknown>;
  }[];
};

/** Load everything needed to submit an order to Artelo (null when unconfigured/absent). */
export async function getOrderForFulfillment(orderId: string): Promise<FulfillmentOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, order_number, email, currency, total_cents, artelo_order_id,
           ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postal, ship_country
    from orders where id = ${orderId} limit 1
  `) as unknown as (OrderRow & { total_cents: number })[];
  const row = rows[0];
  if (!row) return null;
  const items = (await sql`
    select id, product_id, product_label, quantity, unit_price_cents, poster_config,
           asset_url, svg_asset_url, render_asset_url
    from order_items where order_id = ${orderId} order by created_at asc
  `) as unknown as (ItemRow & {
    id: string;
    poster_config: Record<string, unknown>;
    svg_asset_url: string | null;
    render_asset_url: string | null;
  })[];
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    currency: row.currency,
    totalCents: row.total_cents,
    arteloOrderId: (row as unknown as { artelo_order_id: string | null }).artelo_order_id ?? null,
    shipping: {
      name: row.ship_name ?? undefined,
      line1: row.ship_line1 ?? undefined,
      line2: row.ship_line2 ?? undefined,
      city: row.ship_city ?? undefined,
      region: row.ship_region ?? undefined,
      postal: row.ship_postal ?? undefined,
      country: row.ship_country ?? undefined,
    },
    items: items.map((it) => ({
      id: it.id,
      productId: it.product_id,
      productLabel: it.product_label,
      quantity: it.quantity,
      unitPriceCents: it.unit_price_cents,
      assetUrl: it.asset_url ?? null,
      svgAssetUrl: it.svg_asset_url ?? null,
      renderAssetUrl: it.render_asset_url ?? null,
      posterConfig: it.poster_config ?? {},
    })),
  };
}

/**
 * Persist the exact-DPI server render's blob URL onto a line item so a re-run or
 * reprint reuses it instead of re-rasterizing (idempotency). DB-guarded no-op.
 */
export async function setRenderAssetUrl(orderItemId: string, url: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    update order_items set render_asset_url = ${url} where id = ${orderItemId}
  `;
}

export type FulfillmentAttempt = {
  orderId: string;
  status: "submitted" | "failed";
  isTest: boolean;
  arteloOrderId?: string | null;
  currency?: string;
  productionCostCents?: number | null;
  shippingCostCents?: number | null;
  taxCents?: number | null;
  requestPayload?: unknown;
  responsePayload?: unknown;
  error?: string | null;
};

/** Log one Artelo submission attempt (request/response + COGS) for observability. */
export async function recordFulfillmentAttempt(attempt: FulfillmentAttempt): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  const priorRows = (await sql`
    select count(*)::int as n from fulfillments where order_id = ${attempt.orderId}
  `) as unknown as { n: number }[];
  const attemptCount = (priorRows[0]?.n ?? 0) + 1;
  await sql`
    insert into fulfillments (
      order_id, provider, artelo_order_id, status, is_test, attempt_count, currency,
      production_cost_cents, shipping_cost_cents, tax_cents,
      request_payload, response_payload, error
    ) values (
      ${attempt.orderId}, 'artelo', ${attempt.arteloOrderId ?? null}, ${attempt.status},
      ${attempt.isTest}, ${attemptCount}, ${attempt.currency ?? "usd"},
      ${attempt.productionCostCents ?? null}, ${attempt.shippingCostCents ?? null}, ${attempt.taxCents ?? null},
      ${attempt.requestPayload === undefined ? null : JSON.stringify(attempt.requestPayload)}::jsonb,
      ${attempt.responsePayload === undefined ? null : JSON.stringify(attempt.responsePayload)}::jsonb,
      ${attempt.error ?? null}
    )
  `;
}

/** Attach the Stripe Checkout Session id once the session is created. */
export async function setStripeCheckoutSessionId(
  orderId: string,
  sessionId: string,
): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set stripe_checkout_session_id = ${sessionId}, updated_at = now()
    where id = ${orderId}
  `;
}

/** Locate an order by its internal id (webhooks resolve via metadata.orderId). */
export async function findOrderById(id: string): Promise<LocatedOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, status from orders where id = ${id} limit 1
  `) as unknown as LocatedOrder[];
  return rows[0] ?? null;
}

/** Order number + status by checkout session id (the /checkout/success read). */
export async function getOrderStatusByCheckoutSession(
  sessionId: string,
): Promise<CheckoutOrderStatus | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select order_number, status from orders
    where stripe_checkout_session_id = ${sessionId} limit 1
  `) as unknown as { order_number: string; status: OrderStatus }[];
  const row = rows[0];
  return row ? { orderNumber: row.order_number, status: row.status } : null;
}

/**
 * Persist the buyer details Stripe collected on the hosted page: backfill the
 * email (only when the order has none — guests), set the payment-intent id once
 * (so refunds can match), and fill the shipping address. Idempotent (coalesce /
 * set-if-empty) and DB-guarded so the webhook stays a no-op when unconfigured.
 */
export async function applyCheckoutDetails(
  orderId: string,
  details: { email?: string; paymentIntentId?: string; shipping?: OrderShippingAddress },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  const s = details.shipping ?? {};
  const email = details.email?.trim() ? details.email.trim() : null;
  await sql`
    update orders set
      email = case when (email is null or email = '') then coalesce(${email}, email) else email end,
      stripe_payment_intent_id = coalesce(stripe_payment_intent_id, ${details.paymentIntentId ?? null}),
      ship_name    = coalesce(${s.name ?? null}, ship_name),
      ship_line1   = coalesce(${s.line1 ?? null}, ship_line1),
      ship_line2   = coalesce(${s.line2 ?? null}, ship_line2),
      ship_city    = coalesce(${s.city ?? null}, ship_city),
      ship_region  = coalesce(${s.region ?? null}, ship_region),
      ship_postal  = coalesce(${s.postal ?? null}, ship_postal),
      ship_country = coalesce(${s.country ?? null}, ship_country),
      updated_at = now()
    where id = ${orderId}
  `;
}

// ── Digital delivery (post-payment email of PNG/SVG assets) ──────────────────

/** Order shape the digital-delivery module needs to build/send the email. */
export type DigitalDeliveryOrder = {
  id: string;
  orderNumber: string;
  email: string;
  digitalDeliveredAt: string | null;
  items: {
    productLabel: string;
    posterConfig: Record<string, unknown>;
    assetUrl: string | null;
    svgAssetUrl: string | null;
    phoneWallpaperAssetUrl: string | null;
    desktopWallpaperAssetUrl: string | null;
  }[];
};

/** Load everything needed to email an order's digital files (null when unconfigured/absent). */
export async function getOrderForDigitalDelivery(orderId: string): Promise<DigitalDeliveryOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, order_number, email, digital_delivered_at
    from orders where id = ${orderId} limit 1
  `) as unknown as {
    id: string;
    order_number: string;
    email: string;
    digital_delivered_at: string | Date | null;
  }[];
  const row = rows[0];
  if (!row) return null;
  const items = (await sql`
    select product_label, poster_config, asset_url, svg_asset_url,
           phone_wallpaper_asset_url, desktop_wallpaper_asset_url
    from order_items where order_id = ${orderId} order by created_at asc
  `) as unknown as {
    product_label: string;
    poster_config: Record<string, unknown>;
    asset_url: string | null;
    svg_asset_url: string | null;
    phone_wallpaper_asset_url: string | null;
    desktop_wallpaper_asset_url: string | null;
  }[];
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    digitalDeliveredAt: row.digital_delivered_at ? new Date(row.digital_delivered_at).toISOString() : null,
    items: items.map((it) => ({
      productLabel: it.product_label,
      posterConfig: it.poster_config ?? {},
      assetUrl: it.asset_url ?? null,
      phoneWallpaperAssetUrl: it.phone_wallpaper_asset_url ?? null,
      desktopWallpaperAssetUrl: it.desktop_wallpaper_asset_url ?? null,
      svgAssetUrl: it.svg_asset_url ?? null,
    })),
  };
}

/**
 * Atomically claim the right to deliver an order's digital files: sets
 * `digital_delivered_at` only if it's still null, in one conditional UPDATE.
 * This is the guard against a Stripe webhook retry (or two overlapping paid-
 * transition events) sending the email twice — only one caller's UPDATE can
 * match the `is null` predicate, so only one caller gets `true` back. Callers
 * that lose the claim must treat it exactly like "already delivered". Callers
 * whose subsequent send fails should call `releaseDigitalDeliveryClaim` to
 * unset it again so a later retry can re-claim.
 */
export async function claimDigitalDelivery(orderId: string): Promise<boolean> {
  const sql = requireSql();
  const rows = (await sql`
    update orders set digital_delivered_at = now(), updated_at = now()
    where id = ${orderId} and digital_delivered_at is null
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

/** Undo a claim after a failed send, so the next delivery attempt can retry. */
export async function releaseDigitalDeliveryClaim(orderId: string): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set digital_delivered_at = null, updated_at = now()
    where id = ${orderId}
  `;
}

// ── Fulfilment sweep (crash-mid-deferred-task safety net) ───────────────────

export type SweepCandidate = { id: string; orderNumber: string };

/**
 * Paid orders that still look unfinished past the deferred-task window, for the
 * hourly `/jobs/fulfillment-sweep` cron (routes/jobs.ts). The Stripe webhook now
 * defers its paid-transition side effects (order confirmation email + Artelo
 * submit + digital delivery) past the 200 response via waitUntil — a process
 * kill mid-task leaves a paid order stuck with no retry signal. Candidates are
 * `paid` orders whose `paid_at` is older than 15 minutes (well past normal
 * deferred-task duration) and any of:
 *   (a) still missing `confirmation_email_sent_at`,
 *   (b) have a non-digital line item but no `artelo_order_id` yet, or
 *   (c) have a line item with a deliverable asset but `digital_delivered_at`
 *       is still null.
 * (Shipped/delivered emails are NOT swept here — they're driven by Artelo
 * status callbacks that can legitimately land days after `paid_at`, so a
 * fixed 15-minute staleness window doesn't apply to them.)
 * Ordered oldest-first and capped by `limit`. `sendOrderConfirmationEmail`,
 * `submitOrderToArtelo`, and `deliverDigitalFiles` are all idempotent +
 * never-throw, so the caller can just re-run all three for every candidate
 * without re-deriving which part is missing.
 */
export async function findOrdersNeedingFulfillmentSweep(limit: number): Promise<SweepCandidate[]> {
  const sql = getSql();
  if (!sql) return [];
  const rows = (await sql`
    select o.id, o.order_number
    from orders o
    where o.status = 'paid'
      and o.paid_at is not null
      and o.paid_at < now() - interval '15 minutes'
      and (
        o.confirmation_email_sent_at is null
        or
        (
          o.artelo_order_id is null
          and exists (
            select 1 from order_items oi
            where oi.order_id = o.id
              and coalesce(oi.poster_config->>'format', '') <> 'digital'
          )
        )
        or
        (
          o.digital_delivered_at is null
          and exists (
            select 1 from order_items oi
            where oi.order_id = o.id
              and (oi.asset_url is not null or oi.svg_asset_url is not null)
          )
        )
      )
    order by o.paid_at asc
    limit ${limit}
  `) as unknown as { id: string; order_number: string }[];
  return rows.map((r) => ({ id: r.id, orderNumber: r.order_number }));
}

// ── Order confirmation email (post-payment receipt) ──────────────────────────

/** Order shape the order-confirmation module needs to build/send the email. */
export type ConfirmationEmailOrder = {
  id: string;
  orderNumber: string;
  email: string;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  confirmationEmailSentAt: string | null;
  shippingAddress?: OrderShippingAddress;
  items: { productLabel: string; quantity: number; unitPriceCents: number }[];
};

/** Load everything needed to email an order's confirmation (null when unconfigured/absent). */
export async function getOrderForConfirmationEmail(orderId: string): Promise<ConfirmationEmailOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select * from orders where id = ${orderId} limit 1
  `) as unknown as (OrderRow & { confirmation_email_sent_at: string | Date | null })[];
  const row = rows[0];
  if (!row) return null;
  const items = (await sql`
    select product_label, quantity, unit_price_cents
    from order_items where order_id = ${orderId} order by created_at asc
  `) as unknown as { product_label: string; quantity: number; unit_price_cents: number }[];
  const shippingAddress =
    row.ship_line1 || row.ship_name
      ? {
          name: row.ship_name ?? undefined,
          line1: row.ship_line1 ?? undefined,
          line2: row.ship_line2 ?? undefined,
          city: row.ship_city ?? undefined,
          region: row.ship_region ?? undefined,
          postal: row.ship_postal ?? undefined,
          country: row.ship_country ?? undefined,
        }
      : undefined;
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    currency: row.currency,
    subtotalCents: row.subtotal_cents,
    shippingCents: row.shipping_cents,
    totalCents: row.total_cents,
    confirmationEmailSentAt: row.confirmation_email_sent_at
      ? new Date(row.confirmation_email_sent_at).toISOString()
      : null,
    shippingAddress,
    items: items.map((it) => ({
      productLabel: it.product_label,
      quantity: it.quantity,
      unitPriceCents: it.unit_price_cents,
    })),
  };
}

/**
 * Atomically claim the right to email an order's confirmation: sets
 * `confirmation_email_sent_at` only if it's still null, mirroring
 * `claimDigitalDelivery`'s race-free "update ... where col is null" shape.
 */
export async function claimConfirmationEmail(orderId: string): Promise<boolean> {
  const sql = requireSql();
  const rows = (await sql`
    update orders set confirmation_email_sent_at = now(), updated_at = now()
    where id = ${orderId} and confirmation_email_sent_at is null
    returning id
  `) as unknown as { id: string }[];
  return rows.length > 0;
}

/** Undo a claim after a failed send, so the next attempt (webhook retry, sweep) can retry. */
export async function releaseConfirmationEmailClaim(orderId: string): Promise<void> {
  const sql = requireSql();
  await sql`
    update orders set confirmation_email_sent_at = null, updated_at = now()
    where id = ${orderId}
  `;
}

// ── Shipment notification emails (shipped / delivered) ───────────────────────

export type ShipmentEmailKind = "shipped" | "delivered";

/** Order shape the shipment-notification module needs to build/send the email. */
export type ShipmentEmailOrder = {
  id: string;
  orderNumber: string;
  email: string;
  userId: string | null;
  shippedEmailSentAt: string | null;
  deliveredEmailSentAt: string | null;
  tracking?: OrderTracking;
};

/** Load everything needed to email an order's shipped/delivered notice (null when unconfigured/absent). */
export async function getOrderForShipmentEmail(orderId: string): Promise<ShipmentEmailOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, order_number, email, user_id, tracking_carrier, tracking_number, tracking_url,
           shipped_email_sent_at, delivered_email_sent_at
    from orders where id = ${orderId} limit 1
  `) as unknown as {
    id: string;
    order_number: string;
    email: string;
    user_id: string | null;
    tracking_carrier: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    shipped_email_sent_at: string | Date | null;
    delivered_email_sent_at: string | Date | null;
  }[];
  const row = rows[0];
  if (!row) return null;
  const tracking =
    row.tracking_carrier || row.tracking_number || row.tracking_url
      ? {
          carrier: row.tracking_carrier ?? undefined,
          number: row.tracking_number ?? undefined,
          url: row.tracking_url ?? undefined,
        }
      : undefined;
  return {
    id: row.id,
    orderNumber: row.order_number,
    email: row.email,
    userId: row.user_id,
    shippedEmailSentAt: row.shipped_email_sent_at ? new Date(row.shipped_email_sent_at).toISOString() : null,
    deliveredEmailSentAt: row.delivered_email_sent_at
      ? new Date(row.delivered_email_sent_at).toISOString()
      : null,
    tracking,
  };
}

/**
 * Atomically claim the right to send a shipped/delivered email: sets the
 * matching `{kind}_email_sent_at` column only if it's still null. Shipped and
 * delivered are independent claims on separate columns (an order legitimately
 * gets both, one after the other), so `kind` picks which column this call
 * guards.
 */
export async function claimShipmentEmail(orderId: string, kind: ShipmentEmailKind): Promise<boolean> {
  const sql = requireSql();
  const rows = (
    kind === "shipped"
      ? await sql`
          update orders set shipped_email_sent_at = now(), updated_at = now()
          where id = ${orderId} and shipped_email_sent_at is null
          returning id
        `
      : await sql`
          update orders set delivered_email_sent_at = now(), updated_at = now()
          where id = ${orderId} and delivered_email_sent_at is null
          returning id
        `
  ) as unknown as { id: string }[];
  return rows.length > 0;
}

/** Undo a claim after a failed send, so a later retry (webhook or admin sync) can re-send. */
export async function releaseShipmentEmailClaim(orderId: string, kind: ShipmentEmailKind): Promise<void> {
  const sql = requireSql();
  if (kind === "shipped") {
    await sql`update orders set shipped_email_sent_at = null, updated_at = now() where id = ${orderId}`;
  } else {
    await sql`update orders set delivered_email_sent_at = null, updated_at = now() where id = ${orderId}`;
  }
}
