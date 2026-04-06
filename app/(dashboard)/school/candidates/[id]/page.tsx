import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CandidateDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { tenantId } = await getTenantContext();

  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("*")
    .eq("id", params.id)
    .eq("tenant_id", tenantId)
    .single();

  if (!candidate) notFound();

  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("id, status, completion_pct, started_at, completed_at")
    .eq("candidate_id", params.id)
    .order("created_at", { ascending: false });

  const { data: profile } = await supabaseAdmin
    .from("insight_profiles")
    .select("*")
    .eq("candidate_id", params.id)
    .eq("is_final", true)
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  const statusColor: Record<string, string> = {
    invited: "text-primary",
    active: "text-success",
    completed: "text-success",
    flagged: "text-review",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {candidate.first_name} {candidate.last_name}
          </h1>
          <p className="text-sm text-muted">
            Grade {candidate.grade_applying_to} (Band {candidate.grade_band}) —{" "}
            <span className={statusColor[candidate.status] ?? "text-muted"}>
              {candidate.status}
            </span>
          </p>
        </div>
        <Link
          href={`/school/candidates/${params.id}/pipeline`}
          className="rounded-md border border-lift-border px-4 py-2 text-sm text-muted hover:text-lift-text"
        >
          AI Pipeline
        </Link>
      </div>

      {/* Insight Profile */}
      {profile && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Insight Profile</h2>
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-6">
            {[
              { label: "Reading", value: profile.reading_score },
              { label: "Writing", value: profile.writing_score },
              { label: "Reasoning", value: profile.reasoning_score },
              { label: "Reflection", value: profile.reflection_score },
              { label: "Persistence", value: profile.persistence_score },
              { label: "Support", value: profile.support_seeking_score },
            ].map((d) => (
              <div
                key={d.label}
                className="rounded-lg border border-lift-border bg-surface p-3 text-center"
              >
                <p className="text-xs text-muted">{d.label}</p>
                <p className="mt-1 text-xl font-bold">
                  {d.value != null ? Math.round(Number(d.value)) : "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3 text-sm">
            <span className="text-muted">
              Confidence:{" "}
              <span className="text-lift-text">
                {profile.overall_confidence}%
              </span>
            </span>
            {profile.requires_human_review && (
              <span className="rounded-full bg-review/10 px-2 py-0.5 text-xs text-review">
                Needs Review
              </span>
            )}
          </div>

          {profile.low_confidence_flags?.length > 0 && (
            <div className="text-xs text-warning">
              Flags: {profile.low_confidence_flags.join(", ")}
            </div>
          )}

          {/* Narratives */}
          {profile.internal_narrative && (
            <details className="rounded-lg border border-lift-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Internal Report
              </summary>
              <div className="border-t border-lift-border px-4 py-3 text-sm text-muted whitespace-pre-wrap">
                {profile.internal_narrative}
              </div>
            </details>
          )}
          {profile.family_narrative && (
            <details className="rounded-lg border border-lift-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Family Summary
              </summary>
              <div className="border-t border-lift-border px-4 py-3 text-sm text-muted whitespace-pre-wrap">
                {profile.family_narrative}
              </div>
            </details>
          )}
          {profile.placement_guidance && (
            <details className="rounded-lg border border-lift-border bg-surface">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
                Placement Guidance
              </summary>
              <div className="border-t border-lift-border px-4 py-3 text-sm text-muted whitespace-pre-wrap">
                {profile.placement_guidance}
              </div>
            </details>
          )}
        </div>
      )}

      {!profile && (
        <div className="rounded-lg border border-lift-border bg-surface p-5 text-center text-muted">
          No insight profile generated yet.
        </div>
      )}

      {/* Sessions */}
      <div>
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="mt-3 space-y-2">
          {sessions?.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-lift-border p-3"
            >
              <div>
                <span className="text-sm font-medium">{s.status}</span>
                <span className="ml-2 text-xs text-muted">
                  {s.completion_pct}%
                </span>
              </div>
              <span className="text-xs text-muted">
                {s.completed_at
                  ? new Date(s.completed_at).toLocaleString()
                  : s.started_at
                  ? `Started ${new Date(s.started_at).toLocaleString()}`
                  : "Not started"}
              </span>
            </div>
          ))}
          {(!sessions || sessions.length === 0) && (
            <p className="text-sm text-muted">No sessions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
