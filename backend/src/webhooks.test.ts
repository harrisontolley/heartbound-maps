import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { app } from "./app.js";
import {
  extractArteloOrder,
  extractCheckoutDetails,
  handleArteloPayload,
  handleStripeEvent,
  mapArteloStatus,
  trackingFromShipments,
} from "./webhooks.js";

// Pure mapping helpers are unit-tested directly; the routes are tested for their
// no-op-when-unconfigured behavior (no DATABASE_URL in the hermetic test env, so
// order lookups return null and the handlers don't throw).

// The paid-transition hook-in (submitOrderToArtelo + deliverDigitalFiles) needs a
// "found, pending_payment" order to reach those calls at all — a real DB lookup
// no-ops in the hermetic test env above — so it's covered separately with the
// order lookup/advance mocked and the two fire-and-forget collaborators spied on.
const findOrderById = vi.fn();
const advanceOrderStatus = vi.fn();
const applyCheckoutDetails = vi.fn();
vi.mock("./orders.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./orders.js")>();
  return {
    ...actual,
    findOrderById: (...args: unknown[]) => findOrderById(...args),
    advanceOrderStatus: (...args: unknown[]) => advanceOrderStatus(...args),
    applyCheckoutDetails: (...args: unknown[]) => applyCheckoutDetails(...args),
  };
});

const submitOrderToArtelo = vi.fn();
vi.mock("./fulfillment.js", () => ({
  submitOrderToArtelo: (...args: unknown[]) => submitOrderToArtelo(...args),
}));

const deliverDigitalFiles = vi.fn();
vi.mock("./digitalDelivery.js", () => ({
  deliverDigitalFiles: (...args: unknown[]) => deliverDigitalFiles(...args),
}));

describe("artelo status mapping", () => {
  it("maps known statuses", () => {
    expect(mapArteloStatus("InProduction")).toBe("in_production");
    expect(mapArteloStatus("Shipped")).toBe("shipped");
    expect(mapArteloStatus("Delivered")).toBe("delivered");
    expect(mapArteloStatus("Canceled")).toBe("cancelled");
  });
  it("returns null for Received (already paid) and unknown statuses", () => {
    expect(mapArteloStatus("Received")).toBeNull();
    expect(mapArteloStatus("Whatever")).toBeNull();
  });
});

describe("extractArteloOrder", () => {
  it("reads a bare order payload", () => {
    expect(extractArteloOrder({ id: "ord_1", status: "Shipped" })).toMatchObject({
      id: "ord_1",
      status: "Shipped",
    });
  });
  it("reads a {data:{order}}-wrapped payload", () => {
    const got = extractArteloOrder({
      data: { order: { id: "ord_2", status: "InProduction", shipments: [] } },
    });
    expect(got).toMatchObject({ id: "ord_2", status: "InProduction" });
  });
  it("tolerates junk", () => {
    expect(extractArteloOrder(null)).toEqual({ id: undefined, status: undefined, shipments: undefined });
  });
});

describe("trackingFromShipments", () => {
  it("pulls carrier + tracking from the first shipment", () => {
    expect(
      trackingFromShipments([
        { carrierCode: "DPD", trackingNumber: "X1", trackingUrl: "https://t/X1" },
      ]),
    ).toEqual({ carrier: "DPD", number: "X1", url: "https://t/X1" });
  });
  it("returns undefined when empty or absent", () => {
    expect(trackingFromShipments([])).toBeUndefined();
    expect(trackingFromShipments(undefined)).toBeUndefined();
    expect(trackingFromShipments([{}])).toBeUndefined();
  });
});

describe("extractCheckoutDetails", () => {
  it("maps Stripe's collected shipping, customer email, and payment intent", () => {
    const session = {
      id: "cs_test_1",
      payment_intent: "pi_123",
      customer_email: null,
      customer_details: { email: "buyer@example.com" },
      collected_information: {
        shipping_details: {
          name: "Ada Lovelace",
          address: {
            line1: "1 Analytical Way",
            line2: "Floor 2",
            city: "London",
            state: "Greater London", // Stripe → ship_region
            postal_code: "SW1A 1AA", // Stripe → ship_postal
            country: "GB",
          },
        },
      },
    } as unknown as Stripe.Checkout.Session;
    expect(extractCheckoutDetails(session)).toEqual({
      email: "buyer@example.com",
      paymentIntentId: "pi_123",
      shipping: {
        name: "Ada Lovelace",
        line1: "1 Analytical Way",
        line2: "Floor 2",
        city: "London",
        region: "Greater London",
        postal: "SW1A 1AA",
        country: "GB",
      },
    });
  });

  it("falls back to customer_email and a nested payment_intent object", () => {
    const session = {
      id: "cs_test_2",
      payment_intent: { id: "pi_456" },
      customer_email: "fallback@example.com",
      customer_details: null,
    } as unknown as Stripe.Checkout.Session;
    const got = extractCheckoutDetails(session);
    expect(got.email).toBe("fallback@example.com");
    expect(got.paymentIntentId).toBe("pi_456");
    expect(got.shipping).toBeUndefined();
  });

  it("returns no shipping for a digital-only session", () => {
    const session = {
      id: "cs_test_3",
      payment_intent: "pi_1",
      customer_details: { email: "d@e.com" },
    } as unknown as Stripe.Checkout.Session;
    expect(extractCheckoutDetails(session).shipping).toBeUndefined();
  });
});

describe("handleStripeEvent — unconfigured DB", () => {
  it("no-ops on checkout.session.completed without throwing", async () => {
    const event = {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_x",
          metadata: { orderId: "ord_x" },
          payment_intent: "pi_x",
          customer_details: { email: "a@b.com" },
        },
      },
    } as unknown as Stripe.Event;
    // No DB → the order lookups return null, so nothing is handled (and no throw).
    await expect(handleStripeEvent(event)).resolves.toEqual({ handled: false });
  });
});

describe("handleStripeEvent — paid-transition hook-in (fulfilment + digital delivery)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findOrderById.mockResolvedValue({ id: "ord-1", status: "pending_payment" });
    advanceOrderStatus.mockResolvedValue(undefined);
    applyCheckoutDetails.mockResolvedValue(undefined);
    submitOrderToArtelo.mockResolvedValue({ submitted: true });
    deliverDigitalFiles.mockResolvedValue({ delivered: true });
  });

  function completedEvent(overrides: Record<string, unknown> = {}): Stripe.Event {
    return {
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_1",
          metadata: { orderId: "ord-1" },
          payment_intent: "pi_1",
          payment_status: "paid",
          customer_details: { email: "buyer@example.com" },
          ...overrides,
        },
      },
    } as unknown as Stripe.Event;
  }

  it("fires deliverDigitalFiles alongside submitOrderToArtelo once a session settles as paid", async () => {
    const result = await handleStripeEvent(completedEvent());
    expect(result).toEqual({ handled: true, orderId: "ord-1" });
    expect(advanceOrderStatus).toHaveBeenCalledWith("ord-1", "paid", expect.any(Object));
    expect(submitOrderToArtelo).toHaveBeenCalledWith("ord-1");
    expect(deliverDigitalFiles).toHaveBeenCalledWith("ord-1");
  });

  it("also fires on the async-payment-succeeded parity path", async () => {
    await handleStripeEvent({
      type: "checkout.session.async_payment_succeeded",
      data: { object: (completedEvent().data as { object: unknown }).object },
    } as unknown as Stripe.Event);
    expect(deliverDigitalFiles).toHaveBeenCalledWith("ord-1");
    expect(submitOrderToArtelo).toHaveBeenCalledWith("ord-1");
  });

  it("does not fire delivery when the session hasn't actually settled (async, still unpaid)", async () => {
    await handleStripeEvent(completedEvent({ payment_status: "unpaid" }));
    expect(deliverDigitalFiles).not.toHaveBeenCalled();
    expect(submitOrderToArtelo).not.toHaveBeenCalled();
  });

  it("a rejected deliverDigitalFiles promise does not throw out of the handler (webhook isolation)", async () => {
    deliverDigitalFiles.mockRejectedValue(new Error("resend blew up"));
    await expect(handleStripeEvent(completedEvent())).resolves.toEqual({
      handled: true,
      orderId: "ord-1",
    });
  });

  it("a rejected deliverDigitalFiles promise does not prevent the Artelo submission from firing", async () => {
    deliverDigitalFiles.mockRejectedValue(new Error("resend blew up"));
    await handleStripeEvent(completedEvent());
    expect(submitOrderToArtelo).toHaveBeenCalledWith("ord-1");
  });

  it("a rejected submitOrderToArtelo promise does not prevent digital delivery from firing", async () => {
    submitOrderToArtelo.mockRejectedValue(new Error("artelo blew up"));
    await handleStripeEvent(completedEvent());
    expect(deliverDigitalFiles).toHaveBeenCalledWith("ord-1");
  });

  // The print render inside submitOrderToArtelo can take ~32 s — past Stripe's
  // retry window — so the handler must resolve (→ webhook 200) *before* the side
  // effects run, via the injected deferrer (waitUntil on Vercel).
  it("resolves before deferred side effects run (webhook 200 timing)", async () => {
    const deferred: Array<() => Promise<unknown>> = [];
    const result = await handleStripeEvent(completedEvent(), (task) => {
      deferred.push(task);
    });
    // Handler already resolved; neither side effect has been invoked yet.
    expect(result).toEqual({ handled: true, orderId: "ord-1" });
    expect(deferred).toHaveLength(2);
    expect(submitOrderToArtelo).not.toHaveBeenCalled();
    expect(deliverDigitalFiles).not.toHaveBeenCalled();
    // The deferred tasks then actually invoke both side effects.
    await Promise.all(deferred.map((t) => t()));
    expect(submitOrderToArtelo).toHaveBeenCalledWith("ord-1");
    expect(deliverDigitalFiles).toHaveBeenCalledWith("ord-1");
  });

  it("still resolves cleanly when a deferred side effect ultimately fails", async () => {
    submitOrderToArtelo.mockRejectedValue(new Error("slow render blew up"));
    const deferred: Array<() => Promise<unknown>> = [];
    const result = await handleStripeEvent(completedEvent(), (task) => {
      deferred.push(task);
    });
    expect(result).toEqual({ handled: true, orderId: "ord-1" });
    // Running the failing task later never propagates back into the handler.
    await Promise.all(deferred.map((t) => t().catch(() => {})));
    expect(submitOrderToArtelo).toHaveBeenCalled();
  });
});

describe("handleArteloPayload — unconfigured DB", () => {
  it("no-ops (handled:false) without throwing", async () => {
    await expect(
      handleArteloPayload({ id: "ord_x", status: "Shipped" }),
    ).resolves.toEqual({ handled: false });
  });
});

describe("webhook routes", () => {
  afterEach(() => {
    delete process.env.ARTELO_WEBHOOK_SECRET;
  });

  for (const base of ["", "/_/backend"]) {
    it(`artelo: valid JSON → 204 when no secret configured (${base || "/"})`, async () => {
      const res = await app.request(`${base}/webhooks/artelo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "ord_1", status: "Shipped" }),
      });
      expect(res.status).toBe(204);
    });

    it(`artelo: invalid JSON → 400 (${base || "/"})`, async () => {
      const res = await app.request(`${base}/webhooks/artelo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "not json",
      });
      expect(res.status).toBe(400);
    });

    it(`stripe: missing signature → 400 (${base || "/"})`, async () => {
      const res = await app.request(`${base}/webhooks/stripe`, {
        method: "POST",
        body: "{}",
      });
      expect(res.status).toBe(400);
    });
  }

  it("artelo: rejects a bad signature when a secret is configured", async () => {
    process.env.ARTELO_WEBHOOK_SECRET = "whsec_artelo";
    const res = await app.request("/webhooks/artelo", {
      method: "POST",
      headers: { "content-type": "application/json", "x-artelo-signature": "deadbeef" },
      body: JSON.stringify({ id: "ord_1", status: "Shipped" }),
    });
    expect(res.status).toBe(400);
  });

  it("artelo: accepts a correctly-signed body when a secret is configured", async () => {
    const secret = "whsec_artelo";
    process.env.ARTELO_WEBHOOK_SECRET = secret;
    const payload = JSON.stringify({ id: "ord_1", status: "Shipped" });
    // Mirror Artelo's scheme: HMAC over JSON.stringify(JSON.parse(body)).
    const sig = createHmac("sha256", secret)
      .update(JSON.stringify(JSON.parse(payload)))
      .digest("hex");
    const res = await app.request("/webhooks/artelo", {
      method: "POST",
      headers: { "content-type": "application/json", "x-artelo-signature": sig },
      body: payload,
    });
    expect(res.status).toBe(204);
  });
});
