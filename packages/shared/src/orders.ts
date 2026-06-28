// Order contract types — the shape of a Pinprint order as it crosses the
// frontend <-> backend boundary. The backend persists richer rows (Stripe/Artelo
// ids, raw event payloads); only the fields below are ever sent to the client.

/** Lifecycle of an order, from payment through Artelo fulfilment. */
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "in_production"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

/** Who emitted a timeline event. */
export type EventSource = "stripe" | "artelo" | "system";

/**
 * A line item. `posterConfig` is the immutable snapshot of the poster definition
 * at order time (mirrors the studio store) so the print stays reproducible even
 * as frontend types evolve — kept loose at the wire boundary on purpose.
 */
export type OrderItem = {
  productId: string;
  productLabel: string;
  quantity: number;
  unitPriceCents: number;
  arteloSku?: string;
  assetUrl?: string;
  posterConfig: Record<string, unknown>;
};

/** One row in an order's tracking timeline. */
export type OrderEvent = {
  status: OrderStatus | null;
  message: string;
  source: EventSource;
  createdAt: string; // ISO 8601
};

/** Carrier tracking for a shipped order. */
export type OrderTracking = {
  carrier?: string;
  number?: string;
  url?: string;
};

/** Lightweight row for order-history lists. */
export type OrderSummary = {
  orderNumber: string; // public, human-friendly: PP-XXXXXX
  status: OrderStatus;
  currency: string;
  totalCents: number;
  createdAt: string; // ISO 8601
  itemCount: number;
  previewLabel: string; // e.g. "Portrait 16×24 + 1 more"
};

/** Full order detail returned for the authenticated owner. */
export type Order = OrderSummary & {
  email: string;
  subtotalCents: number;
  shippingCents: number;
  items: OrderItem[];
  events: OrderEvent[];
  tracking?: OrderTracking;
  shippingAddress?: OrderShippingAddress;
};

/** Denormalized shipping snapshot stored on the order. */
export type OrderShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal?: string;
  country?: string;
};
