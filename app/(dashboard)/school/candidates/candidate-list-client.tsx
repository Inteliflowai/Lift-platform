"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState, EmptyCandidatesIcon } from "@/components/EmptyState";
import { useLocale } from "@/lib/i18n/LocaleProvider";

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
};

type Candidate = {
  id: string;
  first_name: string;
  last_name: string;
  grade_band: string;
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
  const [gradeBandFilter, setGradeBandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  const filtered = candidates.filter((c) => {
    if (
      search &&
      !`${c.first_name} ${c.last_name}`
        .toLowerCase()
        .includes(search.toLowerCase())
    )
      return false;
    if (gradeBandFilter && c.grade_band !== gradeBandFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (flaggedOnly && c.status !== "flagged") return false;
    return true;
  });

  async function handleResend(candidateId: string) {
    setResending(candidateId);
    await fetch(`/api/school/candidates/${candidateId}/resend-invite`, {
      method: "POST",
    });
    setResending(null);
    router.refresh();
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
          value={gradeBandFilter}
          onChange={(e) => setGradeBandFilter(e.target.value)}
          className="rounded-md border border-lift-border bg-page-bg px-3 py-2 text-sm text-lift-text outline-none focus:border-primary"
        >
          <option value="">All Grades</option>
          <option value="6-7">6-7</option>
          <option value="8">8</option>
          <option value="9-11">9-11</option>
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
          Flagged only
        </label>
      </div>

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
              <th className="px-4 py-3 font-medium">{t("candidates.name")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.grade_band_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.status_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.completion_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.last_activity_col")}</th>
              <th className="px-4 py-3 font-medium">{t("candidates.actions_col")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lift-border">
            {filtered.map((c) => {
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

              return (
                <tr key={c.id} className="hover:bg-surface/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/school/candidates/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.first_name} {c.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{c.grade_band}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                    {(c.status === "invited" || c.status === "consent_pending") && c.invites?.[0]?.token && (
                      <a
                        href={`/invite/${c.invites[0].token}`}
                        target="_blank"
                        className="ml-2 text-[10px] text-[#6366f1] hover:underline"
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
                    {hasPendingInvite && (
                      <>
                        <button
                          onClick={() => {
                            const inviteToken = c.invites?.find((i) => i.status === "pending")?.token;
                            if (inviteToken) {
                              const url = `${window.location.origin}/invite/${inviteToken}`;
                              navigator.clipboard.writeText(url);
                            }
                          }}
                          className="text-xs text-[#6366f1] hover:underline"
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
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
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
