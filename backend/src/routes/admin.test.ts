import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK } from "jose";
import { app } from "../app.js";
import { __setAuthKeyResolverForTests, adminEmails, isAdminUser } from "../auth.js";

// Hermetic: no Neon Auth keys, no DB. A locally-generated EdDSA keypair is
// injected as the JWKS resolver and ADMIN_EMAILS is set in-process, so the admin
// gate is exercised end-to-end without any network or database. With DATABASE_URL
// unset the admin reads return empty payloads.

const KID = "test-key";

async function makeSigner() {
  const { publicKey, privateKey } = await generateKeyPair("EdDSA");
  const jwk: JWK = { ...(await exportJWK(publicKey)), alg: "EdDSA", kid: KID };
  const resolver = createLocalJWKSet({ keys: [jwk] });
  const sign = (claims: Record<string, unknown>, sub: string) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "EdDSA", kid: KID })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(privateKey);
  return { resolver, sign };
}

const ORIG_ADMINS = process.env.ADMIN_EMAILS;

beforeEach(() => {
  __setAuthKeyResolverForTests(null);
  process.env.ADMIN_EMAILS = "boss@example.com, ops@example.com";
});
afterEach(() => {
  __setAuthKeyResolverForTests(null);
  if (ORIG_ADMINS === undefined) delete process.env.ADMIN_EMAILS;
  else process.env.ADMIN_EMAILS = ORIG_ADMINS;
});

describe("admin allowlist parsing", () => {
  it("parses comma/space separated, lower-cased", () => {
    process.env.ADMIN_EMAILS = "A@x.com, B@Y.com";
    expect(adminEmails()).toEqual(new Set(["a@x.com", "b@y.com"]));
  });
  it("isAdminUser is case-insensitive and rejects non-members", () => {
    expect(isAdminUser({ userId: "1", email: "Boss@Example.com" })).toBe(true);
    expect(isAdminUser({ userId: "2", email: "rando@example.com" })).toBe(false);
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser({ userId: "3" })).toBe(false);
  });
});

describe("admin routes — gating", () => {
  for (const base of ["", "/_/backend"]) {
    it(`401 when auth unconfigured (${base || "/"})`, async () => {
      __setAuthKeyResolverForTests(null);
      const res = await app.request(`${base}/admin/orders`);
      expect(res.status).toBe(401);
    });
  }

  it("403 for a valid non-admin session", async () => {
    const { resolver, sign } = await makeSigner();
    __setAuthKeyResolverForTests(resolver);
    const token = await sign({ email: "rando@example.com" }, "user-1");
    const res = await app.request("/admin/orders", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden" });
  });

  it("200 for an allowlisted admin (empty without DB)", async () => {
    const { resolver, sign } = await makeSigner();
    __setAuthKeyResolverForTests(resolver);
    const token = await sign({ email: "ops@example.com" }, "user-2");
    const res = await app.request("/admin/orders", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ orders: [], total: 0 });
  });

  it("metrics returns a zeroed payload without DB", async () => {
    const { resolver, sign } = await makeSigner();
    __setAuthKeyResolverForTests(resolver);
    const token = await sign({ email: "ops@example.com" }, "user-2");
    const res = await app.request("/admin/metrics", {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { grossRevenueCents: number; marginCents: number };
    expect(body.grossRevenueCents).toBe(0);
    expect(body.marginCents).toBe(0);
  });

  it("mutations are gated too — refund 403 for non-admin", async () => {
    const { resolver, sign } = await makeSigner();
    __setAuthKeyResolverForTests(resolver);
    const token = await sign({ email: "rando@example.com" }, "user-1");
    const res = await app.request("/admin/orders/abc/refund", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(403);
  });
});
