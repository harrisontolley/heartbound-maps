// Server-side PostHog capture for events that must be trustworthy even when
// client JS never runs (a webhook firing, a background fulfilment job) — see
// docs/integrations/posthog.md. No SDK: a thin fetch wrapper against PostHog's
// HTTP capture API, scaffolded like email.ts/artelo.ts (env-guarded, lazy,
// never throws). Uses its own POSTHOG_PROJECT_API_KEY rather than the
// frontend's NEXT_PUBLIC_POSTHOG_KEY, so the backend can be enabled/disabled
// and rotated independently of the browser key (see backend/.env.example).

const DEFAULT_HOST = "https://us.i.posthog.com";

/** Whether server-side capture is configured. */
export function isPostHogServerConfigured(): boolean {
  return Boolean(process.env.POSTHOG_PROJECT_API_KEY);
}

function captureUrl(): string {
  const host = process.env.POSTHOG_HOST || DEFAULT_HOST;
  return `${host.replace(/\/+$/, "")}/capture/`;
}

/**
 * Capture a server-side PostHog event. Fire-and-forget-safe: never throws, so
 * a broken/unconfigured PostHog can never fail the caller's flow (mirrors
 * sendEmail in email.ts). `distinctId` should be the order id (or another
 * stable, non-PII identifier) — these events aren't tied to a browser session.
 */
export async function capturePostHogServerEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  const apiKey = process.env.POSTHOG_PROJECT_API_KEY;
  if (!apiKey) return;

  try {
    const res = await fetch(captureUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $process_person_profile: false },
      }),
    });
    if (!res.ok) {
      console.error("posthog_server_capture_failed", event, res.status);
    }
  } catch (err) {
    console.error("posthog_server_capture_error", event, err);
  }
}
