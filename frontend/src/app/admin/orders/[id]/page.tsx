"use client";

import { use, useState } from "react";
import Link from "next/link";
import type { AdminOrderDetail, OrderShippingAddress } from "@heartbound/shared";
import { useResource } from "@/lib/account/useResource";
import { apiSend, ApiError } from "@/lib/apiClient";
import { Card, SectionHeading } from "@/components/account/Card";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { Loading, ErrorState } from "@/components/account/States";
import { formatDate, formatPrice } from "@/lib/account/format";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right text-body">{value}</span>
    </div>
  );
}

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error, reload } = useResource<AdminOrderDetail>(`/admin/orders/${id}`);

  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);

  async function act(label: string, fn: () => Promise<{ ok?: boolean; message?: string }>) {
    setBusy(label);
    setNote(null);
    try {
      const res = await fn();
      setNote(`${label}: ${res.message ?? (res.ok ? "done" : "failed")}`);
      await reload();
    } catch (e) {
      const msg = e instanceof ApiError ? `${e.status} ${e.code ?? ""}` : String(e);
      setNote(`${label} failed — ${msg}`);
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <Loading rows={6} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const o = data;
  const remainingCents = o.totalCents - o.amountRefundedCents;
  const canRefund = Boolean(o.stripePaymentIntentId) && remainingCents > 0;
  const canCancel = !["cancelled", "refunded", "delivered"].includes(o.status);
  const latestFulfilmentFailed = o.fulfillments[0]?.status === "failed";

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-muted hover:text-ink">
        ← All orders
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <SectionHeading title={o.orderNumber} description={o.email} />
        <OrderStatusBadge status={o.status} />
      </div>

      {note ? (
        <div className="mb-4 rounded-md border border-hairline bg-surface-strong px-3 py-2 text-sm text-body">
          {note}
        </div>
      ) : null}

      {/* Actions */}
      <Card className="mb-4 p-4">
        <p className="mb-3 text-sm font-medium text-ink">Actions</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder={`$${(remainingCents / 100).toFixed(2)}`}
              className="h-9 w-24 rounded-md border border-hairline bg-canvas px-2 text-sm text-ink"
              inputMode="decimal"
            />
            <button
              disabled={!canRefund || busy !== null}
              onClick={() =>
                act("Refund", () =>
                  apiSend(`/admin/orders/${id}/refund`, "POST", {
                    amountCents: refundAmount.trim()
                      ? Math.round(parseFloat(refundAmount) * 100)
                      : undefined,
                  }),
                )
              }
              className="h-9 rounded-md border border-hairline px-3 text-sm text-ink hover:bg-surface-strong disabled:opacity-40"
            >
              {busy === "Refund" ? "Refunding…" : refundAmount.trim() ? "Partial refund" : "Full refund"}
            </button>
          </div>

          <button
            disabled={!canCancel || busy !== null}
            onClick={() =>
              act("Cancel", () => apiSend(`/admin/orders/${id}/cancel`, "POST", { refund: true }))
            }
            className="h-9 rounded-md border border-hairline px-3 text-sm text-ink hover:bg-surface-strong disabled:opacity-40"
          >
            {busy === "Cancel" ? "Cancelling…" : "Cancel + refund"}
          </button>

          <button
            disabled={busy !== null}
            onClick={() =>
              act("Retry", () => apiSend(`/admin/orders/${id}/retry-fulfillment`, "POST"))
            }
            className={`h-9 rounded-md border px-3 text-sm hover:bg-surface-strong disabled:opacity-40 ${
              latestFulfilmentFailed ? "border-red-400 text-red-600" : "border-hairline text-ink"
            }`}
          >
            {busy === "Retry" ? "Retrying…" : "Retry fulfilment"}
          </button>

          <button
            disabled={busy !== null || !o.arteloOrderId}
            onClick={() => act("Sync", () => apiSend(`/admin/orders/${id}/sync`, "POST"))}
            className="h-9 rounded-md border border-hairline px-3 text-sm text-ink hover:bg-surface-strong disabled:opacity-40"
          >
            {busy === "Sync" ? "Syncing…" : "Sync from Artelo"}
          </button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Money + provider ids */}
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium text-ink">Payment & fulfilment</p>
          <Row label="Subtotal" value={formatPrice(o.subtotalCents, o.currency)} />
          <Row label="Shipping" value={formatPrice(o.shippingCents, o.currency)} />
          <Row label="Total" value={formatPrice(o.totalCents, o.currency)} />
          <Row label="Refunded" value={formatPrice(o.amountRefundedCents, o.currency)} />
          <Row label="Stripe PI" value={o.stripePaymentIntentId ?? "—"} />
          <Row label="Artelo order" value={o.arteloOrderId ?? "—"} />
          <Row label="Artelo status" value={o.arteloStatus ?? "—"} />
          <Row label="Paid at" value={o.paidAt ? formatDate(o.paidAt) : "—"} />
        </Card>

        {/* Shipping address (editable) */}
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-ink">Shipping address</p>
            <button
              onClick={() => setEditingAddress((v) => !v)}
              className="text-xs text-muted hover:text-ink"
            >
              {editingAddress ? "Cancel" : "Edit"}
            </button>
          </div>
          {editingAddress ? (
            <AddressForm
              initial={o.shippingAddress}
              busy={busy === "Address"}
              onSave={(addr) =>
                act("Address", async () => {
                  const r = await apiSend<{ ok: boolean; message?: string }>(
                    `/admin/orders/${id}/address`,
                    "PATCH",
                    addr,
                  );
                  setEditingAddress(false);
                  return r;
                })
              }
            />
          ) : (
            <div className="text-sm text-body">
              {o.shippingAddress ? (
                <>
                  <p>{o.shippingAddress.name}</p>
                  <p>{o.shippingAddress.line1}</p>
                  {o.shippingAddress.line2 ? <p>{o.shippingAddress.line2}</p> : null}
                  <p>
                    {o.shippingAddress.city}, {o.shippingAddress.region} {o.shippingAddress.postal}
                  </p>
                  <p>{o.shippingAddress.country}</p>
                </>
              ) : (
                <p className="text-muted">No address on file.</p>
              )}
              {o.tracking?.number ? (
                <p className="mt-2 text-xs text-muted">
                  Tracking: {o.tracking.carrier} {o.tracking.number}
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      {/* Items */}
      <Card className="mt-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Items</p>
        {o.items.map((it, i) => (
          <Row
            key={i}
            label={`${it.productLabel} × ${it.quantity}${it.assetUrl ? "" : " (no asset)"}`}
            value={formatPrice(it.unitPriceCents * it.quantity, o.currency)}
          />
        ))}
      </Card>

      {/* Fulfilment attempts (COGS) */}
      {o.fulfillments.length > 0 ? (
        <Card className="mt-4 p-4">
          <p className="mb-2 text-sm font-medium text-ink">Fulfilment attempts</p>
          {o.fulfillments.map((f) => {
            const cogs =
              (f.productionCostCents ?? 0) + (f.shippingCostCents ?? 0) + (f.taxCents ?? 0);
            return (
              <div key={f.id} className="border-b border-hairline py-2 text-sm last:border-0">
                <div className="flex justify-between">
                  <span className={f.status === "failed" ? "text-red-600" : "text-body"}>
                    #{f.attemptCount} {f.status}
                    {f.isTest ? " (test)" : ""}
                  </span>
                  <span className="text-muted">{formatDate(f.createdAt)}</span>
                </div>
                {f.status === "submitted" ? (
                  <p className="text-xs text-muted">
                    COGS {formatPrice(cogs, f.currency)} · Artelo {f.arteloOrderId}
                  </p>
                ) : (
                  <p className="text-xs text-red-600">{f.error}</p>
                )}
              </div>
            );
          })}
        </Card>
      ) : null}

      {/* Timeline */}
      <Card className="mt-4 p-4">
        <p className="mb-2 text-sm font-medium text-ink">Timeline</p>
        {o.events.map((e, i) => (
          <div key={i} className="flex justify-between gap-4 py-1 text-sm">
            <span className="text-body">
              {e.message} <span className="text-xs text-muted">({e.source})</span>
            </span>
            <span className="shrink-0 text-xs text-muted">{formatDate(e.createdAt)}</span>
          </div>
        ))}
      </Card>

      {/* Forensic: raw webhook log */}
      {o.webhookEvents.length > 0 ? (
        <Card className="mt-4 p-4">
          <p className="mb-2 text-sm font-medium text-ink">Webhook log</p>
          {o.webhookEvents.map((w) => (
            <div key={w.id} className="flex justify-between gap-4 py-1 text-xs">
              <span className="text-body">
                {w.provider} · {w.eventType} ·{" "}
                <span className={w.signatureValid ? "text-emerald-600" : "text-red-600"}>
                  sig {w.signatureValid ? "ok" : "bad"}
                </span>{" "}
                · {w.processingStatus}
                {w.error ? ` · ${w.error}` : ""}
              </span>
              <span className="shrink-0 text-muted">{formatDate(w.receivedAt)}</span>
            </div>
          ))}
        </Card>
      ) : null}

      {/* Admin audit */}
      {o.adminActions.length > 0 ? (
        <Card className="mt-4 p-4">
          <p className="mb-2 text-sm font-medium text-ink">Admin actions</p>
          {o.adminActions.map((a, i) => (
            <div key={i} className="flex justify-between gap-4 py-1 text-xs">
              <span className="text-body">
                {a.action} — {a.actorEmail}
              </span>
              <span className="shrink-0 text-muted">{formatDate(a.createdAt)}</span>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function AddressForm({
  initial,
  busy,
  onSave,
}: {
  initial?: OrderShippingAddress;
  busy: boolean;
  onSave: (addr: OrderShippingAddress) => void;
}) {
  const [a, setA] = useState<OrderShippingAddress>({
    name: initial?.name ?? "",
    line1: initial?.line1 ?? "",
    line2: initial?.line2 ?? "",
    city: initial?.city ?? "",
    region: initial?.region ?? "",
    postal: initial?.postal ?? "",
    country: initial?.country ?? "",
  });
  const field = (key: keyof OrderShippingAddress, placeholder: string) => (
    <input
      value={a[key] ?? ""}
      onChange={(e) => setA({ ...a, [key]: e.target.value })}
      placeholder={placeholder}
      className="h-9 w-full rounded-md border border-hairline bg-canvas px-2 text-sm text-ink"
    />
  );
  return (
    <div className="flex flex-col gap-2">
      {field("name", "Name")}
      {field("line1", "Address line 1")}
      {field("line2", "Address line 2 (optional)")}
      <div className="flex gap-2">
        {field("city", "City")}
        {field("region", "State")}
      </div>
      <div className="flex gap-2">
        {field("postal", "Postal")}
        {field("country", "Country (US)")}
      </div>
      <button
        disabled={busy}
        onClick={() => onSave(a)}
        className="h-9 rounded-md bg-ink px-3 text-sm text-canvas disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save address"}
      </button>
      <p className="text-xs text-muted">
        Note: Artelo can&apos;t edit an address after submission — if already in production, cancel
        &amp; re-create to change the print destination.
      </p>
    </div>
  );
}
