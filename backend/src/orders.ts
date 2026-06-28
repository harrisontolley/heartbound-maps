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

// Order persistence + the helpers the Stripe/Prodigi webhooks and the dev/seed
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
  prodigi_sku: string | null;
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
  const first = items[0]?.product_label ?? "Poster";
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
    prodigiSku: it.prodigi_sku ?? undefined,
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
           prodigi_sku, asset_url
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
  prodigiSku?: string;
  assetUrl?: string;
};

export type NewOrder = {
  userId?: string | null;
  email: string;
  status?: OrderStatus;
  currency?: string;
  shippingCents?: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  prodigiOrderId?: string;
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
      stripe_payment_intent_id, stripe_checkout_session_id, prodigi_order_id,
      ship_name, ship_line1, ship_line2, ship_city, ship_region, ship_postal, ship_country,
      created_at, updated_at
    ) values (
      ${id}, ${orderNumber}, ${input.userId ?? null}, ${input.email}, ${status}, ${input.currency ?? "usd"},
      ${subtotal}, ${shipping}, ${total},
      ${input.stripePaymentIntentId ?? null}, ${input.stripeCheckoutSessionId ?? null}, ${input.prodigiOrderId ?? null},
      ${s.name ?? null}, ${s.line1 ?? null}, ${s.line2 ?? null}, ${s.city ?? null},
      ${s.region ?? null}, ${s.postal ?? null}, ${s.country ?? null},
      ${createdAt}, ${createdAt}
    )
  `;
  for (const it of input.items) {
    await sql`
      insert into order_items (
        order_id, product_id, product_label, quantity, unit_price_cents,
        poster_config, prodigi_sku, asset_url, created_at
      ) values (
        ${id}, ${it.productId}, ${it.productLabel}, ${it.quantity}, ${it.unitPriceCents},
        ${JSON.stringify(it.posterConfig ?? {})}::jsonb, ${it.prodigiSku ?? null}, ${it.assetUrl ?? null}, ${createdAt}
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
  await sql`
    update orders set
      status = ${status},
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

export async function findOrderByProdigiId(id: string): Promise<LocatedOrder | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, status from orders where prodigi_order_id = ${id} limit 1
  `) as unknown as LocatedOrder[];
  return rows[0] ?? null;
}

/** Attach a Prodigi order id to an order (set once when fulfilment is submitted). */
export async function setProdigiOrderId(orderId: string, prodigiOrderId: string): Promise<void> {
  const sql = requireSql();
  await sql`update orders set prodigi_order_id = ${prodigiOrderId}, updated_at = now() where id = ${orderId}`;
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
