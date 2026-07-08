"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { Order } from "@heartbound/shared";
import { useResource } from "@/lib/account/useResource";
import { Card } from "@/components/account/Card";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { Loading, ErrorState } from "@/components/account/States";
import { formatDate, formatPrice } from "@/lib/account/format";

export default function OrderDetailPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = params.orderNumber;
  const { data: order, loading, error, reload } = useResource<Order>(
    orderNumber ? `/account/orders/${orderNumber}` : null,
  );

  return (
    <div>
      <Link href="/account/orders" className="text-sm text-muted hover:text-ink">
        ← All orders
      </Link>

      {loading ? <div className="mt-4"><Loading variant="card" /></div> : null}
      {error ? <div className="mt-4"><ErrorState error={error} onRetry={reload} /></div> : null}

      {order ? (
        <>
          <div className="mb-6 mt-2 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl text-ink">{order.orderNumber}</h1>
              <p className="mt-1 text-sm text-muted">Placed {formatDate(order.createdAt)}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
            <div className="flex flex-col gap-5">
              <Card className="p-6">
                <h2 className="mb-4 font-display text-lg text-ink">Items</h2>
                <ul className="flex flex-col divide-y divide-hairline">
                  {order.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-[15px] text-ink">{it.productLabel}</p>
                        <p className="text-xs text-muted">Qty {it.quantity}</p>
                      </div>
                      <span className="text-sm text-body">
                        {formatPrice(it.unitPriceCents * it.quantity, order.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-col gap-1 border-t border-hairline pt-4 text-sm">
                  <Row label="Subtotal" value={formatPrice(order.subtotalCents, order.currency)} />
                  <Row label="Shipping" value={formatPrice(order.shippingCents, order.currency)} />
                  <Row label="Total" value={formatPrice(order.totalCents, order.currency)} strong />
                </div>
              </Card>

              {order.shippingAddress ? (
                <Card className="p-6">
                  <h2 className="mb-3 font-display text-lg text-ink">Shipping to</h2>
                  <address className="text-sm not-italic text-body">
                    {[
                      order.shippingAddress.name,
                      order.shippingAddress.line1,
                      order.shippingAddress.line2,
                      order.shippingAddress.city,
                      order.shippingAddress.region,
                      order.shippingAddress.postal,
                      order.shippingAddress.country,
                    ]
                      .filter(Boolean)
                      .map((line, i) => (
                        <span key={i} className="block">
                          {line}
                        </span>
                      ))}
                  </address>
                </Card>
              ) : null}
            </div>

            <div className="flex flex-col gap-5">
              <Card className="p-6">
                <h2 className="mb-4 font-display text-lg text-ink">Tracking</h2>
                {order.tracking?.number ? (
                  <div className="mb-4 text-sm">
                    <p className="text-body">
                      {order.tracking.carrier ?? "Carrier"} · {order.tracking.number}
                    </p>
                    {order.tracking.url ? (
                      <a
                        href={order.tracking.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ink underline"
                      >
                        Track parcel
                      </a>
                    ) : null}
                  </div>
                ) : null}
                <OrderTimeline entries={order.events} />
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "text-ink" : "text-muted"}>{label}</span>
      <span className={strong ? "font-medium text-ink" : "text-body"}>{value}</span>
    </div>
  );
}
