import { ApiError } from "@/lib/apiClient";

// Translates a thrown error from an account fetch into user-facing copy. Never
// echoes a status code, path, or the raw Error message — the account UI shows
// only `title`/`message` and branches on `kind` for the right recovery action.

export type ErrorKind = "auth" | "notfound" | "server" | "network";

export type AccountError = {
  kind: ErrorKind;
  title: string;
  message: string;
};

const COPY: Record<ErrorKind, { title: string; message: string }> = {
  auth: {
    title: "Your session has expired",
    message: "Sign in again to pick up where you left off.",
  },
  notfound: {
    title: "We couldn’t find that",
    message: "It may have been removed, or the link is out of date.",
  },
  server: {
    title: "Something went wrong on our end",
    message: "This is on us, not you. Give it another try in a moment.",
  },
  network: {
    title: "You appear to be offline",
    message: "Check your connection and try again.",
  },
};

function kindFor(err: unknown): ErrorKind {
  if (err instanceof ApiError) {
    if (err.status === 401 || err.status === 403) return "auth";
    if (err.status === 404) return "notfound";
    return "server"; // 5xx, auth_unconfigured, and any other non-2xx
  }
  // A thrown non-ApiError means fetch() itself rejected (offline / DNS / CORS).
  return "network";
}

/** Map any caught error to the account error shape used by `<ErrorState>`. */
export function describeError(err: unknown): AccountError {
  const kind = kindFor(err);
  return { kind, ...COPY[kind] };
}
