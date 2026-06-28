import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { app } from "./app.js";
import {
  extractCheckoutDetails,
  extractProdigiOrder,
  handleProdigiPayload,
  handleStripeEvent,
  mapProdigiStage,
  trackingFromShipments,
} from "./webhooks.js";

// Pure mapping helpers are unit-tested directly; the routes are tested for their
// no-op-when-unconfigured behavior (no DATABASE_URL in the hermetic test env, so
// order lookups return null and the handlers don't throw).

describe("prodigi stage mapping", () => {
  it("maps known stages", () => {
    expect(mapProdigiStage("InProgress")).toBe("in_production");
    expect(mapProdigiStage("Complete")).toBe("shipped");
    expect(mapProdigiStage("Cancelled")).toBe("cancelled");
  });
  it("returns null for unknown stages", () => {
    expect(mapProdigiStage("Whatever")).toBeNull();
  });
});

describe("extractProdigiOrder", () => {
  it("reads a bare order payload", () => {
    expect(extractProdigiOrder({ id: "ord_1", status: { stage: "Complete" } })).toMatchObject({
      id: "ord_1",
      stage: "Complete",
    });
  });
  it("reads a CloudEvents-wrapped payload", () => {
    const got = extractProdigiOrder({
      data: { order: { id: "ord_2", status: { stage: "InProgress" }, shipments: [] } },
    });
    expect(got).toMatchObject({ id: "ord_2", stage: "InProgress" });
  });
  it("tolerates junk", () => {
    expect(extractProdigiOrder(null)).toEqual({ id: undefined, stage: undefined, shipments: undefined });
  });
});

describe("trackingFromShipments", () => {
  it("pulls carrier + tracking from the first shipment", () => {
    expect(
      trackingFromShipments([
        { carrier: { name: "DPD" }, tracking: { number: "X1", url: "https://t/X1" } },
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
    await expect(handleStripeEvent(event)).resolves.toBeUndefined();
  });
});

describe("handleProdigiPayload — unconfigured DB", () => {
  it("no-ops (handled:false) without throwing", async () => {
    await expect(
      handleProdigiPayload({ id: "ord_x", status: { stage: "Complete" } }),
    ).resolves.toEqual({ handled: false });
  });
});

describe("webhook routes", () => {
  for (const base of ["", "/_/backend"]) {
    it(`prodigi: valid JSON → 204 (${base || "/"})`, async () => {
      const res = await app.request(`${base}/webhooks/prodigi`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: "ord_1", status: { stage: "Complete" } }),
      });
      expect(res.status).toBe(204);
    });

    it(`prodigi: invalid JSON → 400 (${base || "/"})`, async () => {
      const res = await app.request(`${base}/webhooks/prodigi`, {
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
});
