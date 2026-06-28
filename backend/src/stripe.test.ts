import { beforeAll, describe, expect, it } from "vitest";
import Stripe from "stripe";
import { app } from "./app.js";
import { constructWebhookEvent, isStripeConfigured } from "./stripe.js";

// Hermetic: no network, no real keys. We use a dummy secret key and Stripe's own
// generateTestHeaderString to forge a VALID signature offline, exercising the real
// verification path. This is the template for every integration test.

const WEBHOOK_SECRET = "whsec_test_secret";

beforeAll(() => {
  process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
});

function signed(payload: string): string {
  const stripe = new Stripe("sk_test_dummy");
  return stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
}

describe("stripe webhook", () => {
  const payload = JSON.stringify({ id: "evt_1", type: "payment_intent.succeeded" });

  it("isStripeConfigured reflects the env", () => {
    expect(isStripeConfigured()).toBe(true);
  });

  it("constructWebhookEvent accepts a correctly-signed payload", () => {
    const event = constructWebhookEvent(payload, signed(payload));
    expect(event.id).toBe("evt_1");
    expect(event.type).toBe("payment_intent.succeeded");
  });

  it("constructWebhookEvent rejects a bad signature", () => {
    expect(() => constructWebhookEvent(payload, "t=1,v1=deadbeef")).toThrow();
  });

  it("POST /webhooks/stripe → 400 without a signature header", async () => {
    const res = await app.request("/webhooks/stripe", { method: "POST", body: payload });
    expect(res.status).toBe(400);
  });

  it("POST /webhooks/stripe → 204 with a valid signature", async () => {
    const res = await app.request("/webhooks/stripe", {
      method: "POST",
      body: payload,
      headers: { "stripe-signature": signed(payload) },
    });
    expect(res.status).toBe(204);
  });

  it("POST /webhooks/artelo → 204 with a JSON body, 400 otherwise", async () => {
    const ok = await app.request("/webhooks/artelo", {
      method: "POST",
      body: JSON.stringify({ id: "ord_1", status: "InProduction" }),
      headers: { "content-type": "application/json" },
    });
    expect(ok.status).toBe(204);

    const bad = await app.request("/webhooks/artelo", { method: "POST", body: "not-json" });
    expect(bad.status).toBe(400);
  });

  it("GET /health/integrations reports configured booleans", async () => {
    const res = await app.request("/health/integrations");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      stripe: boolean;
      artelo: boolean;
      db: boolean;
      sentry: boolean;
    };
    expect(body.stripe).toBe(true);
    expect(typeof body.artelo).toBe("boolean");
    expect(typeof body.db).toBe("boolean");
    expect(typeof body.sentry).toBe("boolean");
  });
});
