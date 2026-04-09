"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw, Clock, Zap, Shield } from "lucide-react";

type License = {
  tier: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
} | null;

type ResetLogEntry = {
  id: string;
  reset_type: string;
  records_deleted: Record<string, number>;
  notes: string | null;
  performed_at: string;
  users: { full_name: string } | null;
};

export function ResetClient({
  tenantId,
  tenantName,
  tenantSlug,
  tenantStatus,
  license,
  counts,
  resetLog,
}: {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantStatus: string;
  license: License;
  counts: {
    candidates: number;
    completedSessions: number;
    evaluatorReviews: number;
    reportExports: number;
  };
  resetLog: ResetLogEntry[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [extendDays, setExtendDays] = useState(30);
  const [activateTier, setActivateTier] = useState("professional");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  async function handleResetCandidates() {
    setLoading(true);
    const res = await fetch("/api/admin/reset/candidates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, confirm: true }),
    });
    const data = await res.json();
    setLoading(false);
    setModal(null);
    setConfirmText("");
    if (res.ok) {
      showToast(`Reset complete. ${data.total} records deleted.`);
      router.refresh();
    }
  }

  async function handleLicenseAction(action: string) {
    setLoading(true);
    const body: Record<string, unknown> = { tenant_id: tenantId, action };
    if (action === "extend_trial") body.days = extendDays;
    if (action === "activate") body.tier = activateTier;

    const res = await fetch("/api/admin/reset/license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);
    setModal(null);
    setConfirmText("");
    if (res.ok) {
      const msgs: Record<string, string> = {
        reset_to_trial: `License reset to trial. Trial ends ${new Date(data.license?.trial_ends_at).toLocaleDateString()}.`,
        extend_trial: `Trial extended to ${new Date(data.license?.trial_ends_at).toLocaleDateString()}.`,
        activate: `Subscription activated — ${activateTier} until ${new Date(data.license?.current_period_ends_at).toLocaleDateString()}.`,
        suspend: "Account suspended.",
      };
      showToast(msgs[action] ?? "Done.");
      router.refresh();
    }
  }

  async function handleDeleteTenant() {
    setLoading(true);
    const res = await fetch("/api/admin/reset/delete-tenant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, confirm_name: confirmText }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/tenants");
    }
  }

  const dateStr = (d: string | null) =>
    d ? new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Warning banner */}
      <div className="flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4">
        <AlertTriangle size={20} className="shrink-0 text-warning" />
        <p className="text-sm font-medium text-warning">
          You are managing data for <strong>{tenantName}</strong>. These actions are irreversible.
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="rounded-lg bg-success/10 p-3 text-center text-sm font-medium text-success">
          {toast}
        </div>
      )}

      {/* Section 1: Overview */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Tenant Overview</h2>
        <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-muted">School</p>
            <p className="font-medium">{tenantName}</p>
            <p className="text-xs text-muted">{tenantSlug} &middot; {tenantStatus}</p>
          </div>
          <div>
            <p className="text-xs text-muted">License</p>
            <p className="font-medium capitalize">{license?.tier ?? "—"} &middot; {license?.status ?? "—"}</p>
            <p className="text-xs text-muted">
              {license?.status === "trialing"
                ? `Trial ends ${dateStr(license.trial_ends_at)}`
                : `Period ends ${dateStr(license?.current_period_ends_at ?? null)}`}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: "Candidates", value: counts.candidates },
            { label: "Sessions", value: counts.completedSessions },
            { label: "Reviews", value: counts.evaluatorReviews },
            { label: "Reports", value: counts.reportExports },
          ].map((s) => (
            <div key={s.label} className="rounded-md border border-lift-border p-3 text-center">
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-[10px] text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: License Control */}
      <div className="rounded-lg border-l-4 border-l-primary border border-lift-border bg-surface p-5">
        <h2 className="text-lg font-semibold">License Control</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setModal("reset_to_trial")}
            className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-sm font-medium text-warning hover:bg-warning/10 transition-colors"
          >
            <RotateCcw size={16} /> Reset to Trial
          </button>
          <button
            onClick={() => setModal("extend_trial")}
            className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            <Clock size={16} /> Extend Trial
          </button>
          <button
            onClick={() => setModal("activate")}
            className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/5 p-3 text-sm font-medium text-success hover:bg-success/10 transition-colors"
          >
            <Zap size={16} /> Activate Subscription
          </button>
          <button
            onClick={() => setModal("suspend")}
            className="flex items-center gap-2 rounded-lg border border-review/30 bg-review/5 p-3 text-sm font-medium text-review hover:bg-review/10 transition-colors"
          >
            <Shield size={16} /> Suspend Account
          </button>
        </div>
      </div>

      {/* Section 3: Data Reset */}
      <div className="rounded-lg border-l-4 border-l-warning border border-lift-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Data Reset</h2>
        <p className="mt-1 text-xs text-muted">These actions permanently delete data and cannot be undone.</p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-lift-border p-4">
            <div>
              <p className="text-sm font-medium">Reset All Candidate Data</p>
              <p className="text-xs text-muted">Deletes candidates, sessions, reports, cycles. Preserves account and license.</p>
            </div>
            <button
              onClick={() => setModal("reset_candidates")}
              className="rounded-lg bg-warning px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Reset Data
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-review/20 p-4">
            <div>
              <p className="text-sm font-medium text-review">Delete This School Entirely</p>
              <p className="text-xs text-muted">Permanently deletes school, all users, all data, and the license.</p>
            </div>
            <button
              onClick={() => setModal("delete_tenant")}
              className="rounded-lg bg-review px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Delete School
            </button>
          </div>
        </div>
      </div>

      {/* Section 4: Reset History */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Reset History</h2>
        {resetLog.length === 0 ? (
          <p className="text-xs text-muted">No reset actions have been performed for this school.</p>
        ) : (
          <div className="space-y-2">
            {resetLog.map((entry) => {
              const u = entry.users as unknown as { full_name: string } | null;
              const total = Object.values(entry.records_deleted ?? {}).reduce((s, n) => s + n, 0);
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-md border border-lift-border p-3 text-xs">
                  <div>
                    <span className="font-mono bg-page-bg px-1.5 py-0.5 rounded text-[10px]">
                      {entry.reset_type}
                    </span>
                    <span className="ml-2 text-muted">
                      by {u?.full_name ?? "System"}
                    </span>
                    {entry.notes && <span className="ml-2 text-muted italic">{entry.notes}</span>}
                  </div>
                  <div className="text-right text-muted">
                    {total > 0 && <span className="mr-2">{total} records</span>}
                    {new Date(entry.performed_at).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-lift-border bg-white p-6 shadow-xl">
            {modal === "reset_to_trial" && (
              <>
                <h3 className="text-lg font-semibold">Reset to Trial</h3>
                <p className="mt-2 text-sm text-muted">
                  This will reset <strong>{tenantName}</strong> back to a 30-day trial. Existing data will NOT be deleted.
                </p>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 rounded-lg border border-lift-border py-2 text-sm font-medium text-muted hover:bg-surface">Cancel</button>
                  <button onClick={() => handleLicenseAction("reset_to_trial")} disabled={loading} className="flex-1 rounded-lg bg-warning py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Resetting..." : "Reset to Trial"}
                  </button>
                </div>
              </>
            )}

            {modal === "extend_trial" && (
              <>
                <h3 className="text-lg font-semibold">Extend Trial</h3>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted">Extend by how many days?</label>
                  <input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} min={1} max={365}
                    className="w-full rounded-lg border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 rounded-lg border border-lift-border py-2 text-sm font-medium text-muted hover:bg-surface">Cancel</button>
                  <button onClick={() => handleLicenseAction("extend_trial")} disabled={loading} className="flex-1 rounded-lg bg-primary py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Extending..." : `Extend ${extendDays} days`}
                  </button>
                </div>
              </>
            )}

            {modal === "activate" && (
              <>
                <h3 className="text-lg font-semibold">Activate Subscription</h3>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted">Select tier</label>
                  <select value={activateTier} onChange={(e) => setActivateTier(e.target.value)}
                    className="w-full rounded-lg border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary">
                    <option value="essentials">Essentials</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <p className="mt-2 text-xs text-muted">Activate <strong>{tenantName}</strong> on {activateTier} for 1 year.</p>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setModal(null)} className="flex-1 rounded-lg border border-lift-border py-2 text-sm font-medium text-muted hover:bg-surface">Cancel</button>
                  <button onClick={() => handleLicenseAction("activate")} disabled={loading} className="flex-1 rounded-lg bg-success py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Activating..." : "Activate"}
                  </button>
                </div>
              </>
            )}

            {modal === "suspend" && (
              <>
                <h3 className="text-lg font-semibold text-review">Suspend Account</h3>
                <p className="mt-2 text-sm text-muted">
                  Suspend <strong>{tenantName}</strong>? They will lose access immediately but data is retained.
                </p>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted">Type the school name to confirm</label>
                  <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={tenantName}
                    className="w-full rounded-lg border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => { setModal(null); setConfirmText(""); }} className="flex-1 rounded-lg border border-lift-border py-2 text-sm font-medium text-muted hover:bg-surface">Cancel</button>
                  <button onClick={() => handleLicenseAction("suspend")} disabled={loading || confirmText !== tenantName} className="flex-1 rounded-lg bg-review py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Suspending..." : "Suspend"}
                  </button>
                </div>
              </>
            )}

            {modal === "reset_candidates" && (
              <>
                <div className="flex items-center gap-2">
                  <AlertTriangle size={20} className="text-warning" />
                  <h3 className="text-lg font-semibold">Reset All Candidate Data</h3>
                </div>
                <p className="mt-2 text-sm text-muted">This will permanently delete:</p>
                <ul className="mt-1 space-y-1 text-xs text-muted">
                  <li>&bull; {counts.candidates} candidates</li>
                  <li>&bull; {counts.completedSessions} sessions</li>
                  <li>&bull; {counts.evaluatorReviews} evaluator reviews</li>
                  <li>&bull; {counts.reportExports} report exports</li>
                  <li>&bull; All AI runs, signals, task data, and cycles</li>
                </ul>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted">Type the school name to confirm</label>
                  <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={tenantName}
                    className="w-full rounded-lg border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => { setModal(null); setConfirmText(""); }} className="flex-1 rounded-lg border border-lift-border py-2 text-sm font-medium text-muted hover:bg-surface">Cancel</button>
                  <button onClick={handleResetCandidates} disabled={loading || confirmText !== tenantName} className="flex-1 rounded-lg bg-warning py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Resetting..." : "Confirm Reset"}
                  </button>
                </div>
              </>
            )}

            {modal === "delete_tenant" && (
              <>
                <div className="rounded-lg bg-review/10 border border-review/20 p-3 mb-3">
                  <p className="text-xs font-semibold text-review">PERMANENT DELETION — This cannot be undone.</p>
                </div>
                <h3 className="text-lg font-semibold text-review">Delete {tenantName}</h3>
                <p className="mt-2 text-sm text-muted">
                  This will delete everything including admin user accounts.
                </p>
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted">Type the school name to confirm</label>
                  <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={tenantName}
                    className="w-full rounded-lg border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-review" />
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => { setModal(null); setConfirmText(""); }} className="flex-1 rounded-lg border border-lift-border py-2 text-sm font-medium text-muted hover:bg-surface">Cancel</button>
                  <button onClick={handleDeleteTenant} disabled={loading || confirmText !== tenantName}
                    className="flex-1 rounded-lg bg-review py-2 text-sm font-semibold text-white disabled:opacity-50">
                    {loading ? "Deleting..." : "Delete Everything"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
