"use client";

import { upload } from "@vercel/blob/client";
import { apiUrl } from "@/lib/api";

// Upload a print-ready poster PNG straight to Vercel Blob via the client-upload
// flow. The backend (/uploads/token) only mints the short-lived token, so the
// (potentially tens-of-MB) file never passes through the API function body.
// Returns the canonical blob URL to persist on the order.
//
// Uploaded as a *private* blob: a poster encodes the buyer's meaningful personal
// locations, so it must not be world-readable. The backend mints a short-lived
// signed URL only when handing the design to Artelo (see backend/src/blob.ts).

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Upload a poster PNG; returns its canonical blob URL. Throws on failure. */
export async function uploadPosterPng(blob: Blob, slug: string): Promise<string> {
  const pathname = `posters/${slug}-${uid()}.png`;
  const result = await upload(pathname, blob, {
    access: "private",
    contentType: "image/png",
    handleUploadUrl: apiUrl("/uploads/token"),
  });
  return result.url;
}

/**
 * Upload the free, screen-res lead-magnet PNG under `free/` (see
 * backend/src/routes/leads.ts, which only accepts asset URLs under that
 * prefix). Otherwise identical to {@link uploadPosterPng}.
 */
export async function uploadFreePosterPng(
  blob: Blob,
  slug: string,
): Promise<{ url: string }> {
  const pathname = `free/${slug}-${uid()}.png`;
  const result = await upload(pathname, blob, {
    access: "private",
    contentType: "image/png",
    handleUploadUrl: apiUrl("/uploads/token"),
  });
  return { url: result.url };
}
