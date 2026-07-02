import { Hono } from "hono";
import type { CreateLeadResponse } from "@pinprint/shared";
import { type AuthVariables, getUser } from "../auth.js";
import { enforce } from "../rateLimit.js";
import { getSql } from "../db.js";
import { isResendConfigured, sendEmail } from "../email.js";
import { leadMagnetEmail } from "../emails/leadMagnet.js";
import { isAllowedAssetUrl } from "../assetUrl.js";
import { signAssetUrl } from "../blob.js";
import {
  findLeadByToken,
  hashPosterConfig,
  markLeadDownloaded,
  markLeadEmail,
  upsertLead,
} from "../leadStore.js";
import { getOrCreateProfile, updateProfile } from "../accountStore.js";

// Lead magnet: a free screen-res poster design, emailed in exchange for an email
// address, ahead of the paid fine-art print (see docs/lead-magnet-strategy.md).
// Guest-friendly (getUser is non-blocking, mirroring uploads/checkout) — a
// signed-in visitor additionally gets the lead tagged with their user id and
// their marketing_opt_in flipped on if they consent.
//
// Env-guarded like the rest of the integration surface: 503 when either the DB
// or Resend is unconfigured, so the app still builds/runs without both wired up.

// Duplicated from app.ts's SERVICE_PREFIX (rather than imported) to avoid a
// circular import — app.ts is what registers this router.
const BACKEND_SERVICE_PREFIX = "/_/backend";
const ONE_HOUR_MS = 60 * 60 * 1000;
const MAX_POSTER_CONFIG_BYTES = 32_768;
const MAX_UTM_KEYS = 8;
const MAX_UTM_VALUE_LENGTH = 200;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Absolute base for links that hit this backend (not the frontend). */
function backendBaseUrl(): string {
  const publicAppUrl = process.env.PUBLIC_APP_URL;
  if (publicAppUrl) return `${publicAppUrl.replace(/\/$/, "")}${BACKEND_SERVICE_PREFIX}`;
  return "http://localhost:8787";
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** "vintage-cartography" -> "Vintage Cartography". Best-effort, no frontend dep. */
function humanizeTemplateId(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Template label + home place label (if present), else a generic fallback. */
function derivePosterLabel(config: Record<string, unknown>): string {
  const templateId = typeof config.templateId === "string" ? config.templateId : "";
  const templateLabel = templateId ? humanizeTemplateId(templateId) : "";
  const home = config.home;
  const homeLabel =
    isPlainObject(home) && typeof home.label === "string" ? home.label : "";
  if (templateLabel && homeLabel) return `${templateLabel} — ${homeLabel}`;
  if (templateLabel) return templateLabel;
  if (homeLabel) return homeLabel;
  return "Your Pinprint design";
}

type ValidatedLeadRequest = {
  email: string;
  posterConfig: Record<string, unknown>;
  assetUrl: string;
  assetPathname: string;
  source: string | null;
  utm: Record<string, string> | null;
  consent: boolean;
};

/** Flat string->string object, <= MAX_UTM_KEYS keys, each value <= MAX_UTM_VALUE_LENGTH. */
function validateUtm(v: unknown): Record<string, string> | undefined {
  if (!isPlainObject(v)) return undefined;
  const entries = Object.entries(v);
  if (entries.length > MAX_UTM_KEYS) return undefined;
  const out: Record<string, string> = {};
  for (const [key, val] of entries) {
    if (typeof val !== "string" || val.length > MAX_UTM_VALUE_LENGTH) return undefined;
    out[key] = val;
  }
  return out;
}

/** Manual validation (no schema library), priceCheckout-style. Null on any failure. */
function validateBody(body: unknown): ValidatedLeadRequest | null {
  if (!isPlainObject(body)) return null;

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email.length < 3 || email.length > 320 || !EMAIL_RE.test(email)) return null;

  if (!isPlainObject(body.posterConfig)) return null;
  const posterConfig = body.posterConfig;
  if (JSON.stringify(posterConfig).length > MAX_POSTER_CONFIG_BYTES) return null;

  const assetUrlRaw = body.assetUrl;
  if (typeof assetUrlRaw !== "string" || !isAllowedAssetUrl(assetUrlRaw)) return null;
  let assetPathname: string;
  try {
    const pathname = new URL(assetUrlRaw).pathname;
    // The free lead-magnet asset must live under free/ (see routes/uploads.ts) —
    // never accept a posters/ (paid, full-res) URL here.
    if (!pathname.startsWith("/free/")) return null;
    assetPathname = pathname.replace(/^\/+/, "");
  } catch {
    return null;
  }

  let source: string | null = null;
  if (body.source !== undefined) {
    if (typeof body.source !== "string" || body.source.length > 100) return null;
    source = body.source;
  }

  let utm: Record<string, string> | null = null;
  if (body.utm !== undefined) {
    const validated = validateUtm(body.utm);
    if (!validated) return null;
    utm = validated;
  }

  let consent = true;
  if (body.consent !== undefined) {
    if (typeof body.consent !== "boolean") return null;
    consent = body.consent;
  }

  return { email, posterConfig, assetUrl: assetUrlRaw, assetPathname, source, utm, consent };
}

export function buildLeadsRouter(): Hono<{ Variables: AuthVariables }> {
  const r = new Hono<{ Variables: AuthVariables }>();
  r.use("*", getUser);

  r.post("/", async (c) => {
    if (await enforce(c, "leads", { max: 10, windowMs: 60_000 })) {
      return c.json({ error: "rate_limited" }, 429);
    }
    if (!getSql() || !isResendConfigured()) {
      return c.json({ error: "leads_unconfigured" }, 503);
    }

    const body = await c.req.json().catch(() => null);
    const validated = validateBody(body);
    if (!validated) return c.json({ error: "invalid_request" }, 400);

    const user = c.get("user");
    const configHash = hashPosterConfig(validated.posterConfig);

    const lead = await upsertLead({
      email: validated.email,
      userId: user?.userId ?? null,
      posterConfig: validated.posterConfig,
      configHash,
      assetUrl: validated.assetUrl,
      assetPathname: validated.assetPathname,
      source: validated.source,
      utm: validated.utm,
      consent: validated.consent,
    });
    // getSql()/isResendConfigured() were already checked above; a null here means
    // the DB dropped out between those checks and now — fail the same way.
    if (!lead) return c.json({ error: "leads_unconfigured" }, 503);

    if (user && validated.consent) {
      try {
        await getOrCreateProfile(user.userId, user.email);
        await updateProfile(user.userId, { marketingOptIn: true }, user.email);
      } catch (err) {
        // Best-effort — the lead itself is already saved; don't fail the request
        // over a profile-preference update.
        console.error("[leads] marketing opt-in update failed", err);
      }
    }

    const downloadUrl = `${backendBaseUrl()}/leads/download/${lead.downloadToken}`;
    const posterLabel = derivePosterLabel(validated.posterConfig);
    const email = leadMagnetEmail({ downloadUrl, posterLabel });
    const result = await sendEmail({ to: validated.email, ...email });

    if (!result) {
      await markLeadEmail(lead.id, { status: "failed" });
      return c.json({ error: "email_send_failed" }, 502);
    }

    await markLeadEmail(lead.id, { status: "sent", resendMessageId: result.id });
    const res: CreateLeadResponse = { status: "sent" };
    return c.json(res, 202);
  });

  r.get("/download/:token", async (c) => {
    if (await enforce(c, "lead-download", { max: 30, windowMs: 60_000 })) {
      return c.json({ error: "rate_limited" }, 429);
    }
    const lead = await findLeadByToken(c.req.param("token"));
    // Generic 404 either way — a miss and a lead with no asset look identical to
    // the caller (anti-enumeration).
    if (!lead || !lead.assetUrl) return c.json({ error: "not_found" }, 404);

    const signedUrl = await signAssetUrl(lead.assetUrl, { ttlMs: ONE_HOUR_MS });
    await markLeadDownloaded(lead.id);
    return c.redirect(signedUrl, 302);
  });

  return r;
}
