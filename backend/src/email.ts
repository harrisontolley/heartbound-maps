// Transactional email via Resend. No SDK — a thin fetch wrapper, scaffolded
// like artelo.ts / db.ts: env-guarded, null when unconfigured so the app
// builds without a key. sendEmail is fire-and-forget-safe: it never throws,
// so a broken/unconfigured mail provider can never fail the caller's flow.
// See docs/integrations/resend.md.

const RESEND_API_URL = "https://api.resend.com/emails";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type SendEmailResult = { id: string } | null;

/** Whether Resend is configured (RESEND_API_KEY + EMAIL_FROM both set). */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY) && Boolean(process.env.EMAIL_FROM);
}

/**
 * Send an email via Resend's REST API. Reads env lazily (not at module load),
 * mirroring the rest of the integrations. Never throws — returns null (after
 * a console.error) when unconfigured, the response is non-2xx, the request
 * throws, or the response JSON has no `id`.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error("resend_not_configured");
    return null;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      console.error("resend_send_failed", res.status);
      return null;
    }

    const body = (await res.json()) as { id?: string };
    if (!body.id) {
      console.error("resend_send_missing_id");
      return null;
    }
    return { id: body.id };
  } catch (err) {
    console.error("resend_send_error", err);
    return null;
  }
}
