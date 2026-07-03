import { Hono } from "hono";
import type { CreateMailingListSignupResponse, MailingListReason } from "@pinprint/shared";
import { MAILING_LIST_REASONS } from "@pinprint/shared";
import { enforce } from "../rateLimit.js";
import { getSql } from "../db.js";
import { isResendConfigured, sendEmail } from "../email.js";
import { mailingListConfirmationEmail } from "../emails/mailingListConfirmation.js";
import { markMailingListConfirmationSent, upsertMailingListSubscriber } from "../mailingListStore.js";

// Mailing-list signup: "we don't have your size (or material, or map style)
// yet? Join the list" — surfaced from the FAQ (see landing/copy.ts). Unlike
// leads.ts, the email confirmation is a nice-to-have, not the product: the
// subscriber row is the thing that matters, so a Resend failure (expected in
// production until a sending domain is verified — see docs/integrations/
// resend.md) never fails the request, it just skips the confirmation email.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_OTHER_TEXT_LENGTH = 500;
const MAX_SOURCE_LENGTH = 100;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type ValidatedSignup = {
  email: string;
  reasons: MailingListReason[];
  otherText: string | null;
  source: string | null;
  consent: boolean;
};

/** Manual validation (no schema library), matching routes/leads.ts's style. */
function validateBody(body: unknown): ValidatedSignup | null {
  if (!isPlainObject(body)) return null;

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email.length < 3 || email.length > 320 || !EMAIL_RE.test(email)) return null;

  let reasons: MailingListReason[] = [];
  if (body.reasons !== undefined) {
    if (!Array.isArray(body.reasons)) return null;
    if (body.reasons.some((r) => typeof r !== "string" || !MAILING_LIST_REASONS.includes(r as MailingListReason))) {
      return null;
    }
    reasons = [...new Set(body.reasons as MailingListReason[])];
  }

  let otherText: string | null = null;
  if (body.otherText !== undefined) {
    if (typeof body.otherText !== "string" || body.otherText.length > MAX_OTHER_TEXT_LENGTH) return null;
    // Only meaningful (and stored) when "other" was actually selected.
    otherText = reasons.includes("other") ? body.otherText.trim() || null : null;
  }

  let source: string | null = null;
  if (body.source !== undefined) {
    if (typeof body.source !== "string" || body.source.length > MAX_SOURCE_LENGTH) return null;
    source = body.source;
  }

  let consent = true;
  if (body.consent !== undefined) {
    if (typeof body.consent !== "boolean") return null;
    consent = body.consent;
  }

  return { email, reasons, otherText, source, consent };
}

export function buildMailingListRouter(): Hono {
  const r = new Hono();

  r.post("/", async (c) => {
    if (await enforce(c, "mailing-list-signup", { max: 5, windowMs: 60_000 })) {
      return c.json({ error: "rate_limited" }, 429);
    }
    if (!getSql()) {
      return c.json({ error: "mailing_list_unconfigured" }, 503);
    }

    const body = await c.req.json().catch(() => null);
    const validated = validateBody(body);
    if (!validated) return c.json({ error: "invalid_request" }, 400);

    const subscriber = await upsertMailingListSubscriber({
      email: validated.email,
      reasons: validated.reasons,
      otherText: validated.otherText,
      source: validated.source,
      consent: validated.consent,
    });
    // getSql() was already checked above; a null here means the DB dropped out
    // between that check and now — fail the same way.
    if (!subscriber) return c.json({ error: "mailing_list_unconfigured" }, 503);

    // Best-effort confirmation — never fails the request. Resend has no
    // verified sending domain yet, so this silently no-ops in production
    // until that's set up (the subscriber is already saved either way).
    if (isResendConfigured()) {
      const email = mailingListConfirmationEmail();
      const result = await sendEmail({ to: validated.email, ...email });
      if (result) await markMailingListConfirmationSent(subscriber.id);
    }

    const res: CreateMailingListSignupResponse = { status: "subscribed" };
    return c.json(res, 202);
  });

  return r;
}
