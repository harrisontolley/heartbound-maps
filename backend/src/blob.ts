import { del, issueSignedToken, list, presignUrl } from "@vercel/blob";

// Vercel Blob helpers for the print-asset lifecycle. Env-guarded like the rest of
// the integration clients (db.ts / artelo.ts): every function degrades gracefully
// when BLOB_READ_WRITE_TOKEN is unset, so the app builds and tests stay hermetic
// without a blob store.
//
// Posters are uploaded by the browser as *private* blobs (see frontend
// uploadPosterPng + routes/uploads). Private blobs aren't world-readable, so when
// we hand a design to Artelo we mint a short-lived signed GET URL just for that
// fetch (signAssetUrl). The canonical blob URL is what we persist on the order;
// signing happens at submit time and again for any reprint.

const DEFAULT_SIGNED_TTL_DAYS = 30;

/** TTL for a signed Artelo-fetch URL, in ms. Override with BLOB_SIGNED_URL_TTL_DAYS. */
function signedUrlTtlMs(): number {
  const days = Number(process.env.BLOB_SIGNED_URL_TTL_DAYS);
  const d = Number.isFinite(days) && days > 0 ? days : DEFAULT_SIGNED_TTL_DAYS;
  return d * 24 * 60 * 60 * 1000;
}

/** Store-relative pathname of a blob URL (e.g. "posters/x-uuid.png"), or null. */
export function blobPathnameFromUrl(url: string): string | null {
  try {
    const p = new URL(url).pathname.replace(/^\/+/, "");
    return p.length > 0 ? p : null;
  } catch {
    return null;
  }
}

/**
 * Legacy *public* blobs serve from a "*.public.blob.vercel-storage.com" host and
 * are already fetchable as-is — they predate the private-by-default switch and
 * must keep working for in-flight orders, so we never try to sign them.
 */
function isPublicBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes(".public.");
  } catch {
    return false;
  }
}

/**
 * Turn a stored (private) blob URL into a short-lived signed GET URL that Artelo
 * (or the lead-magnet download redirect, see routes/leads.ts) can fetch.
 * Pass-through when blob is unconfigured, when the URL is unparseable, or when
 * it's a legacy public blob. On a signing error we return the original URL:
 * the caller's fetch of an unsigned private blob then fails and the attempt is
 * logged + retryable (fulfillment.ts), which is the safe, observable failure mode.
 *
 * `opts.ttlMs` overrides the default TTL (30 days, BLOB_SIGNED_URL_TTL_DAYS) for
 * callers that want a much shorter-lived link — e.g. the lead-magnet download
 * redirect mints a 1-hour URL rather than handing out a month-long one.
 */
export async function signAssetUrl(url: string, opts: { ttlMs?: number } = {}): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return url;
  if (isPublicBlobUrl(url)) return url;
  const pathname = blobPathnameFromUrl(url);
  if (!pathname) return url;
  try {
    const validUntil = Date.now() + (opts.ttlMs ?? signedUrlTtlMs());
    const signed = await issueSignedToken({ pathname, operations: ["get"], validUntil, token });
    const { presignedUrl } = await presignUrl(signed, {
      operation: "get",
      pathname,
      access: "private",
      validUntil,
    });
    return presignedUrl;
  } catch (err) {
    console.error("[blob] signAssetUrl failed", err);
    return url;
  }
}

export type BlobEntry = { url: string; pathname: string; uploadedAt: Date };

/** List every blob under `prefix` (paginated). Empty when unconfigured. */
async function listBlobsWithPrefix(prefix: string): Promise<BlobEntry[]> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return [];
  const out: BlobEntry[] = [];
  let cursor: string | undefined;
  do {
    const res = await list({ prefix, cursor, limit: 1000, token });
    for (const b of res.blobs) {
      out.push({ url: b.url, pathname: b.pathname, uploadedAt: b.uploadedAt });
    }
    cursor = res.cursor;
  } while (cursor);
  return out;
}

/** List every poster blob in the store (paginated). Empty when unconfigured. */
export async function listPosterBlobs(): Promise<BlobEntry[]> {
  return listBlobsWithPrefix("posters/");
}

/** List every free-lead-magnet blob in the store (paginated). Empty when unconfigured. */
export async function listFreeBlobs(): Promise<BlobEntry[]> {
  return listBlobsWithPrefix("free/");
}

/** Delete blobs by URL (no-op when unconfigured or empty). Used for both posters/ and free/. */
export async function deleteBlobs(urls: string[]): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || urls.length === 0) return;
  await del(urls, { token });
}
