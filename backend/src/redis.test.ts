import { afterEach, describe, expect, it } from "vitest";
import { getRedis, isRedisConfigured, keyPrefix, rk } from "./redis.js";

// Env-guard + key-namespacing unit tests. Hermetic: we toggle process.env directly
// and never hit the network.

afterEach(() => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  delete process.env.VERCEL_ENV;
});

describe("redis config", () => {
  // NOTE: getRedis() caches its client in a module singleton (like db.ts). Assert
  // the unconfigured path FIRST, before any configured getRedis() call builds and
  // caches a client that would survive env deletion.
  it("is unconfigured (null / false) without both env vars", () => {
    expect(getRedis()).toBeNull();
    expect(isRedisConfigured()).toBe(false);

    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    expect(getRedis()).toBeNull(); // url alone is not enough
    expect(isRedisConfigured()).toBe(false);
  });

  it("reports configured when both env vars are set", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "tok_test";
    expect(isRedisConfigured()).toBe(true);
  });
});

describe("key namespacing", () => {
  it("defaults to the dev namespace off Vercel", () => {
    expect(keyPrefix()).toBe("heartbound:dev");
    expect(rk("rl", "checkout", "1.2.3.4")).toBe("heartbound:dev:rl:checkout:1.2.3.4");
  });

  it("maps VERCEL_ENV to prod / preview", () => {
    process.env.VERCEL_ENV = "production";
    expect(keyPrefix()).toBe("heartbound:prod");
    expect(rk("geo", "s", "paris")).toBe("heartbound:prod:geo:s:paris");

    process.env.VERCEL_ENV = "preview";
    expect(keyPrefix()).toBe("heartbound:preview");
  });
});
