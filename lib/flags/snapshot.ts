// Builds a CandidateSnapshot from the live DB for a single candidate.
// One batched read per candidate; caller loops for tenant-wide evaluation.
//
// Activity for post_admit_silence combines:
//   - consent_events.consented_at
//   - invites.opened_at
//   - candidate_status_history.changed_at
//   - candidate_assignments.created_at (school-side activity — per Stage 4 decision)
//   - candidate_application_data.updated_at (if table exists)

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CandidateSnapshot } from "./types";

export async function buildCandidateSnapshot(
  candidateId: string,
  now: string = new Date().toISOString(),
): Promise<CandidateSnapshot | null> {
  const { data: candidate } = await supabaseAdmin
    .from("candidates")
    .select("id, tenant_id, status, cycle_id")
    .eq("id", candidateId)
    .single();
  if (!candidate) return null;

  // Tenant setting for silence threshold
  const { data: settings } = await supabaseAdmin
    .from("tenant_settings")
    .select("post_admit_silence_days")
    .eq("tenant_id", candidate.tenant_id)
    .maybeSingle();
  const postAdmitSilenceDays = settings?.post_admit_silence_days ?? 14;

  // Cycle close date
  let cycleClosesAt: string | null = null;
  if (candidate.cycle_id) {
    const { data: cycle } = await supabaseAdmin
      .from("application_cycles")
      .select("closes_at")
      .eq("id", candidate.cycle_id)
      .maybeSingle();
    cycleClosesAt = cycle?.closes_at ?? null;
  }

  // Latest invite
  const { data: invite } = await supabaseAdmin
    .from("invites")
    .select("id, sent_at, expires_at, opened_at, status")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Consent events
  const { data: consentEvents } = await supabaseAdmin
    .from("consent_events")
    .select("consent_type, consented_at")
    .eq("candidate_id", candidateId);

  // Latest session
  const { data: session } = await supabaseAdmin
    .from("sessions")
    .select("id, status, completion_pct, last_activity_at, completed_at")
    .eq("candidate_id", candidateId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Latest final recommendation
  const { data: finalRec } = await supabaseAdmin
    .from("final_recommendations")
    .select("decision, decided_at")
    .eq("candidate_id", candidateId)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Interviewer assignment (assignment_type IN ('interview','both'))
  const { data: assignment } = await supabaseAdmin
    .from("candidate_assignments")
    .select("id, assigned_to, created_at, assignment_type")
    .eq("candidate_id", candidateId)
    .in("assignment_type", ["interview", "both"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Has interview rubric?
  let hasRubric = false;
  if (assignment) {
    const { count } = await supabaseAdmin
      .from("interview_rubric_submissions")
      .select("*", { count: "exact", head: true })
      .eq("candidate_id", candidateId);
    hasRubric = (count ?? 0) > 0;
  }

  // Most recent activity — aggregate across activity-signal sources
  const activityTimestamps: Array<string | null> = [];
  activityTimestamps.push(...(consentEvents ?? []).map((e) => e.consented_at));
  if (invite?.opened_at) activityTimestamps.push(invite.opened_at);
  if (assignment?.created_at) activityTimestamps.push(assignment.created_at);

  const { data: statusHistory } = await supabaseAdmin
    .from("candidate_status_history")
    .select("changed_at")
    .eq("candidate_id", candidateId)
    .order("changed_at", { ascending: false })
    .limit(1);
  if (statusHistory && statusHistory.length > 0) {
    activityTimestamps.push(statusHistory[0].changed_at);
  }

  // Application data updates (if table exists for this tenant)
  const { data: appData } = await supabaseAdmin
    .from("candidate_application_data")
    .select("updated_at")
    .eq("candidate_id", candidateId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (appData?.updated_at) activityTimestamps.push(appData.updated_at);

  const validTimestamps = activityTimestamps
    .filter((t): t is string => t !== null && t !== undefined)
    .map((t) => new Date(t).getTime());
  const mostRecentMs = validTimestamps.length > 0 ? Math.max(...validTimestamps) : null;
  const mostRecentActivityAt = mostRecentMs ? new Date(mostRecentMs).toISOString() : null;

  return {
    candidate_id: candidate.id,
    tenant_id: candidate.tenant_id,
    status: candidate.status,
    cycle_id: candidate.cycle_id,
    cycle_closes_at: cycleClosesAt,
    latest_invite: invite
      ? {
          id: invite.id,
          sent_at: invite.sent_at,
          expires_at: invite.expires_at,
          opened_at: invite.opened_at,
          status: invite.status,
        }
      : null,
    consent_events: (consentEvents ?? []).map((e) => ({
      consent_type: e.consent_type,
      consented_at: e.consented_at,
    })),
    latest_session: session
      ? {
          id: session.id,
          status: session.status,
          completion_pct: session.completion_pct,
          last_activity_at: session.last_activity_at,
          completed_at: session.completed_at,
        }
      : null,
    latest_final_rec: finalRec
      ? { decision: finalRec.decision, decided_at: finalRec.decided_at }
      : null,
    interviewer_assignment: assignment
      ? {
          id: assignment.id,
          assigned_to: assignment.assigned_to,
          created_at: assignment.created_at,
        }
      : null,
    has_interview_rubric: hasRubric,
    most_recent_activity_at: mostRecentActivityAt,
    post_admit_silence_days: postAdmitSilenceDays,
    now,
  };
}
