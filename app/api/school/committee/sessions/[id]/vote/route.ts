export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { rateLimitCheck } from "@/lib/rateLimit/middleware";

const VALID_DECISIONS = new Set(["admit", "waitlist", "decline", "defer"]);

export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId } = await getTenantContext();
  const sessionId = context.params.id;

  // 10 votes / 10s / host — catches double-clicks, doesn't impede real work.
  const rl = rateLimitCheck(`committee_vote:${user.id}`, 10, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "rate_limit_exceeded",
        message: `Too many rapid votes. Try again in ${rl.retryAfterSeconds}s.`,
        retry_after_seconds: rl.retryAfterSeconds,
      },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const body = await req.json().catch(() => ({}));
  const candidateId: string | undefined = body?.candidate_id;
  const decision: string | undefined = body?.decision;
  const rationale: string | null = body?.rationale ?? null;
  const sideNotes: string | null = body?.side_notes ?? null;

  if (!candidateId || !decision || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "Invalid candidate_id or decision" }, { status: 400 });
  }

  // Session must be active, and current user must be the host.
  const { data: session } = await supabaseAdmin
    .from("committee_sessions")
    .select("id, tenant_id, status, candidate_ids, current_host_id")
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }
  if (session.current_host_id !== user.id) {
    return NextResponse.json({ error: "Only the session host can record votes" }, { status: 403 });
  }
  if (!(session.candidate_ids ?? []).includes(candidateId)) {
    return NextResponse.json({ error: "Candidate is not in this session" }, { status: 400 });
  }

  // Load prior vote (for audit) — we overwrite, don't version-chain
  const { data: prior } = await supabaseAdmin
    .from("committee_votes")
    .select("id, decision, rationale, status")
    .eq("session_id", sessionId)
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (prior && prior.status === "committed") {
    return NextResponse.json(
      { error: "Vote already committed — cannot overwrite" },
      { status: 409 },
    );
  }

  const { data: upserted, error } = await supabaseAdmin
    .from("committee_votes")
    .upsert(
      {
        session_id: sessionId,
        candidate_id: candidateId,
        tenant_id: tenantId,
        decision,
        rationale,
        side_notes: sideNotes,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        status: "staged",
      },
      { onConflict: "session_id,candidate_id" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id: candidateId,
    action: prior ? "committee_vote.overwritten" : "committee_vote.staged",
    payload: {
      session_id: sessionId,
      vote_id: upserted.id,
      decision,
      prior_decision: prior?.decision ?? null,
      prior_rationale: prior?.rationale ?? null,
    },
  });

  return NextResponse.json({ vote: upserted });
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } },
) {
  const { user, tenantId } = await getTenantContext();
  const sessionId = context.params.id;

  const candidateId = req.nextUrl.searchParams.get("candidate_id");
  if (!candidateId) {
    return NextResponse.json({ error: "candidate_id required" }, { status: 400 });
  }

  const { data: session } = await supabaseAdmin
    .from("committee_sessions")
    .select("id, status, current_host_id")
    .eq("id", sessionId)
    .eq("tenant_id", tenantId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 409 });
  }
  if (session.current_host_id !== user.id) {
    return NextResponse.json({ error: "Only the session host can delete votes" }, { status: 403 });
  }

  const { data: vote } = await supabaseAdmin
    .from("committee_votes")
    .select("id, status, decision")
    .eq("session_id", sessionId)
    .eq("candidate_id", candidateId)
    .maybeSingle();
  if (!vote) return NextResponse.json({ error: "No vote to delete" }, { status: 404 });
  if (vote.status === "committed") {
    return NextResponse.json({ error: "Cannot delete a committed vote" }, { status: 409 });
  }

  await supabaseAdmin.from("committee_votes").delete().eq("id", vote.id);

  await writeAuditLog(supabaseAdmin, {
    tenant_id: tenantId,
    actor_id: user.id,
    candidate_id: candidateId,
    action: "committee_vote.deleted",
    payload: {
      session_id: sessionId,
      vote_id: vote.id,
      decision: vote.decision,
    },
  });

  return NextResponse.json({ ok: true });
}
