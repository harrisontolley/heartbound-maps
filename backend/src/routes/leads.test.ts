import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWK } from "jose";
import { app } from "../app.js";
import { __setAuthKeyResolverForTests } from "../auth.js";
import { __resetRateLimits } from "../rateLimit.js";

// The leads route touches four collaborators: the DB (leadStore), Resend
// (email.js), the account profile (accountStore, for the marketing opt-in
// flip), and the auth JWT. There's no DB-mocking precedent in this repo (see
// accountStore/admin route tests, which exercise reads against an unconfigured
// DB rather than a mocked one) — so per the task brief, the DB-touching
// leadStore functions are stubbed here (hashPosterConfig stays real: it's
// pure and already unit-tested in leadStore.test.ts) and the route is
// exercised over real HTTP via `app.request`, mirroring every other route test
// in this repo.

const upsertLead = vi.fn();
const markLeadEmail = vi.fn();
const findLeadByToken = vi.fn();
const markLeadDownloaded = vi.fn();
vi.mock("../leadStore.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../leadStore.js")>();
  return {
    ...actual,
    upsertLead: (...args: unknown[]) => upsertLead(...args),
    markLeadEmail: (...args: unknown[]) => markLeadEmail(...args),
    findLeadByToken: (...args: unknown[]) => findLeadByToken(...args),
    markLeadDownloaded: (...args: unknown[]) => markLeadDownloaded(...args),
  };
});

const getSql = vi.fn();
vi.mock("../db.js", () => ({ getSql: (...args: unknown[]) => getSql(...args) }));

const isResendConfigured = vi.fn();
const sendEmail = vi.fn();
vi.mock("../email.js", () => ({
  isResendConfigured: (...args: unknown[]) => isResendConfigured(...args),
  sendEmail: (...args: unknown[]) => sendEmail(...args),
}));

const getOrCreateProfile = vi.fn();
const updateProfile = vi.fn();
vi.mock("../accountStore.js", () => ({
  getOrCreateProfile: (...args: unknown[]) => getOrCreateProfile(...args),
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

const signAssetUrl = vi.fn();
vi.mock("../blob.js", () => ({ signAssetUrl: (...args: unknown[]) => signAssetUrl(...args) }));

const validConfig = {
  templateId: "vintage-cartography",
  home: { id: "h1", label: "Melbourne" },
};
const validAssetUrl = "https://s.public.blob.vercel-storage.com/free/design-abc123.png";

function leadBody(overrides: Record<string, unknown> = {}) {
  return {
    email: "buyer@example.com",
    posterConfig: validConfig,
    assetUrl: validAssetUrl,
    ...overrides,
  };
}

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

/** Configure the route's env-guard checks to pass (DB + Resend "configured"). */
function configureIntegrations() {
  getSql.mockReturnValue({});
  isResendConfigured.mockReturnValue(true);
}

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

beforeEach(() => {
  __resetRateLimits();
  __setAuthKeyResolverForTests(null);
  vi.clearAllMocks();
});
afterEach(() => {
  __setAuthKeyResolverForTests(null);
});

describe("POST /leads — env guards", () => {
  it("503s when the DB is unconfigured", async () => {
    getSql.mockReturnValue(null);
    isResendConfigured.mockReturnValue(true);
    const res = await post("/leads", leadBody());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "leads_unconfigured" });
    expect(upsertLead).not.toHaveBeenCalled();
  });

  it("503s when Resend is unconfigured", async () => {
    getSql.mockReturnValue({});
    isResendConfigured.mockReturnValue(false);
    const res = await post("/leads", leadBody());
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "leads_unconfigured" });
    expect(upsertLead).not.toHaveBeenCalled();
  });
});

describe("POST /leads — validation", () => {
  beforeEach(configureIntegrations);

  it("rejects a bad email", async () => {
    const res = await post("/leads", leadBody({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_request" });
  });

  it("rejects a non-object posterConfig", async () => {
    const res = await post("/leads", leadBody({ posterConfig: ["a", "b"] }));
    expect(res.status).toBe(400);
  });

  it("rejects an oversized posterConfig", async () => {
    const huge = { templateId: "vintage-cartography", blob: "x".repeat(40_000) };
    const res = await post("/leads", leadBody({ posterConfig: huge }));
    expect(res.status).toBe(400);
  });

  it("rejects an assetUrl on a disallowed host", async () => {
    const res = await post(
      "/leads",
      leadBody({ assetUrl: "https://evil.example.com/free/design.png" }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an assetUrl that isn't under free/ (e.g. the paid posters/ path)", async () => {
    const res = await post(
      "/leads",
      leadBody({ assetUrl: "https://s.public.blob.vercel-storage.com/posters/design.png" }),
    );
    expect(res.status).toBe(400);
  });

  it("never calls upsertLead for any invalid request", async () => {
    await post("/leads", leadBody({ email: "nope" }));
    expect(upsertLead).not.toHaveBeenCalled();
  });
});

describe("POST /leads — rate limiting", () => {
  beforeEach(configureIntegrations);

  it("429s after the 10/min limit", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });
    for (let i = 0; i < 10; i += 1) {
      const res = await post("/leads", leadBody());
      expect(res.status).not.toBe(429);
    }
    const res = await post("/leads", leadBody());
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
  });
});

describe("POST /leads — happy path", () => {
  beforeEach(configureIntegrations);

  it("202s, sends the email with the download link + token, and marks it sent", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-abc123", existing: false });
    sendEmail.mockResolvedValue({ id: "resend-email-1" });

    const res = await post("/leads", leadBody());

    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ status: "sent" });

    expect(upsertLead).toHaveBeenCalledTimes(1);
    const upsertArg = upsertLead.mock.calls[0][0];
    expect(upsertArg.email).toBe("buyer@example.com");
    expect(upsertArg.userId).toBeNull();
    expect(upsertArg.assetPathname).toBe("free/design-abc123.png");
    expect(typeof upsertArg.configHash).toBe("string");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.to).toBe("buyer@example.com");
    expect(emailArg.html).toContain("tok-abc123");
    expect(emailArg.html).toContain("/leads/download/tok-abc123");

    expect(markLeadEmail).toHaveBeenCalledWith("lead-1", {
      status: "sent",
      resendMessageId: "resend-email-1",
    });
  });

  it("derives the poster label from templateId + home", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });

    await post("/leads", leadBody());

    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.html).toContain("Vintage Cartography");
    expect(emailArg.html).toContain("Melbourne");
  });

  it("truncates a long derived label to 100 chars in the email payload", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });

    const longLabel = "Melbourne".repeat(30); // 270 chars
    const combined = `Vintage Cartography — ${longLabel}`;
    const truncated = combined.slice(0, 100);
    const res = await post(
      "/leads",
      leadBody({ posterConfig: { templateId: "vintage-cartography", home: { id: "h1", label: longLabel } } }),
    );

    expect(res.status).toBe(202);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.html).not.toContain(longLabel);
    expect(emailArg.html).toContain(truncated);
  });

  it("falls back to the generic label when the derived text is URL-bearing", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });

    const res = await post(
      "/leads",
      leadBody({
        posterConfig: {
          templateId: "vintage-cartography",
          home: { id: "h1", label: "Visit http://evil.example.com now" },
        },
      }),
    );

    expect(res.status).toBe(202);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.html).not.toContain("evil.example.com");
    expect(emailArg.html).toContain("Your Pinprint design");
  });

  it("falls back to the generic label when the derived text contains a newline", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });

    const res = await post(
      "/leads",
      leadBody({
        posterConfig: {
          templateId: "vintage-cartography",
          home: { id: "h1", label: "line one\nBcc: spam@example.com" },
        },
      }),
    );

    expect(res.status).toBe(202);
    const emailArg = sendEmail.mock.calls[0][0];
    expect(emailArg.html).not.toContain("Bcc: spam@example.com");
    expect(emailArg.html).toContain("Your Pinprint design");
  });

  it("a duplicate (same email + design) updates the existing lead and reuses its token", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-existing", existing: true });
    sendEmail.mockResolvedValue({ id: "email-2" });

    const res = await post("/leads", leadBody());

    expect(res.status).toBe(202);
    expect(sendEmail.mock.calls[0][0].html).toContain("tok-existing");
    expect(markLeadEmail).toHaveBeenCalledWith("lead-1", {
      status: "sent",
      resendMessageId: "email-2",
    });
  });

  it("502s and marks the lead failed when the send fails", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue(null);

    const res = await post("/leads", leadBody());

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "email_send_failed" });
    expect(markLeadEmail).toHaveBeenCalledWith("lead-1", { status: "failed" });
  });

  it("uses the request Origin for the download link when PUBLIC_APP_URL is unset", async () => {
    const original = process.env.PUBLIC_APP_URL;
    delete process.env.PUBLIC_APP_URL;
    try {
      upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-origin", existing: false });
      sendEmail.mockResolvedValue({ id: "email-1" });

      const res = await post("/leads", leadBody(), { origin: "https://app.example.com" });

      expect(res.status).toBe(202);
      const emailArg = sendEmail.mock.calls[0][0];
      expect(emailArg.html).toContain(
        "https://app.example.com/_/backend/leads/download/tok-origin",
      );
    } finally {
      if (original !== undefined) process.env.PUBLIC_APP_URL = original;
    }
  });

  it("is mounted under the /_/backend service prefix too", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });

    const res = await post("/_/backend/leads", leadBody());
    expect(res.status).toBe(202);
  });
});

describe("POST /leads — signed-in requests", () => {
  beforeEach(configureIntegrations);

  it("associates the user id and flips marketing_opt_in when consenting", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });
    getOrCreateProfile.mockResolvedValue({ userId: "user-1" });
    updateProfile.mockResolvedValue({ userId: "user-1", marketingOptIn: true });

    const { resolver, sign } = await makeSigner();
    __setAuthKeyResolverForTests(resolver);
    const token = await sign({ email: "buyer@example.com" }, "user-1");

    const res = await post("/leads", leadBody(), { authorization: `Bearer ${token}` });

    expect(res.status).toBe(202);
    expect(upsertLead.mock.calls[0][0].userId).toBe("user-1");
    expect(getOrCreateProfile).toHaveBeenCalledWith("user-1", "buyer@example.com");
    expect(updateProfile).toHaveBeenCalledWith(
      "user-1",
      { marketingOptIn: true },
      "buyer@example.com",
    );
  });

  it("does not flip marketing_opt_in when consent is false", async () => {
    upsertLead.mockResolvedValue({ id: "lead-1", downloadToken: "tok-1", existing: false });
    sendEmail.mockResolvedValue({ id: "email-1" });

    const { resolver, sign } = await makeSigner();
    __setAuthKeyResolverForTests(resolver);
    const token = await sign({ email: "buyer@example.com" }, "user-1");

    const res = await post("/leads", leadBody({ consent: false }), {
      authorization: `Bearer ${token}`,
    });

    expect(res.status).toBe(202);
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe("GET /leads/download/:token", () => {
  it("404s for an unknown token", async () => {
    findLeadByToken.mockResolvedValue(null);
    const res = await app.request("/leads/download/nope");
    expect(res.status).toBe(404);
  });

  it("404s for a token whose lead has no asset yet", async () => {
    findLeadByToken.mockResolvedValue({ id: "lead-1", assetUrl: null, downloadedAt: null });
    const res = await app.request("/leads/download/tok-1");
    expect(res.status).toBe(404);
  });

  it("302s to a freshly signed URL and marks the lead downloaded", async () => {
    findLeadByToken.mockResolvedValue({
      id: "lead-1",
      assetUrl: "https://s.public.blob.vercel-storage.com/free/design.png",
      downloadedAt: null,
    });
    signAssetUrl.mockResolvedValue("https://signed.example.com/free/design.png?sig=abc");

    const res = await app.request("/leads/download/tok-1", { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://signed.example.com/free/design.png?sig=abc");
    expect(signAssetUrl).toHaveBeenCalledWith(
      "https://s.public.blob.vercel-storage.com/free/design.png",
      { ttlMs: 60 * 60 * 1000 },
    );
    expect(markLeadDownloaded).toHaveBeenCalledWith("lead-1");
  });

  it("still redirects (idempotent) on a second click — the store guards the timestamp", async () => {
    findLeadByToken.mockResolvedValue({
      id: "lead-1",
      assetUrl: "https://s.public.blob.vercel-storage.com/free/design.png",
      downloadedAt: "2026-01-01T00:00:00.000Z",
    });
    signAssetUrl.mockResolvedValue("https://signed.example.com/free/design.png?sig=abc");

    const res = await app.request("/leads/download/tok-1", { redirect: "manual" });

    expect(res.status).toBe(302);
    expect(markLeadDownloaded).toHaveBeenCalledWith("lead-1");
  });
});
