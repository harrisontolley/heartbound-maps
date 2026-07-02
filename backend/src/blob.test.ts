import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { blobPathnameFromUrl, signAssetUrl } from "./blob.js";

// The real signing path (issueSignedToken/presignUrl) calls Vercel's API over the
// network, so it's mocked here to exercise the TTL override (used by
// routes/leads.ts to mint a short-lived 1h download link) without a live token.
const issueSignedToken = vi.fn();
const presignUrl = vi.fn();
vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
  list: vi.fn(),
  issueSignedToken: (...args: unknown[]) => issueSignedToken(...args),
  presignUrl: (...args: unknown[]) => presignUrl(...args),
}));

// Hermetic: only the pass-through branches of signAssetUrl are exercised for the
// unconfigured/legacy/unparseable cases (no network). The TTL-override tests mock
// the signing calls directly. The key guarantees are that it never throws and
// degrades to the original URL when it can't/shouldn't sign.

describe("blobPathnameFromUrl", () => {
  it("extracts the store-relative pathname", () => {
    expect(blobPathnameFromUrl("https://x.blob.vercel-storage.com/posters/a-uuid.png")).toBe(
      "posters/a-uuid.png",
    );
  });
  it("returns null for the root or an unparseable URL", () => {
    expect(blobPathnameFromUrl("https://x.blob.vercel-storage.com/")).toBeNull();
    expect(blobPathnameFromUrl("not a url")).toBeNull();
  });
});

describe("signAssetUrl", () => {
  const prev = process.env.BLOB_READ_WRITE_TOKEN;
  beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });
  afterEach(() => {
    if (prev === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = prev;
  });

  it("passes the URL through unchanged when blob is unconfigured", async () => {
    const url = "https://x.blob.vercel-storage.com/posters/a.png";
    expect(await signAssetUrl(url)).toBe(url);
  });

  it("never signs a legacy public blob (even when configured)", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    const url = "https://x.public.blob.vercel-storage.com/posters/a.png";
    expect(await signAssetUrl(url)).toBe(url);
  });

  it("passes through an unparseable URL", async () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    expect(await signAssetUrl("not a url")).toBe("not a url");
  });
});

describe("signAssetUrl — TTL override", () => {
  const prevToken = process.env.BLOB_READ_WRITE_TOKEN;
  const prevTtlDays = process.env.BLOB_SIGNED_URL_TTL_DAYS;

  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test";
    delete process.env.BLOB_SIGNED_URL_TTL_DAYS;
    issueSignedToken.mockReset().mockResolvedValue("signed-token");
    presignUrl.mockReset().mockResolvedValue({ presignedUrl: "https://signed.example.com/x.png" });
  });
  afterEach(() => {
    if (prevToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = prevToken;
    if (prevTtlDays === undefined) delete process.env.BLOB_SIGNED_URL_TTL_DAYS;
    else process.env.BLOB_SIGNED_URL_TTL_DAYS = prevTtlDays;
  });

  it("defaults to the 30-day TTL when no override is given", async () => {
    const before = Date.now();
    const url = await signAssetUrl("https://x.blob.vercel-storage.com/posters/a.png");
    expect(url).toBe("https://signed.example.com/x.png");
    const call = issueSignedToken.mock.calls[0][0] as { validUntil: number };
    expect(call.validUntil).toBeGreaterThanOrEqual(before + 29 * 24 * 60 * 60 * 1000);
    expect(call.validUntil).toBeLessThanOrEqual(before + 31 * 24 * 60 * 60 * 1000);
  });

  it("honors an explicit ttlMs override (a short-lived download link)", async () => {
    const before = Date.now();
    await signAssetUrl("https://x.blob.vercel-storage.com/free/a.png", { ttlMs: 60 * 60 * 1000 });
    const call = issueSignedToken.mock.calls[0][0] as { validUntil: number };
    expect(call.validUntil).toBeGreaterThanOrEqual(before + 55 * 60 * 1000);
    expect(call.validUntil).toBeLessThanOrEqual(before + 65 * 60 * 1000);
  });
});
