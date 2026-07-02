"use client";

import { useState } from "react";
import Link from "next/link";
import type { TrackResult } from "@pinprint/shared";
import { apiFetch } from "@/lib/apiClient";
import { AccountNav } from "@/components/account/AccountNav";
import { Card } from "@/components/account/Card";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { OrderTimeline } from "@/components/account/OrderTimeline";
import { Button } from "@/components/ui/Button";
import { formatDate } from "@/lib/account/format";

// Public order tracking — no sign-in needed. Looks an order up by number + email
// and shows status, items, and the tracking timeline (the narrow TrackResult; no
// personal data). Reuses the same <OrderTimeline> as the in-account order detail.
export default function TrackPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<TrackResult | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "notfound" | "limited" | "error">(
    "idle",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setResult(null);
    try {
      const res = await apiFetch("/track", {
        method: "POST",
        body: JSON.stringify({ orderNumber: orderNumber.trim(), email: email.trim() }),
      });
      if (res.status === 429) return setStatus("limited");
      if (!res.ok) return setStatus("notfound");
      setResult((await res.json()) as TrackResult);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-[760px] items-center justify-between px-6">
          <Link href="/" className="font-display text-2xl tracking-[-0.32px] text-ink">
            Pinprint
          </Link>
          <AccountNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-6 py-12">
        <h1 className="font-display text-3xl text-ink">Track your order</h1>
        <p className="mt-2 text-sm text-muted">
          Enter your order number and the email you ordered with.
        </p>

        <Card className="mt-6 p-6">
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Order number</span>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="PP-XXXXXX"
                required
                className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-muted">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-10 rounded-md border border-hairline-strong bg-canvas px-3 text-sm text-ink outline-none focus:border-ink"
              />
            </label>
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Searching…" : "Track"}
            </Button>
          </form>
        </Card>

        {status === "notfound" ? (
          <p className="mt-4 text-sm text-muted">
            We couldn&apos;t find an order with that number and email. Double-check both and try
            again.
          </p>
        ) : null}
        {status === "limited" ? (
          <p className="mt-4 text-sm text-muted">Too many attempts. Please wait a moment and try again.</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 text-sm text-error">Something went wrong. Please try again.</p>
        ) : null}

        {result ? (
          <Card className="mt-6 p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl text-ink">{result.orderNumber}</h2>
                <p className="text-sm text-muted">Placed {formatDate(result.placedAt)}</p>
              </div>
              <OrderStatusBadge status={result.status} />
            </div>

            <ul className="mb-5 flex flex-col gap-1 text-sm text-body">
              {result.items.map((it, i) => (
                <li key={i}>
                  {it.quantity} × {it.label}
                </li>
              ))}
            </ul>

            {result.tracking?.number ? (
              <p className="mb-5 text-sm">
                <span className="text-muted">Tracking: </span>
                <span className="text-body">
                  {result.tracking.carrier ?? "Carrier"} · {result.tracking.number}
                </span>{" "}
                {result.tracking.url ? (
                  <a
                    href={result.tracking.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink underline"
                  >
                    Track parcel
                  </a>
                ) : null}
              </p>
            ) : null}

            <OrderTimeline entries={result.timeline} />
          </Card>
        ) : null}
      </main>
    </div>
  );
}
