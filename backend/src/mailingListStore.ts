import { getSql } from "./db.js";

// Mailing-list persistence (see migrations/0007_mailing_list.sql). Mirrors
// leadStore's env-guarded shape: reads/writes return a sensible empty
// (null/void) rather than throwing when DATABASE_URL is unset, so the route
// can fail closed (503) instead of blowing up.
//
// One row per email — resubmitting the form (e.g. from a different FAQ
// question) merges reasons into the existing row instead of forking a
// duplicate subscriber.

export type NewMailingListSubscriber = {
  email: string;
  reasons: string[];
  otherText: string | null;
  source: string | null;
  consent: boolean;
};

export type UpsertMailingListResult = { id: string; existing: boolean };

type SubscriberIdentityRow = { id: string; reasons: string[] };

/** Insert a new subscriber, or merge reasons into an existing (by email) row. */
export async function upsertMailingListSubscriber(
  input: NewMailingListSubscriber,
): Promise<UpsertMailingListResult | null> {
  const sql = getSql();
  if (!sql) return null;

  const existingRows = (await sql`
    select id, reasons from mailing_list_subscribers
    where lower(email) = lower(${input.email})
    limit 1
  `) as unknown as SubscriberIdentityRow[];

  const existing = existingRows[0];
  if (existing) {
    const mergedReasons = [...new Set([...(existing.reasons ?? []), ...input.reasons])];
    await sql`
      update mailing_list_subscribers set
        reasons = ${JSON.stringify(mergedReasons)}::jsonb,
        other_text = coalesce(${input.otherText}, other_text),
        source = coalesce(${input.source}, source),
        consent = ${input.consent},
        updated_at = now()
      where id = ${existing.id}
    `;
    return { id: existing.id, existing: true };
  }

  const rows = (await sql`
    insert into mailing_list_subscribers (email, reasons, other_text, source, consent)
    values (
      ${input.email}, ${JSON.stringify(input.reasons)}::jsonb, ${input.otherText},
      ${input.source}, ${input.consent}
    )
    returning id
  `) as unknown as { id: string }[];

  return { id: rows[0].id, existing: false };
}

/** Record the outcome of the best-effort confirmation email. Never throws. */
export async function markMailingListConfirmationSent(id: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await sql`
    update mailing_list_subscribers set confirmation_sent_at = now(), updated_at = now()
    where id = ${id}
  `;
}
