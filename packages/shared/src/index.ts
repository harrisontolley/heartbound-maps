// Shared API contract types — the single source of truth for data that crosses
// the frontend <-> backend boundary.

/** Normalized geocoder result returned by the backend /geocode routes. */
export type GeoResult = {
  id: string;
  label: string;
  fullName: string;
  lat: number;
  lng: number;
  kind?: string;
};

// Account system contracts (auth, orders, rewards, public tracking).
export type {
  OrderStatus,
  EventSource,
  OrderItem,
  OrderEvent,
  OrderTracking,
  OrderSummary,
  Order,
  OrderShippingAddress,
} from "./orders.js";
export type {
  AccountUnits,
  Address,
  AddressInput,
  AccountProfile,
  AccountProfilePatch,
} from "./account.js";
export type { RewardKind, RewardEvent, Rewards } from "./rewards.js";
export type {
  TrackRequest,
  TrackTimelineEntry,
  TrackResult,
} from "./track.js";

// Commerce: product catalogue, pricing, and checkout contracts (values + types).
export * from "./commerce.js";

// Admin dashboard contracts (operator-only; richer than the customer Order).
export type {
  AdminOrderSummary,
  AdminOrderListResponse,
  AdminFulfillment,
  AdminWebhookEvent,
  AdminActionEntry,
  AdminOrderDetail,
  AdminMetrics,
  AdminRefundRequest,
  AdminCancelRequest,
  AdminAddressUpdateRequest,
  AdminActionResult,
} from "./admin.js";
