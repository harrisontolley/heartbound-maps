import type { OrderStatus } from "@heartbound/shared";

// Status label + dot colour for an order, shared by the order list, order detail,
// and the public /track page.

const META: Record<OrderStatus, { label: string; dot: string }> = {
  pending_payment: { label: "Pending payment", dot: "bg-muted-soft" },
  paid: { label: "Paid", dot: "bg-body" },
  in_production: { label: "In production", dot: "bg-body-strong" },
  shipped: { label: "Shipped", dot: "bg-ink" },
  delivered: { label: "Delivered", dot: "bg-success" },
  cancelled: { label: "Cancelled", dot: "bg-muted" },
  refunded: { label: "Refunded", dot: "bg-error" },
};

export function statusLabel(status: OrderStatus): string {
  return META[status].label;
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = META[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-hairline-strong px-3 py-1 text-xs font-medium text-body">
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
    </span>
  );
}
