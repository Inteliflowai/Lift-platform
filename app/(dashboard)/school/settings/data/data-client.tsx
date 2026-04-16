"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Clock, AlertTriangle, Shield } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";

type Cycle = { id: string; name: string };
type ExportRequest = {
  id: string;
  export_type: string;
  status: string;
  file_size_bytes: number | null;
  download_url: string | null;
  download_url_expires_at: string | null;
  record_counts: Record<string, number> | null;
  error_message: string | null;
  created_at: string;
};

export function DataPrivacyClient({
  retentionDays,
  cycles,
  exports: initialExports,
}: {
  retentionDays: number;
  cycles: Cycle[];
  exports: ExportRequest[];
}) {
  const router = useRouter();
  const [exportType, setExportType] = useState("full");
  const [cycleId, setCycleId] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);

  async function handleExport() {
    setRequesting(true);
    setRequestMsg(null);
    const res = await fetch("/api/exports/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        export_type: exportType,
        cycle_id: exportType === "cycle" ? cycleId : undefined,
      }),
    });
    const data = await res.json();
    setRequesting(false);
    setRequestMsg(data.message ?? "Export requested.");
    router.refresh();
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const retentionYears = Math.round(retentionDays / 365);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <BackButton href="/school/settings" label="Settings" />
      <h1 className="text-2xl font-bold">Data & Privacy</h1>

      {/* FERPA Notice */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Shield size={18} className="mt-0.5 shrink-0 text-primary" />
        <div className="text-xs text-lift-text leading-relaxed">
          <strong>FERPA Compliance:</strong> Your school owns all candidate data.
          Data is never used to train AI models. You can export or delete your
          data at any time.
        </div>
      </div>

      {/* Data Export */}
      <div className="rounded-lg border border-lift-border bg-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-primary" />
          <h2 className="text-sm font-semibold">Data Export</h2>
        </div>
        <p className="text-xs text-muted">
          Export all your school&apos;s data as a ZIP file. Includes candidate
          records, sessions, insight profiles, evaluator reviews, and audit logs.
        </p>

        <div className="space-y-3">
          <div className="flex gap-2">
            {["full", "candidates_only", "cycle"].map((t) => (
              <button
                key={t}
                onClick={() => setExportType(t)}
                className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                  exportType === t
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-lift-border text-muted hover:text-lift-text"
                }`}
              >
                {t === "full"
                  ? "Full Export"
                  : t === "candidates_only"
                  ? "Candidates Only"
                  : "By Cycle"}
              </button>
            ))}
          </div>

          {exportType === "cycle" && (
            <select
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              className="w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm outline-none focus:border-primary"
            >
              <option value="">Select a cycle...</option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExport}
            disabled={requesting || (exportType === "cycle" && !cycleId)}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {requesting ? "Requesting..." : "Request Export"}
          </button>

          {requestMsg && (
            <p className="text-xs text-success">{requestMsg}</p>
          )}
        </div>
      </div>

      {/* Export History */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="mb-3 text-sm font-semibold">Export History</h2>
        {initialExports.length === 0 ? (
          <p className="text-xs text-muted">No exports yet.</p>
        ) : (
          <div className="space-y-2">
            {initialExports.map((ex) => {
              const isExpired =
                ex.download_url_expires_at &&
                new Date(ex.download_url_expires_at) < new Date();

              return (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-md border border-lift-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {ex.export_type.replace("_", " ")} export
                    </p>
                    <p className="text-xs text-muted">
                      {new Date(ex.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                      {ex.file_size_bytes
                        ? ` · ${formatBytes(ex.file_size_bytes)}`
                        : ""}
                    </p>
                  </div>
                  <div>
                    {ex.status === "complete" && !isExpired && ex.download_url ? (
                      <a
                        href={ex.download_url}
                        className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        <Download size={12} /> Download
                      </a>
                    ) : ex.status === "complete" && isExpired ? (
                      <span className="text-xs text-muted">Expired</span>
                    ) : ex.status === "processing" || ex.status === "queued" ? (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Clock size={12} className="animate-spin" /> Processing...
                      </span>
                    ) : ex.status === "failed" ? (
                      <span className="flex items-center gap-1 text-xs text-review">
                        <AlertTriangle size={12} /> Failed
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Data Retention */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-muted" />
          <h2 className="text-sm font-semibold">Data Retention</h2>
        </div>
        <p className="mt-2 text-xs text-muted">
          Data is retained for <strong>{retentionYears} year{retentionYears !== 1 ? "s" : ""}</strong> ({retentionDays} days).
          Contact us to change your retention policy.
        </p>
      </div>

      {/* Account Deletion */}
      <div className="rounded-lg border border-lift-border bg-surface p-5">
        <h2 className="text-sm font-semibold">Account Deletion</h2>
        <p className="mt-2 text-xs text-muted">
          Deleting your account permanently removes all data and cannot be undone.
          Data exports must be requested before deletion.
        </p>
        <a
          href="mailto:lift@inteliflowai.com?subject=LIFT%20Account%20Deletion%20Request"
          className="mt-3 inline-block text-xs text-review hover:underline"
        >
          Request Account Deletion
        </a>
      </div>
    </div>
  );
}
