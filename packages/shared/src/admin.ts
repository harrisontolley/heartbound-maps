// Admin API contracts — the shapes the operator dashboard (frontend/src/app/admin)
// exchanges with the backend admin routes (backend/src/routes/admin.ts). Admin is
// gated server-side by the ADMIN_EMAILS allowlist; these types carry richer data
// than the customer-facing Order (COGS/margin, raw webhook log, fulfilment audit).

import type { OrderStatus, OrderEvent, OrderItem, OrderTracking, OrderShippingAddress } from "./orders.js";

/** A row in the admin orders table. */
export type AdminOrderSummary = {
  id: string; // internal uuid (admin actions key off this, not the public number)
  orderNumber: string;
  status: OrderStatus;
  email: string;
  currency: string;
  totalCents: number;
  amountRefundedCents: number;
  itemCount: number;
  previewLabel: string;
  /** Latest fulfilment outcome, if any (for the failed-fulfilment queue). */
  fulfillmentStatus?: "submitted" | "failed" | null;
  isTest?: boolean | null;
  /** Retail total − Artelo COGS, in cents, when a successful fulfilment exists. */
  marginCents?: number | null;
  createdAt: string;
  paidAt?: string | null;
};

export type AdminOrderListResponse = {
  orders: AdminOrderSummary[];
  total: number;
};

/** One Artelo submission attempt (audit + COGS), as shown in the admin detail. */
export type AdminFulfillment = {
  id: string;
  status: "submitted" | "failed";
  isTest: boolean;
  arteloOrderId?: string | null;
  attemptCount: number;
  currency: string;
  productionCostCents?: number | null;
  shippingCostCents?: number | null;
  taxCents?: number | null;
  error?: string | null;
  createdAt: string;
};

/** One raw inbound webhook, as shown in the admin detail's forensic log. */
export type AdminWebhookEvent = {
  id: string;
  provider: "stripe" | "artelo";
  eventType?: string | null;
  signatureValid?: boolean | null;
  processingStatus: string;
  error?: string | null;
  receivedAt: string;
};

/** One admin action taken on this order (audit trail). */
export type AdminActionEntry = {
  actorEmail: string;
  action: string;
  detail?: Record<string, unknown> | null;
  createdAt: string;
};

/** Full admin order detail. */
export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  email: string;
  userId?: string | null;
  currency: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  amountRefundedCents: number;
  arteloOrderId?: string | null;
  arteloStatus?: string | null;
  stripePaymentIntentId?: string | null;
  shippingAddress?: OrderShippingAddress;
  tracking?: OrderTracking;
  items: OrderItem[];
  events: OrderEvent[];
  fulfillments: AdminFulfillment[];
  webhookEvents: AdminWebhookEvent[];
  adminActions: AdminActionEntry[];
  createdAt: string;
  paidAt?: string | null;
  cancelledAt?: string | null;
  refundedAt?: string | null;
};

/** Aggregate operational metrics for the admin dashboard. */
export type AdminMetrics = {
  ordersByStatus: Record<string, number>;
  paidOrderCount: number;
  grossRevenueCents: number; // sum of total_cents for paid+ orders
  refundedCents: number;
  cogsCents: number; // sum of production+shipping+tax across successful fulfilments
  marginCents: number; // grossRevenue − refunds − cogs
  failedFulfillmentCount: number;
  testOrderCount: number;
};

// ── Request payloads ─────────────────────────────────────────────────────────

export type AdminRefundRequest = {
  /** Omit for a full refund; otherwise a partial amount in cents. */
  amountCents?: number;
  reason?: string;
};

export type AdminCancelRequest = {
  /** Also refund the customer via Stripe (default true). */
  refund?: boolean;
  reason?: string;
};

export type AdminAddressUpdateRequest = OrderShippingAddress;

export type AdminActionResult = {
  ok: boolean;
  message?: string;
  detail?: Record<string, unknown>;
};
