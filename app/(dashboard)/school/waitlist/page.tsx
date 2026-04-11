"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/EmptyState";

type WaitlistEntry = {
  id: string;
  candidate_id: string;
  rank_position: number;
  tri_score: number;
  recommendation_tier: string | null;
  evaluator_notes: string | null;
  status: string;
  internal_notes: string | null;
  offered_at: string | null;
  responded_at: string | null;
  created_at: string;
  candidates: {
    first_name: string;
    last_name: string;
    grade_band: string;
    gender: string | null;
  };
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  waitlisted: { bg: "bg-warning/10", text: "text-warning" },
  offered: { bg: "bg-primary/10", text: "text-primary" },
  accepted: { bg: "bg-success/10", text: "text-success" },
  declined: { bg: "bg-review/10", text: "text-review" },
  expired: { bg: "bg-muted/10", text: "text-muted" },
};

export default function WaitlistPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/school/waitlist")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleStatusChange(entryId: string, newStatus: string) {
    await fetch("/api/school/waitlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_id: entryId, status: newStatus }),
    });
    router.refresh();
    // Reload entries
    const res = await fetch("/api/school/waitlist");
    setEntries(await res.json());
  }

  if (loading) {
    return <div className="py-16 text-center text-muted">Loading waitlist...</div>;
  }

  const waitlisted = entries.filter((e) => e.status === "waitlisted");
  const offered = entries.filter((e) => e.status === "offered");
  const resolved = entries.filter((e) => ["accepted", "declined", "expired"].includes(e.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Waitlist</h1>
          <p className="text-sm text-muted">
            Ranked by TRI score. Highest readiness scores are at the top.
          </p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="rounded-full bg-warning/10 px-3 py-1 text-warning font-medium">
            {waitlisted.length} waitlisted
          </span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary font-medium">
            {offered.length} offered
          </span>
          <span className="rounded-full bg-success/10 px-3 py-1 text-success font-medium">
            {resolved.filter((e) => e.status === "accepted").length} accepted
          </span>
        </div>
      </div>

      {entries.length === 0 && (
        <EmptyState
          icon={
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="15" y="15" width="50" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
              <line x1="25" y1="30" x2="55" y2="30" stroke="currentColor" strokeWidth="1.5" />
              <line x1="25" y1="40" x2="55" y2="40" stroke="currentColor" strokeWidth="1.5" />
              <line x1="25" y1="50" x2="45" y2="50" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="55" cy="55" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M52 55l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          }
          title="No waitlisted candidates"
          description="Candidates marked as waitlisted during review will appear here, ranked by their TRI score."
        />
      )}

      {/* Waitlisted */}
      {waitlisted.length > 0 && (
        <div className="rounded-lg border border-lift-border bg-surface overflow-hidden">
          <div className="border-b border-lift-border bg-warning/5 px-4 py-2">
            <span className="text-xs font-semibold text-warning">Waitlisted — Ranked by TRI</span>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-lift-border text-xs text-muted">
              <tr>
                <th className="px-4 py-2 font-medium w-12">#</th>
                <th className="px-4 py-2 font-medium">Candidate</th>
                <th className="px-4 py-2 font-medium">Grade</th>
                <th className="px-4 py-2 font-medium">Gender</th>
                <th className="px-4 py-2 font-medium">TRI</th>
                <th className="px-4 py-2 font-medium">Review</th>
                <th className="px-4 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-lift-border">
              {waitlisted.map((e) => (
                <tr key={e.id} className="hover:bg-surface/50">
                  <td className="px-4 py-2 text-center font-bold text-primary">{e.rank_position}</td>
                  <td className="px-4 py-2">
                    <Link href={`/evaluator/candidates/${e.candidate_id}`} className="font-medium text-primary hover:underline">
                      {e.candidates?.first_name} {e.candidates?.last_name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{e.candidates?.grade_band}</td>
                  <td className="px-4 py-2 text-muted capitalize">{e.candidates?.gender?.replace("_", " ") ?? "—"}</td>
                  <td className="px-4 py-2 font-semibold">{Number(e.tri_score).toFixed(0)}</td>
                  <td className="px-4 py-2">
                    {e.recommendation_tier && (
                      <span className="rounded-full bg-muted/10 px-2 py-0.5 text-xs capitalize">
                        {e.recommendation_tier.replace("_", " ")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleStatusChange(e.id, "offered")}
                      className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      Offer Spot
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Offered */}
      {offered.length > 0 && (
        <div className="rounded-lg border border-lift-border bg-surface overflow-hidden">
          <div className="border-b border-lift-border bg-primary/5 px-4 py-2">
            <span className="text-xs font-semibold text-primary">Offers Pending Response</span>
          </div>
          <div className="divide-y divide-lift-border">
            {offered.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link href={`/evaluator/candidates/${e.candidate_id}`} className="font-medium text-primary hover:underline text-sm">
                    {e.candidates?.first_name} {e.candidates?.last_name}
                  </Link>
                  <p className="text-xs text-muted">
                    Grade {e.candidates?.grade_band} · TRI {Number(e.tri_score).toFixed(0)} · Offered {e.offered_at ? new Date(e.offered_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStatusChange(e.id, "accepted")}
                    className="rounded-md bg-success px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                  >
                    Accepted
                  </button>
                  <button
                    onClick={() => handleStatusChange(e.id, "declined")}
                    className="rounded-md border border-review/30 px-3 py-1 text-xs font-medium text-review hover:bg-review/5"
                  >
                    Declined
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolved.length > 0 && (
        <div className="rounded-lg border border-lift-border bg-surface overflow-hidden">
          <div className="border-b border-lift-border bg-page-bg px-4 py-2">
            <span className="text-xs font-semibold text-muted">Resolved</span>
          </div>
          <div className="divide-y divide-lift-border">
            {resolved.map((e) => {
              const sc = STATUS_COLORS[e.status] ?? STATUS_COLORS.expired;
              return (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-medium">{e.candidates?.first_name} {e.candidates?.last_name}</span>
                    <span className="ml-2 text-xs text-muted">Grade {e.candidates?.grade_band}</span>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${sc.bg} ${sc.text}`}>
                    {e.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
