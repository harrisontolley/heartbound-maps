"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePostHog } from "posthog-js/react";
import type { CreateLeadRequest, CreateLeadResponse } from "@pinprint/shared";
import { usePosterStore } from "@/lib/store/posterStore";
import { exportScreenPngBlob, slugify } from "@/lib/export";
import { uploadFreePosterPng } from "@/lib/upload/uploadPosterPng";
import { snapshotPosterConfig } from "@/lib/commerce/posterConfig";
import { apiSend, ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";

// Same shape the backend uses to validate (routes/leads.ts) — kept in sync
// deliberately so an obviously-malformed address never round-trips.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "sent" | "error" | "unavailable";

/** `utm_*` query params on the current URL, plus the referrer when present. */
function collectUtm(): Record<string, string> | undefined {
  if (typeof window === "undefined") return undefined;
  const out: Record<string, string> = {};
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    if (key.startsWith("utm_")) out[key] = value;
  }
  if (typeof document !== "undefined" && document.referrer) {
    out.referrer = document.referrer;
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
  const posthog = usePostHog();
  const home = usePosterStore((s) => s.home);
  const templateId = usePosterStore((s) => s.templateId);
  const places = usePosterStore((s) => s.places);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [sentEmail, setSentEmail] = useState("");

  useEffect(() => {
    posthog.capture("free_design_form_viewed", {
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
      posthog.capture("free_design_failed", { error: "invalid_email" });
      setStatus("error");
      return;
    }

    posthog.capture("free_design_submitted");
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

      posthog.capture("free_design_sent");
      setSentEmail(trimmed);
      setStatus("sent");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        posthog.capture("free_design_failed", { error: err.code ?? "leads_unconfigured" });
        setStatus("unavailable");
        return;
      }
      const errorLabel = err instanceof ApiError ? (err.code ?? String(err.status)) : "client_error";
      posthog.capture("free_design_failed", { error: errorLabel });
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface-card p-4">
        <p className="font-display text-lg leading-none text-ink">Check your inbox ✉</p>
        <p className="text-sm text-muted">Your design is on its way to {sentEmail}.</p>
        <p className="text-sm text-body">
          Want it on your wall? This exact design, printed museum-quality on archival
          fine-art paper — from $61 with free shipping.
        </p>
      </div>
    );
  }

  if (status === "unavailable") {
    return <p className="text-sm text-muted">Free design delivery isn&apos;t available right now.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <p className="font-display text-lg leading-none text-ink">Get your free design</p>
        <p className="mt-1 text-sm text-muted">
          We&apos;ll email you the finished design — perfect on screens, ideal as a phone
          wallpaper.
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
          className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-ink disabled:opacity-60"
        />
      </label>

      <Button type="submit" disabled={status === "submitting" || !canSubmit}>
        {status === "submitting" ? "Sending…" : "Email my free design"}
      </Button>

      <p className="text-xs text-muted">
        We&apos;ll send your design plus occasional Pinprint offers. Unsubscribe anytime.
      </p>

      {status === "error" && (
        <p className="text-sm text-error">Something went wrong — please try again.</p>
      )}

      {!canSubmit && <p className="text-xs text-muted">Add a place to enable your free design.</p>}
    </form>
  );
}
