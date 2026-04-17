"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState, EmptyCandidatesIcon } from "@/components/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { useToast } from "@/components/ui/Toast";

type Session = {
  status: string;
  completion_pct: number;
  last_activity_at: string | null;
};

type Invite = {
  id: string;
  token: string;
  status: string;
  expires_at: string | null;
  sent_at: string | null;
};

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
  grade_applying_to: string;
  status: string;
  created_at: string;
  sessions: Session[];
  invites: Invite[];
};

export function CandidateListClient({
  candidates,
}: {
  candidates: Candidate[];
}) {
  const router = useRouter();
  const { t } = useLocale();
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [groupByGrade, setGroupByGrade] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkSending, setBulkSending] = useState(false);
  const { toast } = useToast();

  const filtered = candidates.filter((c) => {
    if (
      search &&
      !`${c.first_name} ${c.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
      return false;
    if (gradeFilter && c.grade_applying_to !== gradeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (flaggedOnly && c.status !== "flagged") return false;
    return true;
  });

  // Candidates with unsent invites (imported but not emailed)
  function hasUnsentInvite(c: Candidate): boolean {
    return (c.invites ?? []).some((i) => i.status === "pending" && !i.sent_at);
  }

  const unsentSelected = Array.from(selected).filter((id) => {
    const c = candidates.find((c) => c.id === id);
    return c && hasUnsentInvite(c);
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleResend(candidateId: string) {
    setResending(candidateId);
    await fetch(`/api/school/candidates/${candidateId}/resend-invite`, {
      method: "POST",
    });
    setResending(null);
    router.refresh();
  }

  async function handleBulkSend() {
    if (unsentSelected.length === 0) return;
    setBulkSending(true);
    try {
      const res = await fetch("/api/school/candidates/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: unsentSelected }),
      });
      const data = await res.json();
      const sent = data.sent ?? 0;
      const skipped = data.skipped ?? 0;
      if (sent > 0) toast(`${sent} invitation${sent !== 1 ? "s" : ""} sent${skipped > 0 ? ` (${skipped} already sent)` : ""}`);
      else if (skipped > 0) toast(`${skipped} already sent — no new invitations`, "info");
      setSelected(new Set());
      router.refresh();
    } catch {
      toast("Failed to send invitations", "error");
    } finally {
      setBulkSending(false);
    }
  }

  async function handleSendSingle(candidateId: string) {
    setResending(candidateId);
    try {
      await fetch("/api/school/candidates/bulk-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds: [candidateId] }),
      });
      toast("Invitation sent");
      router.refresh();
    } catch {
      toast("Failed to send invitation", "error");
    } finally {
      setResending(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("candidates.title")}</h1>
        <div className="flex gap-2">
          <Link
            href="/school/candidates/import"
            className="rounded-md border border-lift-border px-4 py-2 text-sm font-medium text-muted hover:text-lift-text"
          >
            {t("candidates.import")}
          </Link>
          <Link
            href="/school/candidates/invite"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t("candidates.invite")}
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("candidates.search")}
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
        />
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
        >
          <option value="">All Grades</option>
          {["6", "7", "8", "9", "10", "11"].map((g) => (
            <option key={g} value={g}>Grade {g}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
        >
          <option value="">All Statuses</option>
          <option value="invited">Invited</option>
          <option value="consent_pending">Consent Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="flagged">Flagged</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="rounded"
          />
          {t("candidates.flagged_only")}
        </label>
        <label className="flex items-center gap-2 text-sm text-muted ml-auto">
          <input
            type="checkbox"
            checked={groupByGrade}
            onChange={(e) => setGroupByGrade(e.target.checked)}
            className="rounded accent-primary"
          />
          {t("candidates.grade_col") || "Grade"}
        </label>
      </div>

      {/* Grade summary */}
      {candidates.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {["6", "7", "8", "9", "10", "11"].map((grade) => {
            const count = candidates.filter((c) => c.grade_applying_to === grade).length;
            if (count === 0) return null;
            const completed = candidates.filter((c) => c.grade_applying_to === grade && c.status === "completed").length;
            return (
              <div
                key={grade}
                className={`rounded-lg border px-4 py-2 text-xs cursor-pointer transition-colors ${
                  gradeFilter === grade
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-lift-border text-muted hover:border-primary/30"
                }`}
                onClick={() => setGradeFilter(gradeFilter === grade ? "" : grade)}
              >
                <span className="font-semibold">Grade {grade}</span>
                <span className="ml-2">{count} {t("candidates.title").toLowerCase()}</span>
                {completed > 0 && (
                  <span className="ml-1 text-success">({completed} {t("analytics.completed").toLowerCase()})</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium text-primary">
            {selected.size} candidate{selected.size !== 1 ? "s" : ""} selected
            {unsentSelected.length > 0 && unsentSelected.length < selected.size && (
              <span className="ml-1 text-muted">({unsentSelected.length} with unsent invites)</span>
            )}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-md border border-lift-border px-3 py-1.5 text-xs font-medium text-muted hover:text-lift-text"
            >
              Clear
            </button>
            {unsentSelected.length > 0 && (
              <button
                onClick={handleBulkSend}
                disabled={bulkSending}
                className="rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {bulkSending
                  ? "Sending..."
                  : `Send ${unsentSelected.length} Invitation${unsentSelected.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {candidates.length === 0 && (
        <EmptyState
          icon={<EmptyCandidatesIcon />}
          title={t("candidates.empty_title")}
          description={t("candidates.empty_desc")}
          action={{ label: t("candidates.empty_action"), href: "/school/candidates/invite" }}
          secondaryAction={{ label: t("cycles.empty_action"), href: "/school/cycles/new" }}
        />
      )}

      {/* Table */}
      {candidates.length > 0 && <div className="overflow-x-auto rounded-lg border border-lift-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-lift-border bg-surface text-xs text-muted">
            <tr>
              <th className="px-3 py-3 font-medium w-8">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded accent-primary"
                />
              </th>
              <th className="px-4 py-3 font-medium">{t("candidates.name")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.grade_col") || "Grade"}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.status_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.completion_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.last_activity_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.actions_col")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {(() => {
              const grades = groupByGrade ? ["6", "7", "8", "9", "10", "11"] : [null];
              return grades.map((grade) => {
                const group = grade ? filtered.filter((c) => c.grade_applying_to === grade) : filtered;
                if (group.length === 0) return null;
                return [
                  grade && groupByGrade ? (
                    <tr key={`header-${grade}`}>
                      <td colSpan={7} className="bg-page-bg px-4 py-2">
                        <span className="text-xs font-semibold text-primary">
                          Grade {grade}
                        </span>
                        <span className="ml-2 text-xs text-muted">
                          ({group.length})
                        </span>
                      </td>
                    </tr>
                  ) : null,
                  ...group.map((c) => {
              const sortedSessions = [...(c.sessions ?? [])].sort(
                (a, b) => Number(b.completion_pct) - Number(a.completion_pct)
              );
              const latestSession = sortedSessions[0];
              const completion = latestSession
                ? `${latestSession.completion_pct}%`
                : "—";
              const lastActivity = latestSession?.last_activity_at
                ? new Date(latestSession.last_activity_at).toLocaleString()
                : "—";
              const hasPendingInvite = c.invites?.some(
                (i) => i.status === "pending"
              );
              const isUnsent = hasUnsentInvite(c);
              const latestInvite = c.invites?.[0];

              return (
                <tr key={c.id} className={`hover:bg-surface/50 ${selected.has(c.id) ? "bg-primary/[0.03]" : ""}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/school/candidates/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">Grade {c.grade_applying_to}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                    {isUnsent && (
                      <span className="ml-2 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
                        Not sent
                      </span>
                    )}
                    {!isUnsent && latestInvite?.sent_at && (c.status === "invited" || c.status === "consent_pending") && (
                      <span className="ml-2 text-[10px] text-muted">
                        Sent {new Date(latestInvite.sent_at).toLocaleDateString()}
                      </span>
                    )}
                    {(c.status === "invited" || c.status === "consent_pending") && latestInvite?.token && (
                      <a
                        href={`/invite/${latestInvite.token}`}
                        target="_blank"
                        className="ml-2 text-[10px] text-[#14b8a6] hover:underline"
                      >
                        Open invite
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3">{completion}</td>
                  <td className="px-4 py-3 text-muted">{lastActivity}</td>
                  <td className="px-4 py-3 space-x-2">
                    <Link
                      href={`/school/candidates/${c.id}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View
                    </Link>
                    {isUnsent && (
                      <button
                        onClick={() => handleSendSingle(c.id)}
                        disabled={resending === c.id}
                        className="text-xs font-semibold text-success hover:text-success/80 disabled:opacity-50"
                      >
                        {resending === c.id ? "Sending..." : "Send Invite"}
                      </button>
                    )}
                    {hasPendingInvite && !isUnsent && (
                      <>
                        <button
                          onClick={() => {
                            const inviteToken = c.invites?.find((i) => i.status === "pending")?.token;
                            if (inviteToken) {
                              const url = `${window.location.origin}/invite/${inviteToken}`;
                              navigator.clipboard.writeText(url);
                            }
                          }}
                          className="text-xs text-[#14b8a6] hover:underline"
                        >
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleResend(c.id)}
                          disabled={resending === c.id}
                          className="text-xs text-warning hover:text-warning/80 disabled:opacity-50"
                        >
                          {resending === c.id ? "Sending..." : "Resend"}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            }),
                ];
              });
            })()}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No candidates found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    invited: "bg-primary/10 text-primary",
    consent_pending: "bg-warning/10 text-warning",
    active: "bg-success/10 text-success",
    completed: "bg-success/10 text-success",
    flagged: "bg-review/10 text-review",
    reviewed: "bg-muted/10 text-muted",
    archived: "bg-muted/10 text-muted",
  };

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-muted/10 text-muted"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
