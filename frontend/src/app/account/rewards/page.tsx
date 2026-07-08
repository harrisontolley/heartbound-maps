"use client";

import { useState } from "react";
import type { Rewards } from "@heartbound/shared";
import { useResource } from "@/lib/account/useResource";
import { Card, SectionHeading } from "@/components/account/Card";
import { Loading, ErrorState } from "@/components/account/States";
import { formatDate, formatPrice } from "@/lib/account/format";

export default function RewardsPage() {
  const { data, loading, error, reload } = useResource<Rewards>("/account/rewards");
  const [copied, setCopied] = useState(false);

  function copy(code: string) {
    void navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div>
      <SectionHeading
        title="Rewards"
        description="Earn points and credit on every order. Perks are on the way."
      />

      {loading ? <Loading variant="card" /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data ? (
        <div className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Card className="p-6">
              <p className="font-display text-4xl text-ink">{data.pointsBalance}</p>
              <p className="text-sm text-muted">points</p>
            </Card>
            <Card className="p-6">
              <p className="font-display text-4xl text-ink">{formatPrice(data.creditCents)}</p>
              <p className="text-sm text-muted">store credit</p>
            </Card>
          </div>

          <Card className="flex flex-wrap items-center justify-between gap-3 p-6">
            <div>
              <p className="text-sm text-muted">Your referral code</p>
              <p className="font-display text-2xl tracking-wide text-ink">{data.referralCode}</p>
              <p className="mt-1 text-sm text-muted">
                Share it — friends get a discount, you get credit when they order.
              </p>
            </div>
            <button
              onClick={() => copy(data.referralCode)}
              className="h-9 rounded-pill border border-hairline-strong px-4 text-sm text-ink hover:bg-surface-strong"
            >
              {copied ? "Copied!" : "Copy code"}
            </button>
          </Card>

          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg text-ink">Activity</h2>
            {data.ledger.length === 0 ? (
              <p className="text-sm text-muted">No reward activity yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-hairline">
                {data.ledger.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm text-ink">{e.description}</p>
                      <p className="text-xs text-muted">{formatDate(e.createdAt)}</p>
                    </div>
                    <span className="text-sm text-body">
                      {e.points ? `+${e.points} pts` : null}
                      {e.points && e.creditCents ? " · " : null}
                      {e.creditCents ? `+${formatPrice(e.creditCents)}` : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
