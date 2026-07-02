import { Hono } from "hono";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { type AuthVariables, getUser } from "../auth.js";
import { enforce } from "../rateLimit.js";

// Print-asset uploads. The browser rasterizes the poster to a PNG and uploads it
// straight to Vercel Blob via the client-upload flow (so large files never pass
// through this function's request-body limit). This route only mints/validates
// the short-lived client token — it touches Blob via BLOB_READ_WRITE_TOKEN.
//
// The client uploads with access:'private' (a poster encodes personal locations),
// so the blob is not world-readable. The access level rides on the client's
// upload() call, not the minted token, so nothing changes here for that — we hand
// Artelo a short-lived signed URL at submit time (see backend/src/blob.ts).
//
// Env-guarded like the rest of the integrations: 503 when BLOB_READ_WRITE_TOKEN
// is unset, so the app still builds/runs without blob storage configured.
//
// Auth: intentionally NOT requireUser — add-to-cart (where this is called) is
// guest-friendly, mirroring /checkout. We attach the user non-blockingly to tag
// uploads when signed in. The token minted here is tightly constrained (PNG only,
// size-capped, random suffix) and the pathname is validated against a strict
// per-prefix allow-list (a single safe leaf under posters/ or free/ — no
// traversal, no arbitrary keys/types), so an unauthenticated caller can at most
// drop a bounded PNG under one of those prefixes. Residual anonymous-abuse risk
// is noted for follow-up (rate limit / WAF).
//
// Three prefixes/rules, three caps:
//   posters/*.png — the paid, full-resolution print asset (up to tens of MB).
//   posters/*.svg — the vector counterpart (Phase B digital delivery), much
//                   smaller since it's markup/paths, not raster pixels.
//   free/*.png    — the lead-magnet's screen-res design (routes/leads.ts),
//                   capped much smaller since it's never sent to print.
const POSTERS_MAX_BYTES = 60 * 1024 * 1024; // generous: a 24×36 print PNG can be tens of MB
const POSTERS_SVG_MAX_BYTES = 10 * 1024 * 1024;
const FREE_MAX_BYTES = 15 * 1024 * 1024;

// The client-supplied pathname is bound to the minted token, so we can't rewrite
// it — but we reject anything that isn't a single safe leaf under one of the
// known prefixes. `contentType` scopes the signed token so Blob itself rejects
// a mismatched upload (e.g. an svg-content-type PUT against a .png pathname).
const PATHNAME_RULES: { pattern: RegExp; maxBytes: number; contentType: string }[] = [
  { pattern: /^posters\/[A-Za-z0-9._-]+\.png$/, maxBytes: POSTERS_MAX_BYTES, contentType: "image/png" },
  { pattern: /^posters\/[A-Za-z0-9._-]+\.svg$/, maxBytes: POSTERS_SVG_MAX_BYTES, contentType: "image/svg+xml" },
  { pattern: /^free\/[A-Za-z0-9._-]+\.png$/, maxBytes: FREE_MAX_BYTES, contentType: "image/png" },
];

function matchPathnameRule(
  pathname: string,
): { maxBytes: number; contentType: string } | null {
  return PATHNAME_RULES.find((rule) => rule.pattern.test(pathname)) ?? null;
}

export function buildUploadsRouter(): Hono<{ Variables: AuthVariables }> {
  const r = new Hono<{ Variables: AuthVariables }>();
  r.use("*", getUser);

  r.post("/token", async (c) => {
    // Speed-bump anonymous abuse of this unauthenticated mint endpoint.
    if (await enforce(c, "uploads", { max: 60, windowMs: 60_000 })) {
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
          // Never trust the client pathname — reject anything outside the known
          // prefixes or containing path separators / traversal.
          const rule = matchPathnameRule(pathname);
          if (!rule) throw new Error("invalid_pathname");
          return {
            allowedContentTypes: [rule.contentType],
            maximumSizeInBytes: rule.maxBytes,
            addRandomSuffix: true,
            // Embed the owner (or null for guests) for the audit trail.
            tokenPayload: JSON.stringify({ userId: user?.userId ?? null }),
          };
        },
        // Fires server-to-server after the upload completes. No-op: the browser
        // already has the blob URL and forwards it through checkout. (In local
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
