"use client";

import { useState, type FormEvent } from "react";
import type {
  CreateMailingListSignupRequest,
  CreateMailingListSignupResponse,
  MailingListReason,
} from "@heartbound/shared";
import { apiSend, ApiError } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { useTrackEvent } from "@/lib/analytics/useTrackEvent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_OTHER_TEXT_LENGTH = 500;

const REASON_OPTIONS: { id: MailingListReason; label: string }[] = [
  { id: "size", label: "A different size" },
  { id: "material", label: "A different (or cheaper) material" },
  { id: "map_style", label: "A different map style" },
  { id: "other", label: "Something else" },
];

type Status = "idle" | "submitting" | "sent" | "error" | "unavailable" | "invalid_email";

/**
 * Embedded in the FAQ's "we don't have my size?" answer (see copy.ts's
 * `formId: "mailing-list-size"` and FaqItemRow). Captures email + why, so
 * product decisions can be prioritized by real demand instead of guesswork.
 */
export function MailingListForm() {
  const track = useTrackEvent();
  const [email, setEmail] = useState("");
  const [reasons, setReasons] = useState<MailingListReason[]>([]);
  const [otherText, setOtherText] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  function toggleReason(id: MailingListReason) {
    setReasons((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;

    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setStatus("invalid_email");
      return;
    }

    setStatus("submitting");
    try {
      const body: CreateMailingListSignupRequest = {
        email: trimmed,
        reasons,
        otherText: reasons.includes("other") ? otherText.slice(0, MAX_OTHER_TEXT_LENGTH) : undefined,
        source: "faq_size_question",
      };
      await apiSend<CreateMailingListSignupResponse>("/mailing-list", "POST", body);
      track(ANALYTICS_EVENTS.mailingListSignup, {
        reasons,
        has_other_text: reasons.includes("other") && otherText.trim().length > 0,
      });
      setStatus("sent");
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setStatus("unavailable");
        return;
      }
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p className="mt-3 text-sm text-body">
        You&apos;re on the list — we&apos;ll email you the moment it ships.
      </p>
    );
  }

  if (status === "unavailable") {
    return <p className="mt-3 text-sm text-muted">Signups aren&apos;t available right now.</p>;
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs text-muted">What are you after? (optional)</legend>
        {REASON_OPTIONS.map((opt) => (
          <label key={opt.id} className="flex items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={reasons.includes(opt.id)}
              onChange={() => toggleReason(opt.id)}
              className="h-4 w-4 rounded border-hairline-strong"
            />
            {opt.label}
          </label>
        ))}
      </fieldset>

      {reasons.includes("other") && (
        <input
          type="text"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder="Tell us more"
          maxLength={MAX_OTHER_TEXT_LENGTH}
          className="h-11 rounded-md border border-hairline-strong bg-canvas px-3 text-[16px] text-ink outline-none focus:border-ink"
        />
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          disabled={status === "submitting"}
          className="h-11 flex-1 rounded-md border border-hairline-strong bg-canvas px-3 text-[16px] text-ink outline-none focus:border-ink disabled:opacity-60"
        />
        <Button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Joining…" : "Join the list"}
        </Button>
      </div>

      {status === "invalid_email" && (
        <p className="text-sm text-error">Please enter a valid email address.</p>
      )}
      {status === "error" && (
        <p className="text-sm text-error">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}
