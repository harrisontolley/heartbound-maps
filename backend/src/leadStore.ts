import { createHash, randomUUID } from "node:crypto";
import { getSql } from "./db.js";

// Lead-magnet persistence (see migrations/0004_leads.sql). Mirrors accountStore's
// env-guarded shape: reads/writes return a sensible empty (null/void) rather than
// throwing when DATABASE_URL is unset, so the leads route can fail closed (503)
// instead of blowing up.
//
// One row per (email, design) pair. `config_hash` is a stable hash of the
// design-identity subset of the poster config (hashPosterConfig, below), so
// re-requesting the exact same design just refreshes the existing row (new
// asset, same download_token) instead of forking a duplicate lead + email.

export type NewLead = {
  email: string;
  userId: string | null;
  posterConfig: Record<string, unknown>;
  configHash: string;
  assetUrl: string;
  assetPathname: string;
  source: string | null;
  utm: Record<string, string> | null;
  consent: boolean;
};

export type UpsertLeadResult = { id: string; downloadToken: string; existing: boolean };

type LeadIdentityRow = { id: string; download_token: string };

/** Insert a new lead, or refresh the asset on an existing (email, design) row. */
export async function upsertLead(input: NewLead): Promise<UpsertLeadResult | null> {
  const sql = getSql();
  if (!sql) return null;

  const existingRows = (await sql`
    select id, download_token from leads
    where lower(email) = lower(${input.email}) and config_hash = ${input.configHash}
    limit 1
  `) as unknown as LeadIdentityRow[];

  const existing = existingRows[0];
  if (existing) {
    await sql`
      update leads set
        asset_url = ${input.assetUrl},
        asset_pathname = ${input.assetPathname},
        user_id = coalesce(${input.userId}, user_id),
        consent = ${input.consent},
        updated_at = now()
      where id = ${existing.id}
    `;
    return { id: existing.id, downloadToken: existing.download_token, existing: true };
  }

  const downloadToken = randomUUID();
  const rows = (await sql`
    insert into leads (
      email, user_id, poster_config, config_hash, asset_url, asset_pathname,
      download_token, source, utm, consent
    ) values (
      ${input.email}, ${input.userId}, ${JSON.stringify(input.posterConfig)}::jsonb, ${input.configHash},
      ${input.assetUrl}, ${input.assetPathname}, ${downloadToken}, ${input.source},
      ${input.utm ? JSON.stringify(input.utm) : null}::jsonb, ${input.consent}
    )
    returning id
  `) as unknown as { id: string }[];

  return { id: rows[0].id, downloadToken, existing: false };
}

/** Record the outcome of the delivery email. Sets email_sent_at only on success. */
export async function markLeadEmail(
  id: string,
  r: { status: "sent" | "failed"; resendMessageId?: string },
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  if (r.status === "sent") {
    await sql`
      update leads set
        status = 'sent',
        resend_message_id = ${r.resendMessageId ?? null},
        email_sent_at = now(),
        updated_at = now()
      where id = ${id}
    `;
  } else {
    await sql`
      update leads set status = 'failed', updated_at = now()
      where id = ${id}
    `;
  }
}

export type LeadByToken = { id: string; assetUrl: string | null; downloadedAt: string | null };

/** Look up a lead by its download token (anti-enumeration: caller 404s on null). */
export async function findLeadByToken(token: string): Promise<LeadByToken | null> {
  const sql = getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, asset_url, downloaded_at from leads where download_token = ${token} limit 1
  `) as unknown as { id: string; asset_url: string | null; downloaded_at: string | Date | null }[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    assetUrl: row.asset_url,
    downloadedAt: row.downloaded_at ? new Date(row.downloaded_at).toISOString() : null,
  };
}

/** Stamp the first-download timestamp. A no-op (guarded in SQL) on repeat clicks. */
export async function markLeadDownloaded(id: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    update leads set downloaded_at = now(), updated_at = now()
    where id = ${id} and downloaded_at is null
  `;
}

// ── hashPosterConfig ─────────────────────────────────────────────────────────

/**
 * The subset of a poster config that defines the *design* — everything else
 * (productId, format, addFrame, units, bearingMode, ...) is checkout/print
 * metadata that doesn't change the artwork, so it's deliberately excluded from
 * the dedupe key.
 */
const IDENTITY_KEYS = ["templateId", "vintageVariant", "home", "places", "customization"] as const;

/** Recursively sort object keys so key order never changes the JSON output. */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      sorted[key] = canonicalize(obj[key]);
    }
    return sorted;
  }
  return value;
}

/** Stable sha256 hex digest of the design-identity subset of a poster config. */
export function hashPosterConfig(config: Record<string, unknown>): string {
  const subset: Record<string, unknown> = {};
  for (const key of IDENTITY_KEYS) {
    if (key in config) subset[key] = config[key];
  }
  const canonical = JSON.stringify(canonicalize(subset));
  return createHash("sha256").update(canonical).digest("hex");
}
