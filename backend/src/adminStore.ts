import type {
  AdminOrderSummary,
  AdminOrderListResponse,
  AdminOrderDetail,
  AdminFulfillment,
  AdminWebhookEvent,
  AdminActionEntry,
  AdminMetrics,
  OrderStatus,
  OrderEvent,
  OrderItem,
  OrderShippingAddress,
} from "@pinprint/shared";
import { getSql } from "./db.js";

// Admin read layer: dashboards over the same tables the customer app uses, plus
// the observability tables (fulfillments, webhook_events, admin_actions). All
// env-guarded — with DATABASE_URL unset every read returns empty, so the admin
// routes still respond (just with no data) and tests stay hermetic.

const iso = (v: unknown): string => (v ? new Date(v as string).toISOString() : "");
const isoOrNull = (v: unknown): string | null => (v ? new Date(v as string).toISOString() : null);

export type AdminOrderFilters = {
  status?: OrderStatus;
  search?: string; // matches order_number or email
  limit?: number;
  offset?: number;
};

/**
 * Orders for the admin table, newest first, with the latest fulfilment outcome
 * and per-order margin (retail total − Artelo COGS from the most recent
 * successful fulfilment) computed in SQL.
 */
export async function adminListOrders(filters: AdminOrderFilters): Promise<AdminOrderListResponse> {
  const sql = getSql();
  if (!sql) return { orders: [], total: 0 };
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  const status = filters.status ?? null;
  const search = filters.search?.trim() ? `%${filters.search.trim()}%` : null;

  const rows = (await sql`
    select
      o.id, o.order_number, o.status, o.email, o.currency,
      o.total_cents, o.amount_refunded_cents, o.created_at, o.paid_at,
      (select count(*)::int from order_items i where i.order_id = o.id) as item_count,
      (select i.product_label from order_items i where i.order_id = o.id order by i.created_at asc limit 1) as first_label,
      f.status as fulfillment_status,
      f.is_test as is_test,
      f.production_cost_cents, f.shipping_cost_cents, f.tax_cents
    from orders o
    left join lateral (
      select status, is_test, production_cost_cents, shipping_cost_cents, tax_cents
      from fulfillments where order_id = o.id order by created_at desc limit 1
    ) f on true
    where (${status}::order_status is null or o.status = ${status}::order_status)
      and (${search}::text is null or o.order_number ilike ${search} or o.email ilike ${search})
    order by o.created_at desc
    limit ${limit} offset ${offset}
  `) as unknown as Array<Record<string, unknown>>;

  const totalRows = (await sql`
    select count(*)::int as n from orders o
    where (${status}::order_status is null or o.status = ${status}::order_status)
      and (${search}::text is null or o.order_number ilike ${search} or o.email ilike ${search})
  `) as unknown as { n: number }[];

  const orders: AdminOrderSummary[] = rows.map((r) => {
    const total = Number(r.total_cents ?? 0);
    const cogs =
      r.fulfillment_status === "submitted"
        ? Number(r.production_cost_cents ?? 0) +
          Number(r.shipping_cost_cents ?? 0) +
          Number(r.tax_cents ?? 0)
        : null;
    const itemCount = Number(r.item_count ?? 0);
    const firstLabel = (r.first_label as string) ?? "Poster";
    return {
      id: r.id as string,
      orderNumber: r.order_number as string,
      status: r.status as OrderStatus,
      email: r.email as string,
      currency: r.currency as string,
      totalCents: total,
      amountRefundedCents: Number(r.amount_refunded_cents ?? 0),
      itemCount,
      previewLabel: itemCount > 1 ? `${firstLabel} + ${itemCount - 1} more` : firstLabel,
      fulfillmentStatus: (r.fulfillment_status as "submitted" | "failed" | null) ?? null,
      isTest: (r.is_test as boolean | null) ?? null,
      marginCents: cogs === null ? null : total - cogs,
      createdAt: iso(r.created_at),
      paidAt: isoOrNull(r.paid_at),
    };
  });

  return { orders, total: totalRows[0]?.n ?? orders.length };
}

/** Full admin detail for one order (by internal id), including the audit logs. */
export async function adminGetOrderDetail(orderId: string): Promise<AdminOrderDetail | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`select * from orders where id = ${orderId} limit 1`) as unknown as Array<
    Record<string, unknown>
  >;
  const o = rows[0];
  if (!o) return null;

  const items = (await sql`
    select product_id, product_label, quantity, unit_price_cents, poster_config, artelo_sku, asset_url
    from order_items where order_id = ${orderId} order by created_at asc
  `) as unknown as Array<Record<string, unknown>>;

  const events = (await sql`
    select status, message, source, created_at
    from order_events where order_id = ${orderId} order by created_at asc
  `) as unknown as Array<Record<string, unknown>>;

  const fulfillments = (await sql`
    select id, status, is_test, artelo_order_id, attempt_count, currency,
           production_cost_cents, shipping_cost_cents, tax_cents, error, created_at
    from fulfillments where order_id = ${orderId} order by created_at desc
  `) as unknown as Array<Record<string, unknown>>;

  const webhookEvents = (await sql`
    select id, provider, event_type, signature_valid, processing_status, error, received_at
    from webhook_events where order_id = ${orderId} order by received_at desc limit 100
  `) as unknown as Array<Record<string, unknown>>;

  const adminActions = (await sql`
    select actor_email, action, detail, created_at
    from admin_actions where order_id = ${orderId} order by created_at desc
  `) as unknown as Array<Record<string, unknown>>;

  const shippingAddress: OrderShippingAddress | undefined =
    o.ship_line1 || o.ship_name
      ? {
          name: (o.ship_name as string) ?? undefined,
          line1: (o.ship_line1 as string) ?? undefined,
          line2: (o.ship_line2 as string) ?? undefined,
          city: (o.ship_city as string) ?? undefined,
          region: (o.ship_region as string) ?? undefined,
          postal: (o.ship_postal as string) ?? undefined,
          country: (o.ship_country as string) ?? undefined,
        }
      : undefined;

  const tracking =
    o.tracking_carrier || o.tracking_number || o.tracking_url
      ? {
          carrier: (o.tracking_carrier as string) ?? undefined,
          number: (o.tracking_number as string) ?? undefined,
          url: (o.tracking_url as string) ?? undefined,
        }
      : undefined;

  return {
    id: o.id as string,
    orderNumber: o.order_number as string,
    status: o.status as OrderStatus,
    email: o.email as string,
    userId: (o.user_id as string | null) ?? null,
    currency: o.currency as string,
    subtotalCents: Number(o.subtotal_cents ?? 0),
    shippingCents: Number(o.shipping_cents ?? 0),
    totalCents: Number(o.total_cents ?? 0),
    amountRefundedCents: Number(o.amount_refunded_cents ?? 0),
    arteloOrderId: (o.artelo_order_id as string | null) ?? null,
    arteloStatus: (o.artelo_status as string | null) ?? null,
    stripePaymentIntentId: (o.stripe_payment_intent_id as string | null) ?? null,
    shippingAddress,
    tracking,
    items: items.map(
      (it): OrderItem => ({
        productId: it.product_id as string,
        productLabel: it.product_label as string,
        quantity: Number(it.quantity ?? 0),
        unitPriceCents: Number(it.unit_price_cents ?? 0),
        arteloSku: (it.artelo_sku as string | null) ?? undefined,
        assetUrl: (it.asset_url as string | null) ?? undefined,
        posterConfig: (it.poster_config as Record<string, unknown>) ?? {},
      }),
    ),
    events: events.map(
      (e): OrderEvent => ({
        status: (e.status as OrderStatus | null) ?? null,
        message: e.message as string,
        source: e.source as OrderEvent["source"],
        createdAt: iso(e.created_at),
      }),
    ),
    fulfillments: fulfillments.map(
      (f): AdminFulfillment => ({
        id: f.id as string,
        status: f.status as "submitted" | "failed",
        isTest: Boolean(f.is_test),
        arteloOrderId: (f.artelo_order_id as string | null) ?? null,
        attemptCount: Number(f.attempt_count ?? 1),
        currency: (f.currency as string) ?? "usd",
        productionCostCents: (f.production_cost_cents as number | null) ?? null,
        shippingCostCents: (f.shipping_cost_cents as number | null) ?? null,
        taxCents: (f.tax_cents as number | null) ?? null,
        error: (f.error as string | null) ?? null,
        createdAt: iso(f.created_at),
      }),
    ),
    webhookEvents: webhookEvents.map(
      (w): AdminWebhookEvent => ({
        id: w.id as string,
        provider: w.provider as "stripe" | "artelo",
        eventType: (w.event_type as string | null) ?? null,
        signatureValid: (w.signature_valid as boolean | null) ?? null,
        processingStatus: w.processing_status as string,
        error: (w.error as string | null) ?? null,
        receivedAt: iso(w.received_at),
      }),
    ),
    adminActions: adminActions.map(
      (a): AdminActionEntry => ({
        actorEmail: a.actor_email as string,
        action: a.action as string,
        detail: (a.detail as Record<string, unknown> | null) ?? null,
        createdAt: iso(a.created_at),
      }),
    ),
    createdAt: iso(o.created_at),
    paidAt: isoOrNull(o.paid_at),
    cancelledAt: isoOrNull(o.cancelled_at),
    refundedAt: isoOrNull(o.refunded_at),
  };
}

/** Aggregate operational metrics: revenue, COGS, margin, failure/test counts. */
export async function adminGetMetrics(): Promise<AdminMetrics> {
  const empty: AdminMetrics = {
    ordersByStatus: {},
    paidOrderCount: 0,
    grossRevenueCents: 0,
    refundedCents: 0,
    cogsCents: 0,
    marginCents: 0,
    failedFulfillmentCount: 0,
    testOrderCount: 0,
  };
  const sql = getSql();
  if (!sql) return empty;

  const byStatus = (await sql`
    select status, count(*)::int as n from orders group by status
  `) as unknown as { status: string; n: number }[];
  const ordersByStatus: Record<string, number> = {};
  for (const r of byStatus) ordersByStatus[r.status] = r.n;

  // Revenue: orders that reached paid or beyond (exclude pending_payment).
  const revenueRows = (await sql`
    select coalesce(sum(total_cents),0)::bigint as gross,
           coalesce(sum(amount_refunded_cents),0)::bigint as refunded,
           count(*)::int as n
    from orders
    where status in ('paid','in_production','shipped','delivered','refunded')
  `) as unknown as { gross: string; refunded: string; n: number }[];

  // COGS: sum across successful, non-test fulfilments (real money).
  const cogsRows = (await sql`
    select coalesce(sum(coalesce(production_cost_cents,0)+coalesce(shipping_cost_cents,0)+coalesce(tax_cents,0)),0)::bigint as cogs
    from fulfillments where status = 'submitted' and is_test = false
  `) as unknown as { cogs: string }[];

  const failedRows = (await sql`
    select count(distinct order_id)::int as n from fulfillments f
    where status = 'failed'
      and not exists (select 1 from fulfillments s where s.order_id = f.order_id and s.status = 'submitted')
  `) as unknown as { n: number }[];

  const testRows = (await sql`
    select count(distinct order_id)::int as n from fulfillments where is_test = true
  `) as unknown as { n: number }[];

  const gross = Number(revenueRows[0]?.gross ?? 0);
  const refunded = Number(revenueRows[0]?.refunded ?? 0);
  const cogs = Number(cogsRows[0]?.cogs ?? 0);

  return {
    ordersByStatus,
    paidOrderCount: revenueRows[0]?.n ?? 0,
    grossRevenueCents: gross,
    refundedCents: refunded,
    cogsCents: cogs,
    marginCents: gross - refunded - cogs,
    failedFulfillmentCount: failedRows[0]?.n ?? 0,
    testOrderCount: testRows[0]?.n ?? 0,
  };
}
