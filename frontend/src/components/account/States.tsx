import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/account/Card";
import type { AccountError, ErrorKind } from "@/lib/account/errorCopy";

// Shared loading / error / empty states for account resource pages. The error
// state never shows a raw HTTP message — it takes the structured AccountError
// and offers in-place recovery (Try again, plus Sign in when the session lapsed).

// ─── Loading skeletons ──────────────────────────────────────────────────────

function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-surface-strong ${className}`} />;
}

/**
 * Skeleton placeholder shown while a resource loads. `variant="list"` mimics a
 * stack of row cards (orders, addresses); `variant="card"` mimics a single
 * content block (profile, rewards, order detail); `variant="inline"` is bare
 * bars for use *inside* an existing card (e.g. account overview tiles).
 */
export function Loading({
  variant = "list",
  rows = 3,
  label = "Loading…",
}: {
  variant?: "list" | "card" | "inline";
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {variant === "inline" ? (
        Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Bar className="h-4 w-2/5" />
            <Bar className="h-3 w-3/5" />
          </div>
        ))
      ) : variant === "card" ? (
        <Card className="flex flex-col gap-3 p-6">
          <Bar className="h-5 w-1/3" />
          <Bar className="h-4 w-2/3" />
          <Bar className="h-4 w-1/2" />
          <Bar className="h-4 w-3/5" />
        </Card>
      ) : (
        Array.from({ length: rows }).map((_, i) => (
          <Card key={i} className="flex items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Bar className="h-4 w-2/5" />
              <Bar className="h-3 w-3/5" />
            </div>
            <Bar className="h-6 w-16 shrink-0 rounded-pill" />
          </Card>
        ))
      )}
    </div>
  );
}

// ─── Error state ────────────────────────────────────────────────────────────

function ErrorIcon({ kind }: { kind: ErrorKind }) {
  // 20px stroke glyphs; one per error kind. Muted so the copy leads, not the icon.
  const path: Record<ErrorKind, ReactNode> = {
    auth: (
      <>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </>
    ),
    notfound: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    server: (
      <>
        <path d="M12 3 2 20h20L12 3Z" />
        <path d="M12 10v4" />
        <path d="M12 17h.01" />
      </>
    ),
    network: (
      <>
        <path d="M3 3l18 18" />
        <path d="M5 12.5a10 10 0 0 1 4-2.4" />
        <path d="M8.5 16a5 5 0 0 1 3-1.4" />
        <path d="M12 20h.01" />
      </>
    ),
  };
  return (
    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-strong text-muted">
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {path[kind]}
      </svg>
    </span>
  );
}

/**
 * Graceful, user-facing error card with in-place recovery. Pass the structured
 * error from `useResource` and its `reload` for the retry button. `compact`
 * drops the surrounding card/icon for use inside an existing card (e.g. the
 * account overview tiles).
 */
export function ErrorState({
  error,
  onRetry,
  compact = false,
}: {
  error: AccountError;
  onRetry?: () => void;
  compact?: boolean;
}) {
  const actions = (
    <div className="mt-1 flex flex-wrap gap-2">
      {error.kind === "auth" ? (
        <Link href="/auth/sign-in">
          <Button size="sm">Sign in</Button>
        </Link>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );

  if (compact) {
    return (
      <div role="alert" className="flex flex-col gap-2 py-2">
        <div>
          <p className="text-sm font-medium text-ink">{error.title}</p>
          <p className="mt-0.5 text-sm text-muted">{error.message}</p>
        </div>
        {actions}
      </div>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center" role="alert">
      <ErrorIcon kind={error.kind} />
      <div className="max-w-sm">
        <p className="font-display text-lg text-ink">{error.title}</p>
        <p className="mt-1 text-sm text-muted">{error.message}</p>
      </div>
      {actions}
    </Card>
  );
}

/** Inline message for form/validation errors — already-friendly copy only. */
export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-hairline bg-surface-strong px-3 py-2 text-sm text-error">
      {message}
    </p>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline-strong px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}
