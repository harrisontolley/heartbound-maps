import { getSql } from "./db.js";
import {
  type BlobEntry,
  blobPathnameFromUrl,
  deleteBlobs,
  listFreeBlobs,
  listPosterBlobs,
} from "./blob.js";

// Lifecycle GC for print-asset blobs. Posters (10–60 MB each) accumulate forever
// otherwise: most are abandoned-cart previews that never become an order, and even
// fulfilled artwork shouldn't linger indefinitely (it encodes personal locations).
// This job deletes two classes under posters/:
//
//   • Orphan  — a blob never referenced by any order, older than ORPHAN_TTL.
//   • Expired — a blob referenced only by orders in a terminal state, older than
//               RETENTION_DAYS (kept that long for reprints / chargebacks).
//
// It also GCs the free/ lead-magnet blobs (screen-res designs emailed to leads),
// which have no order/terminal-status concept — just delivered-or-not — so the
// rule is simpler: orphan past the same ORPHAN_TTL, or referenced-but-past
// FREE_ASSET_RETENTION_DAYS (kept shorter than posters/ since these are free
// screen-res files, not paid fulfilled artwork).
//
// Run daily from a Vercel cron (see routes/jobs.ts + vercel.json). Env-guarded and
// non-throwing, like the rest of the integration surface.

/** Order statuses past which artwork is eligible for retention-window purge. */
const TERMINAL_STATUSES = new Set(["shipped", "delivered", "cancelled", "refunded"]);

const DEFAULT_ORPHAN_TTL_HOURS = 48;
const DEFAULT_RETENTION_DAYS = 90;
const DEFAULT_FREE_RETENTION_DAYS = 60;

export type OrderAssetRef = { assetUrl: string; status: string; createdAt: Date };
export type LeadAssetRef = { assetPathname: string; createdAt: Date };

export type OrderAssetRow = {
  asset_url: string | null;
  svg_asset_url: string | null;
  status: string;
  created_at: string | Date;
};

/**
 * Expand an `order_items` row into one `OrderAssetRef` per non-null asset
 * column (PNG `asset_url` and/or vector `svg_asset_url`). Both must count as
 * live references — the digital-delivery SVG is just as "referenced by this
 * order" as the PNG is, and selectBlobsToDelete matches by pathname, so a
 * column missing from this expansion would make that column's blobs look
 * orphaned (or unprotected past retention) even while the order is live.
 */
export function orderAssetRefsFromRows(rows: OrderAssetRow[]): OrderAssetRef[] {
  const refs: OrderAssetRef[] = [];
  for (const r of rows) {
    const createdAt = new Date(r.created_at);
    if (r.asset_url) refs.push({ assetUrl: r.asset_url, status: r.status, createdAt });
    if (r.svg_asset_url) refs.push({ assetUrl: r.svg_asset_url, status: r.status, createdAt });
  }
  return refs;
}

export type GcDecision = { url: string; pathname: string; reason: "orphan" | "expired" };

export type GcOptions = { orphanTtlMs: number; retentionMs: number };

/**
 * Pure selection: decide which blobs to delete given the current blobs, the order
 * refs that point at them, and a clock. Matching is by store pathname (robust to
 * public/private host differences between the stored URL and the listed blob).
 */
export function selectBlobsToDelete(
  blobs: BlobEntry[],
  orders: OrderAssetRef[],
  now: number,
  opts: GcOptions,
): GcDecision[] {
  const refsByPath = new Map<string, OrderAssetRef[]>();
  for (const o of orders) {
    const p = blobPathnameFromUrl(o.assetUrl);
    if (!p) continue;
    const list = refsByPath.get(p) ?? [];
    list.push(o);
    refsByPath.set(p, list);
  }

  const out: GcDecision[] = [];
  for (const b of blobs) {
    const refs = refsByPath.get(b.pathname);
    if (!refs || refs.length === 0) {
      // Orphan — uploaded but never tied to an order (or its order was deleted).
      if (now - b.uploadedAt.getTime() > opts.orphanTtlMs) {
        out.push({ url: b.url, pathname: b.pathname, reason: "orphan" });
      }
      continue;
    }
    // Referenced: keep unless EVERY referencing order is terminal and past retention.
    const allExpired = refs.every(
      (r) => TERMINAL_STATUSES.has(r.status) && now - r.createdAt.getTime() > opts.retentionMs,
    );
    if (allExpired) out.push({ url: b.url, pathname: b.pathname, reason: "expired" });
  }
  return out;
}

/**
 * Pure selection for free/ lead-magnet blobs: orphan past the (shared) orphan
 * TTL, or referenced by a lead older than FREE_ASSET_RETENTION_DAYS. Leads have
 * no terminal-status concept (unlike orders), so a referenced blob is kept only
 * while at least one referencing lead is still inside the retention window.
 * Matching is by `asset_pathname`, which the leads table stores directly (no
 * URL-to-pathname translation needed, unlike orders' `asset_url`).
 */
export function selectFreeBlobsToDelete(
  blobs: BlobEntry[],
  leads: LeadAssetRef[],
  now: number,
  opts: GcOptions,
): GcDecision[] {
  const refsByPath = new Map<string, LeadAssetRef[]>();
  for (const l of leads) {
    if (!l.assetPathname) continue;
    const list = refsByPath.get(l.assetPathname) ?? [];
    list.push(l);
    refsByPath.set(l.assetPathname, list);
  }

  const out: GcDecision[] = [];
  for (const b of blobs) {
    const refs = refsByPath.get(b.pathname);
    if (!refs || refs.length === 0) {
      // Orphan — uploaded but never tied to a lead (or the lead row was deleted).
      if (now - b.uploadedAt.getTime() > opts.orphanTtlMs) {
        out.push({ url: b.url, pathname: b.pathname, reason: "orphan" });
      }
      continue;
    }
    // Referenced: keep while ANY referencing lead is still inside retention.
    const allExpired = refs.every((r) => now - r.createdAt.getTime() > opts.retentionMs);
    if (allExpired) out.push({ url: b.url, pathname: b.pathname, reason: "expired" });
  }
  return out;
}

function gcOptionsFromEnv(): GcOptions & { freeRetentionMs: number } {
  const hours = Number(process.env.BLOB_ORPHAN_TTL_HOURS);
  const days = Number(process.env.BLOB_RETENTION_DAYS);
  const freeDays = Number(process.env.FREE_ASSET_RETENTION_DAYS);
  const orphanHours = Number.isFinite(hours) && hours > 0 ? hours : DEFAULT_ORPHAN_TTL_HOURS;
  const retentionDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_RETENTION_DAYS;
  const freeRetentionDays =
    Number.isFinite(freeDays) && freeDays > 0 ? freeDays : DEFAULT_FREE_RETENTION_DAYS;
  return {
    orphanTtlMs: orphanHours * 3_600_000,
    retentionMs: retentionDays * 86_400_000,
    freeRetentionMs: freeRetentionDays * 86_400_000,
  };
}

export type GcResult =
  | { ran: false; reason: string }
  | {
      ran: true;
      scanned: number;
      deleted: number;
      orphans: number;
      expired: number;
      dryRun: boolean;
    };

/**
 * Run a single GC pass over both posters/ and free/. Lists each prefix,
 * cross-references the orders/leads tables respectively, and deletes the
 * combined orphaned/expired set (unless dryRun). Never throws — returns a
 * structured result for the cron route to report. posters/ selection logic is
 * unchanged; free/ is purely additive.
 */
export async function runBlobGc(input: { dryRun?: boolean } = {}): Promise<GcResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return { ran: false, reason: "blob_unconfigured" };
  const sql = getSql();
  if (!sql) return { ran: false, reason: "db_unconfigured" };

  const opts = gcOptionsFromEnv();
  let posterBlobs: BlobEntry[];
  let freeBlobs: BlobEntry[];
  try {
    [posterBlobs, freeBlobs] = await Promise.all([listPosterBlobs(), listFreeBlobs()]);
  } catch (err) {
    console.error("[blobGc] list failed", err);
    return { ran: false, reason: "list_failed" };
  }

  let orders: OrderAssetRef[];
  let leads: LeadAssetRef[];
  try {
    const [orderRows, leadRows] = await Promise.all([
      sql`
        select oi.asset_url, oi.svg_asset_url, o.status::text as status, o.created_at
        from order_items oi
        join orders o on o.id = oi.order_id
        where oi.asset_url is not null or oi.svg_asset_url is not null
      ` as unknown as Promise<OrderAssetRow[]>,
      sql`
        select asset_pathname, created_at from leads where asset_pathname is not null
      ` as unknown as Promise<Array<{ asset_pathname: string; created_at: string | Date }>>,
    ]);
    orders = orderAssetRefsFromRows(orderRows);
    leads = leadRows.map((r) => ({
      assetPathname: r.asset_pathname,
      createdAt: new Date(r.created_at),
    }));
  } catch (err) {
    console.error("[blobGc] order/lead query failed", err);
    return { ran: false, reason: "db_query_failed" };
  }

  const now = Date.now();
  const posterDecisions = selectBlobsToDelete(posterBlobs, orders, now, opts);
  const freeDecisions = selectFreeBlobsToDelete(freeBlobs, leads, now, {
    orphanTtlMs: opts.orphanTtlMs,
    retentionMs: opts.freeRetentionMs,
  });
  const decisions = [...posterDecisions, ...freeDecisions];
  const orphans = decisions.filter((d) => d.reason === "orphan").length;
  const expired = decisions.length - orphans;
  const dryRun = input.dryRun === true;

  if (!dryRun && decisions.length > 0) {
    try {
      await deleteBlobs(decisions.map((d) => d.url));
    } catch (err) {
      console.error("[blobGc] delete failed", err);
      return { ran: false, reason: "delete_failed" };
    }
  }

  return {
    ran: true,
    scanned: posterBlobs.length + freeBlobs.length,
    deleted: dryRun ? 0 : decisions.length,
    orphans,
    expired,
    dryRun,
  };
}
