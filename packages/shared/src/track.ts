// Public order-tracking contract — deliberately narrow. The /track endpoint is
// unauthenticated (order number + email), so it returns only what a buyer needs
// to see, and never user ids, emails, or Stripe/Artelo identifiers.

import type { OrderStatus, OrderTracking } from "./orders.js";

/** Public lookup request. */
export type TrackRequest = {
  orderNumber: string;
  email: string;
};

/** One status step shown on the public tracking timeline. */
export type TrackTimelineEntry = {
  status: OrderStatus | null;
  message: string;
  createdAt: string; // ISO 8601
};

/** Public tracking result for a single order. */
export type TrackResult = {
  orderNumber: string;
  status: OrderStatus;
  placedAt: string; // ISO 8601
  items: { label: string; quantity: number }[];
  timeline: TrackTimelineEntry[];
  tracking?: OrderTracking;
};
