import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  getArteloConfig,
  isArteloConfigured,
  verifyArteloWebhookSignature,
} from "./artelo.js";

// Env-guard + signature unit tests. Hermetic: we toggle process.env directly and
// never hit the network.

afterEach(() => {
  delete process.env.ARTELO_API_KEY;
  delete process.env.ARTELO_API_BASE;
  delete process.env.ARTELO_TEST_ORDERS;
  delete process.env.ARTELO_WEBHOOK_SECRET;
});

describe("artelo config", () => {
  it("is unconfigured (null / false) without an API key", () => {
    expect(getArteloConfig()).toBeNull();
    expect(isArteloConfigured()).toBe(false);
  });

  it("reads the key + defaults base, and defaults to test orders", () => {
    process.env.ARTELO_API_KEY = "k_test";
    const cfg = getArteloConfig();
    expect(cfg).not.toBeNull();
    expect(cfg?.apiKey).toBe("k_test");
    expect(cfg?.baseUrl).toBe("https://www.artelo.io/api/open");
    expect(cfg?.testOrders).toBe(true);
    expect(isArteloConfigured()).toBe(true);
  });

  it("only leaves test mode when ARTELO_TEST_ORDERS is exactly 'false'", () => {
    process.env.ARTELO_API_KEY = "k_test";
    process.env.ARTELO_TEST_ORDERS = "false";
    expect(getArteloConfig()?.testOrders).toBe(false);
    process.env.ARTELO_TEST_ORDERS = "0";
    expect(getArteloConfig()?.testOrders).toBe(true);
  });
});

describe("verifyArteloWebhookSignature", () => {
  const body = JSON.stringify({ id: "ord_1", status: "Shipped" });
  const canonical = JSON.stringify(JSON.parse(body));

  it("accepts when no secret is configured (unconfigured path)", () => {
    expect(verifyArteloWebhookSignature(body, undefined)).toBe(true);
  });

  it("verifies a correct HMAC against the configured secret", () => {
    process.env.ARTELO_WEBHOOK_SECRET = "s3cr3t";
    const sig = createHmac("sha256", "s3cr3t").update(canonical).digest("hex");
    expect(verifyArteloWebhookSignature(body, sig)).toBe(true);
  });

  it("rejects a bad/missing signature when a secret is configured", () => {
    process.env.ARTELO_WEBHOOK_SECRET = "s3cr3t";
    expect(verifyArteloWebhookSignature(body, "deadbeef")).toBe(false);
    expect(verifyArteloWebhookSignature(body, undefined)).toBe(false);
  });
});
