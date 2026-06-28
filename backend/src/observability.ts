import { getSql } from "./db.js";

// Observability helpers: the raw inbound webhook log (with provider-scoped
// idempotency) and the admin-action audit trail. Every function is env-guarded —
// with DATABASE_URL unset getSql() is null and these no-op, so webhooks and admin
// routes still work (just without persistence) and tests stay hermetic.

export type WebhookProvider = "stripe" | "artelo";

export type RecordWebhookInput = {
  provider: WebhookProvider;
  eventType?: string | null;
  /** Provider event id (Stripe evt_…) or a synthesised dedupe key (Artelo). */
  eventId?: string | null;
  signatureValid?: boolean | null;
  payload?: unknown;
};

export type RecordedWebhook = {
  /** Row id, or null when the DB is unconfigured. */
  id: string | null;
  /** True when this (provider, eventId) was already logged — caller should skip. */
  duplicate: boolean;
};

/**
 * Log an inbound webhook and tell the caller whether to skip it as an already-
 * *processed* duplicate. Dedupe is on (provider, event_id) via the unique index.
 *
 * Crucially, dedupe keys on successful PROCESSING, not mere receipt: if a prior
 * delivery was logged but its handler hadn't finished (status still 'received' or
 * 'error' — e.g. a transient DB/Artelo failure), we return that row with
 * duplicate=false so the provider's retry reprocesses it. Only a row already
 * marked 'processed'/'ignored' is a true duplicate to skip. This avoids the
 * "paid but never fulfilled, event silently lost" trap.
 */
export async function recordWebhookEvent(input: RecordWebhookInput): Promise<RecordedWebhook> {
  const sql = getSql();
  if (!sql) return { id: null, duplicate: false };
  const inserted = (await sql`
    insert into webhook_events (provider, event_type, event_id, signature_valid, payload, processing_status)
    values (
      ${input.provider}, ${input.eventType ?? null}, ${input.eventId ?? null},
      ${input.signatureValid ?? null},
      ${input.payload === undefined ? null : JSON.stringify(input.payload)}::jsonb,
      'received'
    )
    on conflict (provider, event_id) where event_id is not null do nothing
    returning id
  `) as unknown as { id: string }[];
  if (inserted.length > 0) return { id: inserted[0].id, duplicate: false };

  // Conflict: a row already exists for this (provider, event_id). Reprocess it
  // unless a prior attempt already finished successfully.
  const existing = (await sql`
    select id, processing_status from webhook_events
    where provider = ${input.provider} and event_id = ${input.eventId ?? null}
    limit 1
  `) as unknown as { id: string; processing_status: string }[];
  const row = existing[0];
  if (!row) return { id: null, duplicate: true }; // event_id null + concurrent insert; be safe
  const done = row.processing_status === "processed" || row.processing_status === "ignored";
  return { id: row.id, duplicate: done };
}

/** Mark how a logged webhook was processed (links it to the resolved order). */
export async function finalizeWebhookEvent(
  id: string | null,
  result: { status: "processed" | "ignored" | "error"; orderId?: string | null; error?: string | null },
): Promise<void> {
  const sql = getSql();
  if (!sql || !id) return;
  await sql`
    update webhook_events set
      processing_status = ${result.status},
      order_id = coalesce(${result.orderId ?? null}, order_id),
      error = ${result.error ?? null}
    where id = ${id}
  `;
}

export type AdminAction = {
  actorEmail: string;
  action: "refund" | "cancel" | "retry_fulfillment" | "update_address" | "sync" | "note";
  orderId?: string | null;
  detail?: unknown;
};

/** Append an admin-action audit row (who did what to which order). */
export async function recordAdminAction(action: AdminAction): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    insert into admin_actions (actor_email, action, order_id, detail)
    values (
      ${action.actorEmail}, ${action.action}, ${action.orderId ?? null},
      ${action.detail === undefined ? null : JSON.stringify(action.detail)}::jsonb
    )
  `;
}
