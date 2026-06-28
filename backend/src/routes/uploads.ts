import { Hono } from "hono";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { type AuthVariables, getUser } from "../auth.js";
import { clientKey, rateLimit } from "../rateLimit.js";

// Print-asset uploads. The browser rasterizes the poster to a PNG and uploads it
// straight to Vercel Blob via the client-upload flow (so large files never pass
// through this function's request-body limit). This route only mints/validates
// the short-lived client token — it touches Blob via BLOB_READ_WRITE_TOKEN.
//
// Env-guarded like the rest of the integrations: 503 when BLOB_READ_WRITE_TOKEN
// is unset, so the app still builds/runs without blob storage configured.
//
// Auth: intentionally NOT requireUser — add-to-cart (where this is called) is
// guest-friendly, mirroring /checkout. We attach the user non-blockingly to tag
// uploads when signed in. The token minted here is tightly constrained (PNG only,
// size-capped, random suffix) and the pathname is validated against a strict
// allow-list (a single posters/<leaf>.png segment — no traversal, no arbitrary
// keys/types), so an unauthenticated caller can at most drop a bounded PNG under
// posters/. Residual anonymous-abuse risk is noted for follow-up (rate limit / WAF).

const MAX_BYTES = 60 * 1024 * 1024; // generous: a 24×36 print PNG can be tens of MB

// The client-supplied pathname is bound to the minted token, so we can't rewrite
// it — but we reject anything that isn't a single safe leaf under posters/.
const ALLOWED_PATHNAME = /^posters\/[A-Za-z0-9._-]+\.png$/;

export function buildUploadsRouter(): Hono<{ Variables: AuthVariables }> {
  const r = new Hono<{ Variables: AuthVariables }>();
  r.use("*", getUser);

  r.post("/token", async (c) => {
    // Speed-bump anonymous abuse of this unauthenticated mint endpoint.
    if (rateLimit("uploads", clientKey(c), { max: 60, windowMs: 60_000 })) {
      return c.json({ error: "rate_limited" }, 429);
    }
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) return c.json({ error: "blob_unconfigured" }, 503);

    const user = c.get("user");

    const body = (await c.req.json().catch(() => null)) as HandleUploadBody | null;
    if (!body) return c.json({ error: "invalid_payload" }, 400);

    try {
      const json = await handleUpload({
        body,
        request: c.req.raw,
        token,
        onBeforeGenerateToken: async (pathname) => {
          // Never trust the client pathname — reject anything outside posters/
          // or containing path separators / traversal.
          if (!ALLOWED_PATHNAME.test(pathname)) throw new Error("invalid_pathname");
          return {
            allowedContentTypes: ["image/png"],
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
            // Embed the owner (or null for guests) for the audit trail.
            tokenPayload: JSON.stringify({ userId: user?.userId ?? null }),
          };
        },
        // Fires server-to-server after the upload completes. No-op: the browser
        // already has the public URL and forwards it through checkout. (In local
        // dev Vercel can't reach localhost, so this simply won't fire.)
        onUploadCompleted: async () => {},
      });
      return c.json(json);
    } catch (err) {
      console.error("[uploads/token] handleUpload failed", err);
      return c.json({ error: "upload_token_failed" }, 400);
    }
  });

  return r;
}
