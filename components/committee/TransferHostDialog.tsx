"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";

interface Admin {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
}

interface Props {
  sessionId: string;
  currentHostId: string;
  onClose: () => void;
  onTransferred: () => void;
}

export function TransferHostDialog({ sessionId, currentHostId, onClose, onTransferred }: Props) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>("");
  const [reason, setReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/school/team", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { members?: Admin[] };
        const admins = (data.members ?? []).filter(
          (m) => (m.role === "school_admin" || m.role === "platform_admin") && m.id !== currentHostId,
        );
        setAdmins(admins);
      }
      setLoading(false);
    })();
  }, [currentHostId]);

  async function transfer() {
    if (!selected) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/school/committee/sessions/${sessionId}/transfer-host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_host_user_id: selected, reason: reason.trim() || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Transfer failed", "error");
        return;
      }
      toast("Host transferred", "success");
      onTransferred();
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg border border-lift-border bg-surface p-6">
        <h2 className="text-lg font-bold">Transfer host</h2>
        <p className="mt-1 text-xs text-muted">
          Pick the admin who will take over recording decisions. The transfer is logged in audit.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-muted">Loading admins…</p>
        ) : admins.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            No other school or platform admins available to transfer to.
          </p>
        ) : (
          <>
            <label className="mt-4 block text-[11px] font-medium text-muted">
              New host
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-1 w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
              >
                <option value="">Select an admin…</option>
                {admins.map((a) => {
                  const name = [a.first_name, a.last_name].filter(Boolean).join(" ") || a.email;
                  return (
                    <option key={a.id} value={a.id}>
                      {name} · {a.role.replace("_", " ")}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="mt-3 block text-[11px] font-medium text-muted">
              Reason (optional, logged in audit)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Why is the host being transferred?"
                className="mt-1 w-full rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
              />
            </label>
          </>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={transfer}
            disabled={transferring || !selected}
            className="min-h-[44px] flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {transferring ? "Transferring…" : "Transfer host"}
          </button>
          <button
            onClick={onClose}
            disabled={transferring}
            className="min-h-[44px] flex-1 rounded-md border border-lift-border bg-surface px-3 py-2 text-sm font-medium text-lift-text hover:bg-primary/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
