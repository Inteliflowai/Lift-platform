"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DemoControls({
  tenantId,
  isDemo,
  demoActivatedAt,
  tenantName,
}: {
  tenantId: string;
  isDemo: boolean;
  demoActivatedAt: string | null;
  tenantName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function handleActivate() {
    setLoading(true);
    await fetch("/api/admin/demo/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId }),
    });
    setLoading(false);
    setConfirm(false);
    router.refresh();
  }

  async function handleReset(regenerate: boolean) {
    setLoading(true);
    await fetch("/api/admin/demo/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, regenerate }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/5 p-5 space-y-4">
      <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Demo Mode</h2>

      {!isDemo && !confirm && (
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Activate Demo Mode to populate {tenantName} with 18 synthetic
            candidates across all grade bands. Existing real data will NOT be
            affected.
          </p>
          <button
            onClick={() => setConfirm(true)}
            className="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#78350f] hover:bg-[#d97706]"
          >
            Activate Demo Mode
          </button>
        </div>
      )}

      {!isDemo && confirm && (
        <div className="rounded-md border border-[#f59e0b]/50 bg-white p-4 space-y-3">
          <p className="text-sm font-medium">
            This will populate {tenantName} with 18 synthetic candidates (6 per
            grade band). Continue?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleActivate}
              disabled={loading}
              className="rounded-lg bg-[#f59e0b] px-4 py-2 text-sm font-medium text-[#78350f] disabled:opacity-50"
            >
              {loading ? "Generating..." : "Yes, Activate"}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="rounded-lg border border-lift-border px-4 py-2 text-sm text-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isDemo && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#f59e0b]/20 px-3 py-1 text-xs font-medium text-[#92400e]">
              Demo Active
            </span>
            {demoActivatedAt && (
              <span className="text-xs text-muted">
                Since {new Date(demoActivatedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleReset(true)}
              disabled={loading}
              className="rounded-lg border border-[#f59e0b] px-4 py-2 text-sm font-medium text-[#92400e] hover:bg-[#f59e0b]/10 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset & Regenerate"}
            </button>
            <button
              onClick={() => handleReset(false)}
              disabled={loading}
              className="rounded-lg border border-lift-border px-4 py-2 text-sm text-muted hover:text-[#f43f5e] disabled:opacity-50"
            >
              Deactivate Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
