"use client";

import { upload } from "@vercel/blob/client";
import { apiUrl } from "@/lib/api";

// Upload a print-ready poster PNG straight to Vercel Blob via the client-upload
// flow. The backend (/uploads/token) only mints the short-lived token, so the
// (potentially tens-of-MB) file never passes through the API function body.
// Returns the public URL to persist on the order and hand to Artelo.

function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Upload a poster PNG; returns its public blob URL. Throws on failure. */
export async function uploadPosterPng(blob: Blob, slug: string): Promise<string> {
  const pathname = `posters/${slug}-${uid()}.png`;
  const result = await upload(pathname, blob, {
    access: "public",
    contentType: "image/png",
    handleUploadUrl: apiUrl("/uploads/token"),
  });
  return result.url;
}
