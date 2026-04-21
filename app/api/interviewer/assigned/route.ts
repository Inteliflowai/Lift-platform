export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET — assigned-to-me candidates with their prep briefings, for the
// interviewer workspace. Role-gated: interviewer + platform_admin.

const INTERVIEWER_ROLES = new Set(["interviewer", "platform_admin"]);

export async function GET() {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();

  const hasRole =
    isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId && INTERVIEWER_ROLES.has(r.role));
  if (!hasRole) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Assignments where the current user is the interviewer.
  const { data: assignments, error } = await supabaseAdmin
    .from("candidate_assignments")
    .select("id, candidate_id, assignment_type, status, notes, created_at")
    .eq("tenant_id", tenantId)
    .eq("assigned_to", user.id)
    .in("assignment_type", ["interview", "both"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!assignments || assignments.length === 0) {
    return NextResponse.json({ assignments: [] });
  }

  const candidateIds = assignments.map((a) => a.candidate_id);

  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_applying_to, status")
    .in("id", candidateIds);

  const { data: briefings } = await supabaseAdmin
    .from("evaluator_briefings")
    .select(
      "candidate_id, key_observations, interview_questions, areas_to_explore, strengths_to_confirm, confidence_explanation, generated_at",
    )
    .in("candidate_id", candidateIds)
    .order("generated_at", { ascending: false });

  // Most-recent briefing per candidate
  const briefingByCandidate = new Map();
  for (const b of briefings ?? []) {
    if (!briefingByCandidate.has(b.candidate_id)) {
      briefingByCandidate.set(b.candidate_id, b);
    }
  }

  // TRI from the latest insight profile
  const { data: profiles } = await supabaseAdmin
    .from("insight_profiles")
    .select("candidate_id, tri_score, generated_at")
    .in("candidate_id", candidateIds)
    .order("generated_at", { ascending: false });
  const triByCandidate = new Map<string, number | null>();
  for (const p of profiles ?? []) {
    if (!triByCandidate.has(p.candidate_id)) {
      triByCandidate.set(p.candidate_id, p.tri_score);
    }
  }

  const candidateById = new Map((candidates ?? []).map((c) => [c.id, c]));

  const payload = assignments.map((a) => {
    const c = candidateById.get(a.candidate_id);
    const b = briefingByCandidate.get(a.candidate_id) ?? null;
    return {
      assignment_id: a.id,
      assignment_type: a.assignment_type,
      assignment_status: a.status,
      candidate_id: a.candidate_id,
      first_name: c?.first_name ?? null,
      last_name: c?.last_name ?? null,
      grade_applying_to: c?.grade_applying_to ?? null,
      candidate_status: c?.status ?? null,
      tri_score: triByCandidate.get(a.candidate_id) ?? null,
      briefing: b
        ? {
            key_observations: b.key_observations ?? [],
            interview_questions: b.interview_questions ?? [],
            areas_to_explore: b.areas_to_explore ?? [],
            strengths_to_confirm: b.strengths_to_confirm ?? [],
            confidence_explanation: b.confidence_explanation ?? "",
            generated_at: b.generated_at,
          }
        : null,
    };
  });

  return NextResponse.json({ assignments: payload });
}
