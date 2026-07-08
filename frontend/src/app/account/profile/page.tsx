"use client";

import { useState } from "react";
import type { AccountProfile, AccountUnits } from "@heartbound/shared";
import { authClient } from "@/lib/auth/client";
import { useResource } from "@/lib/account/useResource";
import { apiFetch } from "@/lib/apiClient";
import { Card, SectionHeading } from "@/components/account/Card";
import { Loading, ErrorState, ErrorNote } from "@/components/account/States";
import { Button } from "@/components/ui/Button";
import { PillButton } from "@/components/ui/PillButton";

export default function ProfilePage() {
  const session = authClient.useSession();
  const user = session.data?.user as { name?: string; email?: string } | undefined;
  const { data, loading, error, reload } = useResource<AccountProfile>("/account/profile");

  return (
    <div>
      <SectionHeading title="Profile" description="Your details and preferences." />
      {loading ? <Loading variant="card" /> : null}
      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {data ? (
        <div className="flex flex-col gap-5">
          <Card className="p-6">
            <h2 className="mb-4 font-display text-lg text-ink">Account</h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted">Name</dt>
                <dd className="text-ink">{user?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="text-ink">{user?.email ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              Name, email and sign-in methods are managed from the avatar menu (top right).
            </p>
          </Card>

          {/* Mounted only once data exists, so the form initialises from it directly. */}
          <PreferencesForm initial={data} />
        </div>
      ) : null}
    </div>
  );
}

function PreferencesForm({ initial }: { initial: AccountProfile }) {
  const [units, setUnits] = useState<AccountUnits>(initial.preferredUnits);
  const [marketing, setMarketing] = useState(initial.marketingOptIn);
  const [orderUpdates, setOrderUpdates] = useState(initial.orderUpdatesOptIn);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await apiFetch("/account/profile", {
        method: "PATCH",
        body: JSON.stringify({
          preferredUnits: units,
          marketingOptIn: marketing,
          orderUpdatesOptIn: orderUpdates,
        }),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch {
      setSaveError("We couldn’t save your changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-display text-lg text-ink">Preferences</h2>

      <div className="mb-5">
        <p className="mb-2 text-sm text-body">Preferred distance units</p>
        <div className="flex gap-2">
          <PillButton active={units === "mi"} onClick={() => setUnits("mi")}>
            Miles
          </PillButton>
          <PillButton active={units === "km"} onClick={() => setUnits("km")}>
            Kilometres
          </PillButton>
        </div>
      </div>

      <Toggle
        label="Order updates"
        description="Emails about your order status and shipping."
        checked={orderUpdates}
        onChange={setOrderUpdates}
      />
      <Toggle
        label="Product news & offers"
        description="Occasional emails about new templates and promotions."
        checked={marketing}
        onChange={setMarketing}
      />

      <div className="mt-5 flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
        {saved ? <span className="text-sm text-success">Saved</span> : null}
      </div>
      {saveError ? <div className="mt-3"><ErrorNote message={saveError} /></div> : null}
    </Card>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 border-t border-hairline py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[var(--color-ink)]"
      />
      <span>
        <span className="block text-sm text-ink">{label}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
    </label>
  );
}
