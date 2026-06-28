"use client";

import Link from "next/link";
import type { AdminMetrics } from "@pinprint/shared";
import { useResource } from "@/lib/account/useResource";
import { Card, SectionHeading } from "@/components/account/Card";
import { Loading, ErrorState } from "@/components/account/States";
import { formatPrice } from "@/lib/account/format";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}

export default function AdminOverview() {
  const { data, loading, error, reload } = useResource<AdminMetrics>("/admin/metrics");

  return (
    <div>
      <SectionHeading title="Overview" description="Revenue, cost of goods, and fulfilment health." />

      {loading ? <Loading rows={4} /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {data ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Gross revenue" value={formatPrice(data.grossRevenueCents)} hint={`${data.paidOrderCount} paid orders`} />
            <Stat label="Refunded" value={formatPrice(data.refundedCents)} />
            <Stat label="Artelo COGS" value={formatPrice(data.cogsCents)} hint="live orders only" />
            <Stat
              label="Net margin"
              value={formatPrice(data.marginCents)}
              hint={
                data.grossRevenueCents > 0
                  ? `${Math.round((data.marginCents / data.grossRevenueCents) * 100)}% of revenue`
                  : undefined
              }
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Failed fulfilments" value={String(data.failedFulfillmentCount)} hint="need a retry" />
            <Stat label="Test orders" value={String(data.testOrderCount)} />
          </div>

          <Card className="mt-4 p-4">
            <p className="text-sm font-medium text-ink">Orders by status</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(data.ordersByStatus).map(([status, n]) => (
                <Link
                  key={status}
                  href={`/admin/orders?status=${status}`}
                  className="rounded-full border border-hairline bg-surface-strong px-3 py-1 text-sm text-body hover:border-hairline-strong"
                >
                  {status.replace(/_/g, " ")} · {n}
                </Link>
              ))}
              {Object.keys(data.ordersByStatus).length === 0 ? (
                <span className="text-sm text-muted">No orders yet.</span>
              ) : null}
            </div>
          </Card>

          <Link href="/admin/orders" className="mt-4 inline-block text-sm text-ink underline">
            View all orders →
          </Link>
        </>
      ) : null}
    </div>
  );
}
