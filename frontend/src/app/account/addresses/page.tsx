"use client";

import { useState } from "react";
import type { Address, AddressInput } from "@heartbound/shared";
import { useResource } from "@/lib/account/useResource";
import { apiFetch } from "@/lib/apiClient";
import { Card, SectionHeading } from "@/components/account/Card";
import { Loading, ErrorState, ErrorNote, EmptyState } from "@/components/account/States";
import { Button } from "@/components/ui/Button";

const EMPTY: AddressInput = {
  label: "",
  name: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal: "",
  country: "GB",
};

export default function AddressesPage() {
  const { data, loading, error, reload } = useResource<Address[]>("/account/addresses");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await apiFetch("/account/addresses", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Please fill in name, address, city, postcode and country.");
      setForm(EMPTY);
      setAdding(false);
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save address.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setActionError(null);
    try {
      const res = await apiFetch(`/account/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await reload();
    } catch {
      setActionError("We couldn’t delete that address. Please try again.");
    }
  }

  async function makeDefault(a: Address) {
    const { id, isDefault: _omit, ...rest } = a;
    void _omit;
    setActionError(null);
    try {
      const res = await apiFetch(`/account/addresses/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...rest, isDefault: true }),
      });
      if (!res.ok) throw new Error();
      await reload();
    } catch {
      setActionError("We couldn’t update your default address. Please try again.");
    }
  }

  return (
    <div>
      <SectionHeading
        title="Addresses"
        description="Saved shipping addresses for faster checkout."
        action={
          <Button variant="outline" size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Add address"}
          </Button>
        }
      />

      {adding ? (
        <Card className="mb-5 p-6">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2">
            <Field label="Label" value={form.label ?? ""} onChange={set("label")} placeholder="Home" />
            <Field label="Full name" value={form.name} onChange={set("name")} required />
            <Field label="Address line 1" value={form.line1} onChange={set("line1")} required className="sm:col-span-2" />
            <Field label="Address line 2" value={form.line2 ?? ""} onChange={set("line2")} className="sm:col-span-2" />
            <Field label="City" value={form.city} onChange={set("city")} required />
            <Field label="Region / State" value={form.region ?? ""} onChange={set("region")} />
            <Field label="Postcode" value={form.postal} onChange={set("postal")} required />
            <Field label="Country (ISO-2)" value={form.country} onChange={set("country")} required />
            {formError ? <div className="sm:col-span-2"><ErrorNote message={formError} /></div> : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save address"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? <Loading rows={2} /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {!loading && !error && data && data.length === 0 && !adding ? (
        <EmptyState>No saved addresses yet.</EmptyState>
      ) : null}
      {actionError ? <div className="mb-3"><ErrorNote message={actionError} /></div> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {(data ?? []).map((a) => (
          <Card key={a.id} className="flex flex-col justify-between gap-3 p-5">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[15px] font-medium text-ink">{a.label || a.name}</span>
                {a.isDefault ? (
                  <span className="rounded-pill bg-surface-strong px-2 py-0.5 text-xs text-muted">
                    Default
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-body">
                {[a.name, a.line1, a.line2, a.city, a.region, a.postal, a.country]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
            <div className="flex gap-3">
              {!a.isDefault ? (
                <button onClick={() => makeDefault(a)} className="text-sm text-ink hover:underline">
                  Make default
                </button>
              ) : null}
              <button onClick={() => remove(a.id)} className="text-sm text-error hover:underline">
                Delete
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      <input
        className="h-11 rounded-md border border-hairline-strong bg-canvas px-3 text-[16px] text-ink outline-none focus:border-ink"
        {...props}
      />
    </label>
  );
}
