// Pure email template — see leadMagnet.ts for the conventions (table-based
// HTML, inline styles only, no dependency, trivially unit-testable).

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Confirmation for a mailing-list signup ("we don't have your size yet?").
 * Best-effort only — the subscriber row is already saved before this is sent
 * (see routes/mailingList.ts), so a delivery failure here never loses the
 * signup, just the confirmation.
 */
export function mailingListConfirmationEmail(): EmailContent {
  const subject = "You're on the list";

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0; padding:0; background-color:#f4f1ec; font-family:Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f1ec; padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 24px 40px; text-align:center; color:#1a1a1a;">
                <h1 style="margin:0 0 16px 0; font-size:22px; font-weight:normal; color:#1a1a1a;">You're on the list</h1>
                <p style="margin:0; font-size:16px; line-height:1.6; color:#3a3a3a;">
                  Thanks for letting us know what you're after. We're always adding new sizes, materials, and
                  styles — you'll be the first to hear when something you asked for ships.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "You're on the list",
    "",
    "Thanks for letting us know what you're after. We're always adding new sizes, materials, and styles —",
    "you'll be the first to hear when something you asked for ships.",
  ].join("\n");

  return { subject, html, text };
}
