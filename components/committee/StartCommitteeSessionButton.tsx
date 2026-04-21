"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";

interface Props {
  tenantCycleId: string | null;
  selectedCandidateIds: string[];
  disabled?: boolean;
}

export function StartCommitteeSessionButton({
  tenantCycleId,
  selectedCandidateIds,
  disabled = false,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`Committee Session — ${new Date().toLocaleDateString()}`);
  const [creating, setCreating] = useState(false);

  const canStart = !disabled && !!tenantCycleId && selectedCandidateIds.length > 0;

  async function startSession() {
    if (!tenantCycleId) {
      toast("Select a cycle before starting a session", "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/school/committee/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cycle_id: tenantCycleId,
          name,
          candidate_ids: selectedCandidateIds,
        }),
      });
      if (res.status === 409) {
        const err = await res.json();
        toast(err.message ?? "An active session already exists for this cycle.", "error");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Could not start session", "error");
        return;
      }
      const data = (await res.json()) as { session: { id: string } };
      router.push(`/school/briefing/session/${data.session.id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!canStart}
        title={
          !tenantCycleId
            ? "Select a specific cycle first"
            : selectedCandidateIds.length === 0
              ? "Select at least one candidate"
              : "Start a committee session with selected candidates"
        }
        className="min-h-[40px] rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Start committee session ({selectedCandidateIds.length})
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-lift-border bg-surface p-6">
            <h2 className="text-lg font-bold">Start committee session</h2>
            <p className="mt-1 text-xs text-muted">
              Deliberating <strong className="text-lift-text">{selectedCandidateIds.length}</strong>{" "}
              candidate{selectedCandidateIds.length === 1 ? "" : "s"}. You&apos;ll be the session host —
              other admins can observe, only you can record decisions.
            </p>

            <label className="mt-4 block text-[11px] font-medium text-muted">
              Session name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
              />
            </label>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={startSession}
                disabled={creating}
                className="min-h-[44px] flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {creating ? "Starting…" : "Start session"}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={creating}
                className="min-h-[44px] flex-1 rounded-md border border-lift-border bg-surface px-3 py-2 text-sm font-medium text-lift-text hover:bg-primary/5"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
