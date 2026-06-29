"use client";

import type { StepMeta } from "@/lib/studio/steps";

/**
 * The staged-flow progress indicator. On desktop it's a horizontal row of
 * numbered, labelled steps; on mobile it collapses to "Step N of M · {label}"
 * over a slim progress bar. Pure / props-driven. Steps up to `furthest` are
 * tappable to jump back; later steps are inert. `aria-current="step"` marks the
 * active one.
 */
export function WizardProgress({
  steps,
  current,
  furthest,
  onJump,
  className = "",
}: {
  steps: StepMeta[];
  current: number;
  /** Highest step index the user has reached — bounds which steps are tappable. */
  furthest: number;
  onJump: (index: number) => void;
  className?: string;
}) {
  const pct = ((current + 1) / steps.length) * 100;
  const active = steps[current];

  return (
    <nav
      aria-label="Progress"
      className={`shrink-0 border-b border-hairline bg-canvas ${className}`}
    >
      {/* Mobile: compact label + progress bar */}
      <div className="px-5 py-2.5 lg:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
            Step {current + 1} of {steps.length}
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {active.label}
            {active.optional && (
              <span className="ml-1 text-xs font-normal text-muted">· optional</span>
            )}
          </span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-pill bg-hairline">
          <div
            className="h-full rounded-pill bg-primary transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Desktop: horizontal numbered steps */}
      <ol className="hidden items-center gap-1 px-4 py-3 lg:flex">
        {steps.map((s, i) => {
          const isActive = i === current;
          const isDone = i < current;
          const reachable = i <= furthest;
          return (
            <li key={s.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => reachable && onJump(i)}
                disabled={!reachable}
                aria-current={isActive ? "step" : undefined}
                className={`flex items-center gap-2 rounded-pill px-2.5 py-1.5 text-sm transition-colors disabled:cursor-default ${
                  isActive
                    ? "text-ink"
                    : reachable
                      ? "text-body hover:bg-surface-strong"
                      : "text-muted-soft"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-pill border text-[11px] font-semibold ${
                    isActive || isDone
                      ? "border-primary bg-primary text-on-primary"
                      : "border-hairline-strong text-muted"
                  }`}
                  aria-hidden
                >
                  {isDone ? "✓" : i + 1}
                </span>
                <span className={isActive ? "font-medium" : ""}>
                  {s.label}
                  {s.optional && (
                    <span className="ml-1 text-xs text-muted">· optional</span>
                  )}
                </span>
              </button>
              {i < steps.length - 1 && (
                <span className="h-px w-4 bg-hairline" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
