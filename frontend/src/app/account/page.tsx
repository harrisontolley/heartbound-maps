"use client";

import Link from "next/link";
import type { OrderSummary, Rewards } from "@heartbound/shared";
import { authClient } from "@/lib/auth/client";
import { useResource } from "@/lib/account/useResource";
import { Card, SectionHeading } from "@/components/account/Card";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { Loading, ErrorState } from "@/components/account/States";
import { formatDate, formatPrice } from "@/lib/account/format";

export default function AccountOverviewPage() {
  const session = authClient.useSession();
  const user = session.data?.user as { name?: string; email?: string } | undefined;
  const orders = useResource<OrderSummary[]>("/account/orders");
  const rewards = useResource<Rewards>("/account/rewards");

  const firstName = user?.name?.split(" ")[0];
  const recent = (orders.data ?? []).slice(0, 3);

  return (
    <div>
      <SectionHeading
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        description={user?.email}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Recent orders</h2>
            <Link href="/account/orders" className="text-sm text-muted hover:text-ink">
              View all
            </Link>
          </div>
          {orders.loading ? <Loading variant="inline" rows={3} /> : null}
          {orders.error ? <ErrorState error={orders.error} onRetry={orders.reload} compact /> : null}
          {!orders.loading && !orders.error && recent.length === 0 ? (
            <p className="text-sm text-muted">No orders yet.</p>
          ) : null}
          <ul className="flex flex-col gap-3">
            {recent.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  href={`/account/orders/${o.orderNumber}`}
                  className="flex items-center justify-between gap-3 rounded-md px-1 py-1.5 hover:bg-surface-strong"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{o.previewLabel}</span>
                    <span className="block text-xs text-muted">
                      {o.orderNumber} · {formatDate(o.createdAt)}
                    </span>
                  </span>
                  <OrderStatusBadge status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg text-ink">Rewards</h2>
            <Link href="/account/rewards" className="text-sm text-muted hover:text-ink">
              Details
            </Link>
          </div>
          {rewards.loading ? <Loading variant="inline" rows={2} /> : null}
          {rewards.error ? <ErrorState error={rewards.error} onRetry={rewards.reload} compact /> : null}
          {rewards.data ? (
            <div className="flex flex-col gap-3">
              <div className="flex gap-6">
                <div>
                  <p className="font-display text-3xl text-ink">{rewards.data.pointsBalance}</p>
                  <p className="text-xs text-muted">points</p>
                </div>
                <div>
                  <p className="font-display text-3xl text-ink">
                    {formatPrice(rewards.data.creditCents)}
                  </p>
                  <p className="text-xs text-muted">store credit</p>
                </div>
              </div>
              <p className="text-sm text-muted">
                Your referral code:{" "}
                <span className="font-medium text-ink">{rewards.data.referralCode}</span>
              </p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
