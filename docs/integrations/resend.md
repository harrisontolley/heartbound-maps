# Resend

Transactional email: today, the only sender is the free lead-magnet delivery
(a screen-res poster design emailed to a captured address). No SDK — plain
`fetch` against `https://api.resend.com/emails`, Bearer auth.

## Env vars

| Var | Where | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | backend | From the Resend dashboard → API Keys. Sent as `Authorization: Bearer …`. |
| `EMAIL_FROM` | backend | The `from` address, e.g. `Pinprint <hello@example.com>`. Must be `onboarding@resend.dev` (or any address on a verified domain) — see gotchas. |

Both must be set for `isResendConfigured()` to return true; either missing and
`sendEmail` is a no-op (see below).

## Where the code lives

- `backend/src/email.ts` — env-guarded (`isResendConfigured()`, mirroring
  `getSql()`/`getArteloConfig()`), `sendEmail()`: POSTs `{ from, to: [to], subject,
  html, text }` to Resend and returns `{ id }` on success. **Never throws** — returns
  `null` (after a `console.error`) when unconfigured, the response is non-2xx, the
  request throws, or the response JSON has no `id`. Env is read lazily at call time,
  not at module load.
- `backend/src/emails/leadMagnet.ts` — `leadMagnetEmail({ downloadUrl, posterLabel })`:
  a pure function (no I/O) returning `{ subject, html, text }`. HTML is table-based
  with inline styles only (no `<style>` blocks, no react-email dependency) for
  email-client safety.
- `backend/src/app.ts` → `registerRoutes()` — the `resend` field of
  `GET /health/integrations`.

`POST /leads` (`backend/src/routes/leads.ts`) stores the lead (`backend/src/
leadStore.ts`) and sends the download email via
`sendEmail(leadMagnetEmail(...))`. `GET /leads/download/:token` looks the
lead up by its download token and redirects (302) to a freshly signed URL for
the asset, valid for 1 hour.

## Sandbox / test setup

Resend gives every account (verified or not) a free `onboarding@resend.dev`
sender. **Unverified accounts can send from `onboarding@resend.dev`, but only
TO the account owner's own email address** — sending to anyone else 403s until
a domain is verified. That's enough to test the full flow locally: set
`EMAIL_FROM=onboarding@resend.dev` and send to the email on your Resend account.

## Production gotcha

Production sending requires a **verified sending domain** with SPF and DKIM
DNS records added at your registrar (Resend dashboard → Domains → Add Domain).
**No production domain has been purchased for this project yet** (see the
pre-launch TODO in `CLAUDE.md`), so real (non-owner) recipients are blocked
until one exists and is verified. Once it is, set `EMAIL_FROM` to an address on
that domain (e.g. `Pinprint <hello@yourdomain.com>`).

## Verify

```bash
curl -s localhost:8787/health/integrations   # { "resend": true|false, ... }
```

With `RESEND_API_KEY` and `EMAIL_FROM=onboarding@resend.dev` set, and sending
to your own Resend account email:

```bash
curl -s -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"onboarding@resend.dev","to":["you@example.com"],"subject":"test","html":"<p>hi</p>","text":"hi"}'
```
