import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPayloadFromClientToken } from "@vercel/blob/client";
import { app } from "../app.js";

// The mint-token endpoint never sees the actual file — @vercel/blob's
// "blob.generate-client-token" event calls our onBeforeGenerateToken directly and
// signs a client token locally (HMAC, no network), so we can exercise the real
// pathname/size-cap rules end-to-end with a syntactically-valid but fake
// BLOB_READ_WRITE_TOKEN ("vercel_blob_rw_<storeId>_<secret>" — parsed, never
// sent anywhere). The actual byte-size enforcement happens client-side/at Vercel
// when the file is later PUT using this token; here we assert the cap embedded
// in the signed token differs per prefix.

const FAKE_TOKEN = "vercel_blob_rw_teststore_secret";

function tokenBody(pathname: string) {
  return {
    type: "blob.generate-client-token",
    payload: { pathname, multipart: false, clientPayload: null },
  };
}

describe("POST /uploads/token", () => {
  const prevToken = process.env.BLOB_READ_WRITE_TOKEN;
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = FAKE_TOKEN;
  });
  afterEach(() => {
    if (prevToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
    else process.env.BLOB_READ_WRITE_TOKEN = prevToken;
  });

  it("503s when blob storage is unconfigured", async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const res = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("posters/x.png")),
    });
    expect(res.status).toBe(503);
  });

  it("mints a token for posters/<leaf>.png with the 60MB cap", async () => {
    const res = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("posters/design.png")),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { clientToken: string };
    const payload = getPayloadFromClientToken(body.clientToken) as {
      pathname: string;
      maximumSizeInBytes: number;
      allowedContentTypes: string[];
    };
    expect(payload.pathname).toBe("posters/design.png");
    expect(payload.maximumSizeInBytes).toBe(60 * 1024 * 1024);
    expect(payload.allowedContentTypes).toEqual(["image/png"]);
  });

  it("mints a token for posters/<leaf>.svg with the 10MB cap and image/svg+xml", async () => {
    const res = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("posters/design.svg")),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { clientToken: string };
    const payload = getPayloadFromClientToken(body.clientToken) as {
      pathname: string;
      maximumSizeInBytes: number;
      allowedContentTypes: string[];
    };
    expect(payload.pathname).toBe("posters/design.svg");
    expect(payload.maximumSizeInBytes).toBe(10 * 1024 * 1024);
    expect(payload.allowedContentTypes).toEqual(["image/svg+xml"]);
  });

  it("scopes allowedContentTypes per extension so a mismatched content type is rejected at upload time", async () => {
    const pngRes = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("posters/design.png")),
    });
    const svgRes = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("posters/design.svg")),
    });
    const pngPayload = getPayloadFromClientToken(
      ((await pngRes.json()) as { clientToken: string }).clientToken,
    ) as { allowedContentTypes: string[] };
    const svgPayload = getPayloadFromClientToken(
      ((await svgRes.json()) as { clientToken: string }).clientToken,
    ) as { allowedContentTypes: string[] };
    // The .png token never allows image/svg+xml (so an svg-content-type PUT
    // against it is rejected by Blob), and vice versa.
    expect(pngPayload.allowedContentTypes).not.toContain("image/svg+xml");
    expect(svgPayload.allowedContentTypes).not.toContain("image/png");
  });

  it("mints a token for free/<leaf>.png with the new 15MB cap", async () => {
    const res = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("free/lead-design.png")),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { clientToken: string };
    const payload = getPayloadFromClientToken(body.clientToken) as {
      pathname: string;
      maximumSizeInBytes: number;
    };
    expect(payload.pathname).toBe("free/lead-design.png");
    expect(payload.maximumSizeInBytes).toBe(15 * 1024 * 1024);
  });

  it("rejects a pathname outside posters/ and free/", async () => {
    const res = await app.request("/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("other/design.png")),
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "upload_token_failed" });
  });

  it("rejects traversal / non-png / nested paths under free/", async () => {
    for (const pathname of ["free/../../etc/passwd", "free/x.jpg", "free/a/b.png"]) {
      const res = await app.request("/uploads/token", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(tokenBody(pathname)),
      });
      expect(res.status).toBe(400);
    }
  });

  it("is mounted under the /_/backend service prefix too", async () => {
    const res = await app.request("/_/backend/uploads/token", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tokenBody("free/design.png")),
    });
    expect(res.status).toBe(200);
  });
});
