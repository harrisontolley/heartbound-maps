// Shared allow-list for print-asset URLs handed to third parties: Artelo (order
// fulfilment, see checkout.ts) and the lead-magnet download email (see
// routes/leads.ts). The browser uploads posters straight to Vercel Blob (see
// routes/uploads.ts), which returns a "*.blob.vercel-storage.com" URL — we only
// ever accept URLs on that host, otherwise a crafted request could make us
// submit/serve an arbitrary remote URL (SSRF/abuse). Override the allowed host
// suffixes with BLOB_ALLOWED_HOSTS (comma-separated).

function allowedAssetHosts(): string[] {
  const raw = process.env.BLOB_ALLOWED_HOSTS;
  if (raw) return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return ["blob.vercel-storage.com"];
}

/** True when an asset URL is an https URL on an allowed blob host. */
export function isAllowedAssetUrl(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  return allowedAssetHosts().some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
