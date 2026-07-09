"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CreateLeadRequest, CreateLeadResponse } from "@heartbound/shared";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";
import { usePosterStore } from "@/lib/store/posterStore";
import { exportScreenPngBlob, slugify } from "@/lib/export";
import { uploadFreePosterPng } from "@/lib/upload/uploadPosterPng";
import { snapshotPosterConfig } from "@/lib/commerce/posterConfig";
import { apiSend, ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { OFFERED_PRODUCTS } from "@/lib/commerce/printProducts";

/** "from $65" — derived from the catalogue so a reprice never strands this copy. */
const FROM_PRICE = `$${Math.min(...OFFERED_PRODUCTS.map((p) => p.priceCents)) / 100}`;

// Same shape the backend uses to validate (routes/leads.ts) — kept in sync
// deliberately so an obviously-malformed address never round-trips.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "sent" | "error" | "unavailable" | "invalid_email";

// Kept one below the backend's MAX_UTM_KEYS (routes/leads.ts) to leave room for
// `referrer`, so an ad-platform URL with many utm_* params never trips the
// backend's >8-keys 400 and silently drops the lead.
const MAX_UTM_KEYS = 7;
const MAX_UTM_VALUE_LENGTH = 200;

/**
 * `utm_*` query params on the current URL, plus the referrer when present.
 * Clamped client-side to at most `MAX_UTM_KEYS` utm_ keys (+ referrer = 8
 * total) with each value sliced to `MAX_UTM_VALUE_LENGTH` chars, mirroring
 * (and staying under) the backend's stricter validation so an oversized utm
 * payload never 400s the whole lead request.
 */
export function collectUtm(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (!key.startsWith("utm_")) continue;
    if (Object.keys(out).length >= MAX_UTM_KEYS) break;
    out[key] = value.slice(0, MAX_UTM_VALUE_LENGTH);
  }
  if (typeof document !== "undefined" && document.referrer) {
    out.referrer = document.referrer.slice(0, MAX_UTM_VALUE_LENGTH);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * The Review step's lead-magnet form — replaces the old ungated PNG/SVG
 * downloads. Rasterizes a screen-res PNG client-side, uploads it privately,
 * then asks the backend to email a download link in exchange for an email
 * address. The `sent` state doubles as the upsell into the paid print, which
 * the host renders as the BuyBar directly below this panel.
 */
export function FreeDesignForm({
  getSvg,
  canSubmit,
}: {
  getSvg: () => SVGSVGElement | null;
  /** False until a home is set — mirrors the buy/export gating. */
  canSubmit: boolean;
}) {
  const track = useTrackEvent();
  const home = usePosterStore((s) => s.home);
  const templateId = usePosterStore((s) => s.templateId);
  const places = usePosterStore((s) => s.places);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sentEmail, setSentEmail] = useState("");

  useEffect(() => {
    track(ANALYTICS_EVENTS.freeDesignFormViewed, {
      template_id: templateId,
      places_count: places.length,
    });
    // Fire once on mount only — not on every template/place edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      track(ANALYTICS_EVENTS.freeDesignFailed, { error: "invalid_email" });
      setStatus("invalid_email");
      return;
    }

    track(ANALYTICS_EVENTS.freeDesignSubmitted, {});
    setStatus("submitting");
    try {
      const svg = getSvg();
      if (!svg) throw new Error("poster not ready");
      const blob = await exportScreenPngBlob(svg);
      const slug = slugify(home?.label ?? "poster");
      const { url: assetUrl } = await uploadFreePosterPng(blob, slug);

      const body: CreateLeadRequest = {
        email: trimmed,
        posterConfig: snapshotPosterConfig(),
        assetUrl,
        source: "studio_review",
        utm: collectUtm(),
        consent: true,
      };
      await apiSend<CreateLeadResponse>("/leads", "POST", body);

      track(ANALYTICS_EVENTS.freeDesignSent, {});
      setSentEmail(trimmed);
      setStatus("sent");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        track(ANALYTICS_EVENTS.freeDesignFailed, { error: err.code ?? "leads_unconfigured" });
        setStatus("unavailable");
        return;
      }
      const errorLabel = err instanceof ApiError ? (err.code ?? String(err.status)) : "client_error";
      track(ANALYTICS_EVENTS.freeDesignFailed, { error: errorLabel });
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-4">
        <p className="font-display text-lg leading-none text-ink">Check your inbox ✉</p>
        <p className="text-sm text-muted">
          Your Design Proof is on its way to {sentEmail}. It&apos;s yours to keep, no
          purchase needed.
        </p>
        <p className="text-sm text-body">
          Want it on your wall? This exact design, printed museum-quality on
          archival fine art paper, from {FROM_PRICE} with free shipping.
        </p>
      </div>
    );
  }

  if (status === "unavailable") {
    return <p className="text-sm text-muted">Free design delivery isn&apos;t available right now.</p>;
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-surface-card p-4"
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-pill bg-accent-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.96px] text-canvas">
            Free
          </span>
          <p className="font-display text-lg leading-none text-ink">
            Get your Design Proof
          </p>
        </div>
        <p className="mt-1.5 text-sm text-muted">
          We&apos;ll email you a Design Proof: a free, screen-resolution copy of
          this exact design, so you can see the finished piece before you pay a
          cent. Great on screens, ideal as a phone wallpaper, yours to keep
          either way.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "submitting"}
          className="h-11 rounded-md border border-hairline-strong bg-canvas px-3 text-[16px] text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      </label>

      <Button type="submit" disabled={status === "submitting" || !canSubmit}>
        {status === "submitting" ? "Sending…" : "Email my free design"}
      </Button>

      <p className="text-xs text-muted">
        We&apos;ll send your design plus occasional Heartbound Maps offers. Unsubscribe anytime.
      </p>

      {status === "error" && (
        <p className="text-sm text-error">Something went wrong. Please try again.</p>
      )}

      {status === "invalid_email" && (
        <p className="text-sm text-error">Please enter a valid email address.</p>
      )}

      {!canSubmit && <p className="text-xs text-muted">Add a place to enable your free design.</p>}
    </form>
  );
}
