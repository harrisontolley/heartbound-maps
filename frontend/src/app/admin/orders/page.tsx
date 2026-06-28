"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AdminOrderListResponse, OrderStatus } from "@pinprint/shared";
import { useResource } from "@/lib/account/useResource";
import { Card, SectionHeading } from "@/components/account/Card";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { Loading, ErrorState, EmptyState } from "@/components/account/States";
import { formatDate, formatPrice } from "@/lib/account/format";

const STATUSES: (OrderStatus | "")[] = [
  "",
  "pending_payment",
  "paid",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

function OrdersTable() {
  const params = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(params.get("status") ?? "");

  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  if (search.trim()) qs.set("search", search.trim());
  const path = `/admin/orders${qs.toString() ? `?${qs}` : ""}`;
  const { data, loading, error, reload } = useResource<AdminOrderListResponse>(path);

  return (
    <div>
      <SectionHeading title="Orders" description="Search, inspect, refund, cancel, and re-fulfil." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order # or email…"
          className="h-9 min-w-[220px] flex-1 rounded-md border border-hairline bg-canvas px-3 text-sm text-ink outline-none focus:border-hairline-strong"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-md border border-hairline bg-canvas px-2 text-sm text-ink"
        >
          {STATUSES.map((s) => (
            <option key={s || "all"} value={s}>
              {s ? s.replace(/_/g, " ") : "All statuses"}
            </option>
          ))}
        </select>
      </div>

      {loading ? <Loading rows={5} /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {data && data.orders.length === 0 && !loading ? (
        <EmptyState>No orders match.</EmptyState>
      ) : null}

      <ul className="flex flex-col gap-2">
        {(data?.orders ?? []).map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`}>
              <Card className="flex items-center justify-between gap-4 p-3 transition-colors hover:border-hairline-strong">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[15px] text-ink">
                    <span className="font-mono text-sm">{o.orderNumber}</span>
                    {o.isTest ? (
                      <span className="rounded bg-surface-strong px-1.5 text-[10px] uppercase text-muted">test</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {o.email} · {o.previewLabel} · {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-right">
                  <div>
                    <p className="text-sm text-body">{formatPrice(o.totalCents, o.currency)}</p>
                    {o.marginCents != null ? (
                      <p className="text-xs text-muted">margin {formatPrice(o.marginCents, o.currency)}</p>
                    ) : o.fulfillmentStatus === "failed" ? (
                      <p className="text-xs text-red-600">fulfilment failed</p>
                    ) : null}
                    {o.amountRefundedCents > 0 ? (
                      <p className="text-xs text-amber-600">−{formatPrice(o.amountRefundedCents, o.currency)} refunded</p>
                    ) : null}
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {data && data.total > data.orders.length ? (
        <p className="mt-3 text-xs text-muted">
          Showing {data.orders.length} of {data.total}. Refine with search/status.
        </p>
      ) : null}
    </div>
  );
}

export default function AdminOrdersPage() {
  // useSearchParams requires a Suspense boundary in the App Router.
  return (
    <Suspense fallback={<Loading rows={5} />}>
      <OrdersTable />
    </Suspense>
  );
}
