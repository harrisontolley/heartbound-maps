"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { apiFetch } from "@/lib/apiClient";
import { Card, SectionHeading } from "@/components/account/Card";
import { ErrorNote } from "@/components/account/States";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function exportData() {
    setExporting(true);
    setExportError(null);
    try {
      const res = await apiFetch("/account/export", { method: "POST" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "heartbound-account.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("We couldn’t prepare your data. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Clear app-owned data (orders are retained but disassociated for records).
      const res = await apiFetch("/account/delete", { method: "POST" });
      if (!res.ok) throw new Error();
      await authClient.signOut();
      router.replace("/");
    } catch {
      setDeleteError("We couldn’t delete your account. Please try again.");
      setDeleting(false);
    }
  }

  return (
    <div>
      <SectionHeading title="Settings" description="Manage your data and account." />

      <div className="flex flex-col gap-5">
        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Security & sign-in</h2>
          <p className="mt-2 text-sm text-muted">
            Change your name, email, password, and connected accounts (like Google) from the
            avatar menu at the top right.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="font-display text-lg text-ink">Export your data</h2>
          <p className="mt-2 text-sm text-muted">
            Download a JSON copy of your profile, addresses, orders, and rewards.
          </p>
          <div className="mt-4">
            <Button variant="outline" onClick={exportData} disabled={exporting}>
              {exporting ? "Preparing…" : "Download my data"}
            </Button>
          </div>
          {exportError ? <div className="mt-3"><ErrorNote message={exportError} /></div> : null}
        </Card>

        <Card className="border-error/30 p-6">
          <h2 className="font-display text-lg text-ink">Delete account</h2>
          <p className="mt-2 text-sm text-muted">
            Permanently removes your profile, saved addresses, and rewards, and signs you out.
            Past orders are kept (disassociated) for financial records.
          </p>
          <div className="mt-4">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-ink">Are you sure? This can&apos;t be undone.</span>
                <Button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="bg-error text-on-primary hover:bg-error"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </Button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-sm text-muted hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="h-10 rounded-pill border border-error px-5 text-[15px] text-error hover:bg-error hover:text-on-primary"
              >
                Delete my account
              </button>
            )}
          </div>
          {deleteError ? <div className="mt-3"><ErrorNote message={deleteError} /></div> : null}
        </Card>
      </div>
    </div>
  );
}
