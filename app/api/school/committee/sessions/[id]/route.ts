export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_ROLES = new Set(["platform_admin", "school_admin"]);

async function loadSession(sessionId: string, tenantId: string) {
  const { data } = await supabaseAdmin
    .from("committee_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .single();
  return data;
}

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();
  const sessionId = context.params.id;

  const canRead = isPlatformAdmin ||
    roles.some((r) => r.tenant_id === tenantId);
  if (!canRead) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const session = await loadSession(sessionId, tenantId);
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const candidateIds: string[] = session.candidate_ids ?? [];

  // Candidates — name, grade, status, cached decision language
  const { data: candidates } = await supabaseAdmin
    .from("candidates")
    .select("id, first_name, last_name, grade_applying_to, status, defensible_language_cache, defensible_language_updated_at, signal_snapshot_hash")
    .in("id", candidateIds.length > 0 ? candidateIds : ["00000000-0000-0000-0000-000000000000"]);

  // TRI per candidate (latest insight profile)
  const triByCandidate = new Map<string, number | null>();
  const briefingByCandidate = new Map<string, {
    key_observations: string[];
    interview_questions: Array<{ question: string; rationale: string; dimension: string }>;
  }>();
  if (candidateIds.length > 0) {
    const { data: profiles } = await supabaseAdmin
      .from("insight_profiles")
      .select("candidate_id, tri_score, generated_at")
      .in("candidate_id", candidateIds)
      .order("generated_at", { ascending: false });
    for (const p of profiles ?? []) {
      if (!triByCandidate.has(p.candidate_id)) {
        triByCandidate.set(p.candidate_id, p.tri_score);
      }
    }

    const { data: briefings } = await supabaseAdmin
      .from("evaluator_briefings")
      .select("candidate_id, key_observations, interview_questions, generated_at")
      .in("candidate_id", candidateIds)
      .order("generated_at", { ascending: false });
    for (const b of briefings ?? []) {
      if (!briefingByCandidate.has(b.candidate_id)) {
        briefingByCandidate.set(b.candidate_id, {
          key_observations: b.key_observations ?? [],
          interview_questions: b.interview_questions ?? [],
        });
      }
    }
  }

  // Interview rubric summary per candidate
  const rubricByCandidate = new Map<string, {
    recommendation: string | null;
    avg_score: number | null;
  }>();
  if (candidateIds.length > 0) {
    const { data: rubrics } = await supabaseAdmin
      .from("interview_rubric_submissions")
      .select("candidate_id, recommendation, verbal_reasoning_score, communication_score, self_awareness_score, curiosity_score, resilience_score")
      .in("candidate_id", candidateIds);
    for (const r of rubrics ?? []) {
      const scores = [r.verbal_reasoning_score, r.communication_score, r.self_awareness_score, r.curiosity_score, r.resilience_score]
        .filter((s): s is number => typeof s === "number");
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      rubricByCandidate.set(r.candidate_id, {
        recommendation: r.recommendation,
        avg_score: avg,
      });
    }
  }

  // Votes for this session
  const { data: votes } = await supabaseAdmin
    .from("committee_votes")
    .select("*")
    .eq("session_id", sessionId);

  const voteByCandidate = new Map<string, Record<string, unknown>>();
  for (const v of votes ?? []) voteByCandidate.set(v.candidate_id, v as Record<string, unknown>);

  // Is the current user the host?
  const isHost = session.current_host_id === user.id;

  const candidatePayload = (candidates ?? []).map((c) => ({
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    grade_applying_to: c.grade_applying_to,
    status: c.status,
    tri_score: triByCandidate.get(c.id) ?? null,
    defensible_language_cache: c.defensible_language_cache ?? {},
    defensible_language_updated_at: c.defensible_language_updated_at,
    briefing: briefingByCandidate.get(c.id) ?? null,
    rubric: rubricByCandidate.get(c.id) ?? null,
    vote: voteByCandidate.get(c.id) ?? null,
  }));

  return NextResponse.json({
    session,
    candidates: candidatePayload,
    votes: votes ?? [],
    viewer: {
      user_id: user.id,
      is_host: isHost,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();
  const sessionId = context.params.id;

  const session = await loadSession(sessionId, tenantId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const canWrite = isPlatformAdmin ||
    (session.current_host_id === user.id &&
      roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role)));
  if (!canWrite) {
    return NextResponse.json({ error: "Forbidden — host only" }, { status: 403 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string") updates.name = body.name;
  if (typeof body.session_notes === "string") updates.session_notes = body.session_notes;

  // candidate_ids change — block if any removed candidate has a staged vote
  if (Array.isArray(body.candidate_ids)) {
    const newIds: string[] = body.candidate_ids;
    const removed = (session.candidate_ids ?? []).filter((id: string) => !newIds.includes(id));
    if (removed.length > 0) {
      const { data: blockingVotes } = await supabaseAdmin
        .from("committee_votes")
        .select("candidate_id, decision, status")
        .eq("session_id", sessionId)
        .in("candidate_id", removed)
        .eq("status", "staged");
      if (blockingVotes && blockingVotes.length > 0) {
        return NextResponse.json(
          {
            error: "blocked_by_staged_vote",
            blocking: blockingVotes,
          },
          { status: 409 },
        );
      }
    }
    updates.candidate_ids = newIds;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("committee_sessions")
    .update(updates)
    .eq("id", sessionId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "committee_session.updated",
    payload: {
      session_id: sessionId,
      fields: Object.keys(updates),
    },
  });

  return NextResponse.json({ session: updated });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId, roles, isPlatformAdmin } = await getTenantContext();
  const sessionId = context.params.id;

  const session = await loadSession(sessionId, tenantId);
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const canArchive = isPlatformAdmin ||
    (session.current_host_id === user.id &&
      roles.some((r) => r.tenant_id === tenantId && ADMIN_ROLES.has(r.role)));
  if (!canArchive) {
    return NextResponse.json({ error: "Forbidden — host or platform admin only" }, { status: 403 });
  }

  await supabaseAdmin
    .from("committee_sessions")
    .update({ status: "archived" })
    .eq("id", sessionId);

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    action: "committee_session.archived",
    payload: { session_id: sessionId, prior_status: session.status },
  });

  return NextResponse.json({ ok: true });
}
