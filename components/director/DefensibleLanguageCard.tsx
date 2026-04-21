"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/Toast";

type Decision = "admit" | "waitlist" | "decline";

interface Cache {
  admit?: string;
  waitlist?: string;
  decline?: string;
  edited_versions?: Array<{ decision: Decision; text: string; actor_id: string; ts: string }>;
  generated_at?: string;
  signal_snapshot_hash?: string;
  model?: string;
  prompt_version?: string;
  fallback_used?: boolean;
}

interface Permissions {
  can_view: boolean;
  can_copy: boolean;
  can_edit: boolean;
  can_download: boolean;
  can_regenerate: boolean;
  read_only_evaluator?: boolean;
}

interface Payload {
  candidate_id: string;
  status: string | null;
  cache: Cache;
  updated_at: string | null;
  model: string | null;
  signal_hash: string | null;
  permissions: Permissions;
}

const DECISION_META: Record<Decision, { label: string; tone: string; pill: string }> = {
  admit:    { label: "Admit",    tone: "border-emerald-500/40 bg-emerald-500/5", pill: "bg-emerald-500/10 text-emerald-400" },
  waitlist: { label: "Waitlist", tone: "border-amber-500/40 bg-amber-500/5",     pill: "bg-amber-500/10 text-amber-400" },
  decline:  { label: "Decline",  tone: "border-rose-500/40 bg-rose-500/5",       pill: "bg-rose-500/10 text-rose-400" },
};

// Candidate statuses that indicate the committee has NOT yet reviewed the case.
const PRE_COMMITTEE_STATUSES = new Set([
  "invited", "consent_pending", "active", "completed", "flagged", "reviewed",
]);

export function DefensibleLanguageCard({ candidateId }: { candidateId: string }) {
  const { toast } = useToast();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDecision, setActiveDecision] = useState<Decision>("admit");
  const [editing, setEditing] = useState<Decision | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/defensible-language`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as Payload;
        setPayload(data);
      }
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentText = useMemo(() => {
    if (!payload) return "";
    // Most recent edit for the active decision wins over AI text.
    const edits = (payload.cache.edited_versions ?? []).filter((e) => e.decision === activeDecision);
    if (edits.length > 0) return edits[edits.length - 1].text;
    return payload.cache[activeDecision] ?? "";
  }, [payload, activeDecision]);

  const usingEditedVersion = useMemo(() => {
    if (!payload) return false;
    return (payload.cache.edited_versions ?? []).some((e) => e.decision === activeDecision);
  }, [payload, activeDecision]);

  const preCommittee = useMemo(() => {
    if (!payload?.status) return false;
    return PRE_COMMITTEE_STATUSES.has(payload.status);
  }, [payload]);

  async function handleCopy() {
    if (!payload?.permissions.can_copy) return;
    try {
      await navigator.clipboard.writeText(currentText);
      toast("Copied to clipboard", "success");
      await fetch(`/api/candidates/${candidateId}/defensible-language/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: activeDecision,
          version: usingEditedVersion ? "edited" : "ai",
        }),
      });
    } catch {
      toast("Copy failed", "error");
    }
  }

  function handleDownload() {
    if (!payload?.permissions.can_download) return;
    const blob = new Blob([currentText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-language-${activeDecision}-${candidateId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleRegenerate() {
    if (!payload?.permissions.can_regenerate) return;
    setRegenerating(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/defensible-language`, {
        method: "POST",
      });
      if (res.ok) {
        toast("Language regenerated", "success");
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error ?? "Regeneration failed", "error");
      }
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveEdit() {
    if (!editing || !payload?.permissions.can_edit) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/defensible-language/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision: editing, text: draft }),
      });
      if (res.ok) {
        toast("Edit saved", "success");
        setEditing(null);
        setDraft("");
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        if (err.rejected_phrase) {
          toast(`Edit rejected: "${err.rejected_phrase}" (${err.category})`, "error");
        } else {
          toast(err.error ?? "Save failed", "error");
        }
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <p className="text-sm text-muted">Loading decision language…</p>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6">
        <p className="text-sm text-muted">Could not load decision language.</p>
      </div>
    );
  }

  const hasAnyLanguage = !!(payload.cache.admit || payload.cache.waitlist || payload.cache.decline);

  if (!hasAnyLanguage) {
    const preCompletion = payload.status
      ? ["invited", "consent_pending", "active"].includes(payload.status)
      : false;
    return (
      <div className="rounded-lg border border-lift-border bg-surface p-6 space-y-3">
        <h3 className="text-sm font-semibold">Decision Language</h3>
        {preCompletion ? (
          <p className="text-sm text-muted">
            This candidate hasn&apos;t completed their assessment yet. Decision language is
            generated automatically once the assessment pipeline finishes. Current status:{" "}
            <span className="capitalize text-lift-text">{payload.status?.replace("_", " ")}</span>.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Decision language will be generated automatically after the assessment pipeline
            completes. If the pipeline has already finished for this candidate, you can trigger
            a manual generation below.
          </p>
        )}
        {!preCompletion && payload.permissions.can_regenerate && (
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {regenerating ? "Generating…" : "Generate Decision Language"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Pre-committee warning banner */}
      {preCommittee && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <strong>Not for external use until committee review is complete.</strong>{" "}
          This language is pre-drafted for reference only — do not send to families until the
          admissions committee has deliberated this case.
        </div>
      )}

      {/* Fallback-used indicator */}
      {payload.cache.fallback_used && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
          <strong>Safe template used. Review before sending.</strong>{" "}
          AI generation did not pass the content guardrails on one or more versions; a
          deterministic safe template was substituted. Review the text carefully before any
          external use.
        </div>
      )}

      {/* Read-only notice for evaluators */}
      {payload.permissions.read_only_evaluator && (
        <div className="rounded-lg border border-lift-border bg-surface/60 px-4 py-2 text-[11px] text-muted">
          Read-only view. Decision language is an admissions-authority output. Only school
          administrators can copy, edit, download, or regenerate.
        </div>
      )}

      {/* Tab header */}
      <div className="flex gap-1 border-b border-lift-border">
        {(Object.keys(DECISION_META) as Decision[]).map((d) => (
          <button
            key={d}
            onClick={() => {
              setActiveDecision(d);
              setEditing(null);
            }}
            className={`px-4 py-2 text-sm font-medium ${
              activeDecision === d
                ? "border-b-2 border-primary text-primary"
                : "text-muted hover:text-lift-text"
            }`}
          >
            <span className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${DECISION_META[d].pill}`}>
              {DECISION_META[d].label}
            </span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className={`rounded-lg border-2 ${DECISION_META[activeDecision].tone} p-5`}>
        {editing === activeDecision ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={6}
              className="w-full rounded-md border border-lift-border bg-surface px-3 py-2 text-sm text-lift-text"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={saving || draft.trim() === ""}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save edit"}
              </button>
              <button
                onClick={() => {
                  setEditing(null);
                  setDraft("");
                }}
                className="rounded-md border border-lift-border px-3 py-1.5 text-xs text-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-lift-text">
              {currentText}
            </p>
            {usingEditedVersion && (
              <p className="mt-3 text-[10px] text-muted">
                Using edited version · most recent edit shown
              </p>
            )}
          </>
        )}
      </div>

      {/* Actions — admin only */}
      {!payload.permissions.read_only_evaluator && editing === null && (
        <div className="flex flex-wrap gap-2">
          {payload.permissions.can_copy && (
            <button
              onClick={handleCopy}
              className="rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-primary/5 hover:text-primary"
            >
              📋 Copy
            </button>
          )}
          {payload.permissions.can_download && (
            <button
              onClick={handleDownload}
              className="rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-primary/5 hover:text-primary"
            >
              ⬇ Download .txt
            </button>
          )}
          {payload.permissions.can_edit && (
            <button
              onClick={() => {
                setEditing(activeDecision);
                setDraft(currentText);
              }}
              className="rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-primary/5 hover:text-primary"
            >
              ✏️ Edit
            </button>
          )}
          {payload.permissions.can_regenerate && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="rounded-md border border-lift-border bg-surface px-3 py-1.5 text-xs font-medium text-lift-text hover:bg-primary/5 hover:text-primary disabled:opacity-50"
            >
              {regenerating ? "Regenerating…" : "🔄 Regenerate"}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-muted">
        <span>
          {payload.cache.generated_at ? (
            <>Generated {new Date(payload.cache.generated_at).toLocaleString()}</>
          ) : (
            "Not yet generated"
          )}
        </span>
        <span className="font-mono">
          {payload.model ?? "—"} · {payload.cache.prompt_version ?? "—"}
        </span>
      </div>
    </div>
  );
}
