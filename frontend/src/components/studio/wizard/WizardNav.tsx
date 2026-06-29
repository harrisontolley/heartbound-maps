"use client";

import { Button } from "@/components/ui/Button";

export type NavAction = { label: string; onClick: () => void; disabled?: boolean };

/**
 * The staged-flow bottom bar for every step before Review (Review uses BuyBar).
 * A back affordance on the left and the forward action(s) on the right: an
 * ink-pill `primary` plus an optional outline `secondary` (e.g. "Personalize").
 * It's the last flex child of the panel column, so the column's fixed height
 * pins it to the bottom; `env(safe-area-inset-bottom)` keeps it clear of mobile
 * browser chrome.
 */
export function WizardNav({
  showBack = true,
  onBack,
  secondary,
  primary,
  className = "",
}: {
  showBack?: boolean;
  onBack: () => void;
  secondary?: NavAction;
  primary: NavAction;
  className?: string;
}) {
  return (
    <div
      className={`shrink-0 border-t border-hairline bg-canvas/95 backdrop-blur ${className}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div className="min-w-0">
          {showBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {secondary && (
            <Button variant="outline" size="md" onClick={secondary.onClick}>
              {secondary.label}
            </Button>
          )}
          <Button
            variant="primary"
            size="md"
            onClick={primary.onClick}
            disabled={primary.disabled}
          >
            {primary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
