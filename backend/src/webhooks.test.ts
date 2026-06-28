import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
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
