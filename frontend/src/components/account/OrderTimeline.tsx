import type { OrderStatus } from "@heartbound/shared";
import { formatDate } from "@/lib/account/format";

// Vertical tracking timeline. Newest event on top and emphasised as the current
// status. Fed by Order.events (account detail) or TrackResult.timeline (/track) —
// the same shape, so one component serves both.

export type TimelineEntry = {
  status: OrderStatus | null;
  message: string;
  createdAt: string;
};

export function OrderTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No updates yet.</p>;
  }
  const rows = [...entries].reverse();
  return (
    <ol className="relative">
      {rows.map((e, i) => {
        const current = i === 0;
        const isLast = i === rows.length - 1;
        return (
          <li key={`${e.createdAt}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? (
              <span
                className="absolute left-[5px] top-4 h-full w-px bg-hairline"
                aria-hidden
              />
            ) : null}
            <span
              className={`relative mt-1 h-[11px] w-[11px] shrink-0 rounded-full border-2 ${
                current ? "border-ink bg-ink" : "border-hairline-strong bg-surface-card"
              }`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className={`text-sm ${current ? "font-medium text-ink" : "text-body"}`}>
                {e.message}
              </p>
              <p className="text-xs text-muted">{formatDate(e.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
