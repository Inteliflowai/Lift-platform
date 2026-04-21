// DB-hitting commit execution for committee sessions.
//
// Mirrors the shipped /api/final-recommendations logic per-candidate:
//   - insert into final_recommendations
//   - update candidate.status
//   - insert into candidate_status_history
//   - write audit log
//   - on 'admit': fire CORE handoff + support plan + SIS sync (fire-and-forget)
//   - update committee_votes row: status='committed', committed_at, committed_final_rec_id
//
// Bounded concurrency of 5 to avoid hammering downstream systems on large
// commits. Each result (success or failure) is reported back so the client
// can show per-candidate progress + per-row retry on failure.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";
import { planCommitExecution } from "./planCommitExecution";
import type { CommitteeVote, DecisionType } from "./types";

const CONCURRENCY = 5;

export interface CommitOptions {
  sessionId: string;
  tenantId: string;
  actorId: string;
  heldCandidateIds?: string[];
}

export interface CommitResultItem {
  vote_id: string;
  candidate_id: string;
  decision: DecisionType;
  outcome: "committed" | "held" | "failed" | "already_committed";
  final_rec_id?: string;
  error?: string;
}

export interface CommitSummary {
  total: number;
  committed: number;
  held: number;
  failed: number;
  already_committed: number;
  items: CommitResultItem[];
}

async function commitOneVote(
  vote: { vote_id: string; candidate_id: string; decision: DecisionType },
  opts: CommitOptions,
): Promise<CommitResultItem> {
  const { tenantId, actorId } = opts;
  try {
    const { data: rec, error: recErr } = await supabaseAdmin
      .from("final_recommendations")
      .insert({
        candidate_id: vote.candidate_id,
        tenant_id: tenantId,
        decided_by: actorId,
        decision: vote.decision,
        rationale: null, // committee rationale lives on committee_votes.rationale
      })
      .select()
      .single();

    if (recErr || !rec) {
      return {
        vote_id: vote.vote_id,
        candidate_id: vote.candidate_id,
        decision: vote.decision,
        outcome: "failed",
        error: recErr?.message ?? "final_recommendations insert returned no row",
      };
    }

    // Update candidate status + status history (mirror /api/final-recommendations)
    const newStatus =
      vote.decision === "admit" ? "admitted"
      : vote.decision === "waitlist" ? "waitlisted"
      : "reviewed";
    await supabaseAdmin
      .from("candidates")
      .update({ status: newStatus })
      .eq("id", vote.candidate_id);
    await supabaseAdmin.from("candidate_status_history").insert({
      candidate_id: vote.candidate_id,
      tenant_id: tenantId,
      from_status: "completed",
      to_status: newStatus,
      changed_by: actorId,
      reason: `Committee decision: ${vote.decision}`,
    });

    // Mark the committee vote as committed
    await supabaseAdmin
      .from("committee_votes")
      .update({
        status: "committed",
        committed_at: new Date().toISOString(),
        committed_final_rec_id: rec.id,
      })
      .eq("id", vote.vote_id);

    // Audit — includes session context + downstream-trigger marker so the
    // full commit chain is reconstructible.
    const willTriggerExternal = vote.decision === "admit";
    await writeAuditLog(supabaseAdmin, {
      tenant_id: tenantId,
      actor_id: actorId,
      candidate_id: vote.candidate_id,
      action: "committee_vote.committed",
      payload: {
        session_id: opts.sessionId,
        vote_id: vote.vote_id,
        decision: vote.decision,
        final_rec_id: rec.id,
        downstream_triggers_fired: willTriggerExternal
          ? ["core_handoff", "support_plan", "sis_sync"]
          : [],
      },
    });

    // Fire downstream automation on admit — same fire-and-forget pattern as
    // the shipped /api/final-recommendations. Failures here don't roll back
    // the commit; they're visible in their own endpoints' logs.
    if (willTriggerExternal) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const internalHeaders = {
        "Content-Type": "application/json",
        "x-internal-secret": process.env.INTERNAL_API_SECRET!,
      };
      fetch(`${baseUrl}/api/integrations/core-handoff`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({ candidate_id: vote.candidate_id }),
      }).catch((err) => console.error("CORE handoff trigger failed:", err));
      fetch(`${baseUrl}/api/pipeline/support-plan`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({ candidate_id: vote.candidate_id }),
      }).catch((err) => console.error("Support plan trigger failed:", err));
      fetch(`${baseUrl}/api/integrations/sis-sync`, {
        method: "POST",
        headers: internalHeaders,
        body: JSON.stringify({ candidate_id: vote.candidate_id }),
      }).catch((err) => console.error("SIS sync trigger failed:", err));
    }

    return {
      vote_id: vote.vote_id,
      candidate_id: vote.candidate_id,
      decision: vote.decision,
      outcome: "committed",
      final_rec_id: rec.id,
    };
  } catch (err) {
    return {
      vote_id: vote.vote_id,
      candidate_id: vote.candidate_id,
      decision: vote.decision,
      outcome: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function commitStagedVotes(
  opts: CommitOptions,
): Promise<CommitSummary> {
  // Pull all votes for the session
  const { data: votes } = await supabaseAdmin
    .from("committee_votes")
    .select("*")
    .eq("session_id", opts.sessionId)
    .eq("tenant_id", opts.tenantId);

  const plan = planCommitExecution({
    votes: (votes ?? []) as CommitteeVote[],
    heldCandidateIds: opts.heldCandidateIds,
  });

  const items: CommitResultItem[] = [];

  // Held votes — update their status to 'held' explicitly (keeps audit clean)
  for (const h of plan.toHold) {
    await supabaseAdmin
      .from("committee_votes")
      .update({ status: "held" })
      .eq("id", h.vote_id);
    items.push({
      vote_id: h.vote_id,
      candidate_id: h.candidate_id,
      decision: h.decision,
      outcome: "held",
    });
  }

  // Already committed — passthrough
  for (const id of plan.alreadyCommitted) {
    const v = (votes ?? []).find((x) => x.id === id);
    if (v) {
      items.push({
        vote_id: v.id,
        candidate_id: v.candidate_id,
        decision: v.decision as DecisionType,
        outcome: "already_committed",
        final_rec_id: v.committed_final_rec_id ?? undefined,
      });
    }
  }

  // Commit in batches of 5 via Promise.allSettled — bounded concurrency keeps
  // us polite to downstream systems (CORE, SIS can be slow).
  for (let i = 0; i < plan.toCommit.length; i += CONCURRENCY) {
    const batch = plan.toCommit.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((v) => commitOneVote(v, opts)),
    );
    for (const r of results) {
      if (r.status === "fulfilled") {
        items.push(r.value);
      } else {
        // Should be rare — commitOneVote catches its own errors. Belt.
        items.push({
          vote_id: "unknown",
          candidate_id: "unknown",
          decision: "defer",
          outcome: "failed",
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        });
      }
    }
  }

  const summary: CommitSummary = {
    total: items.length,
    committed: items.filter((i) => i.outcome === "committed").length,
    held: items.filter((i) => i.outcome === "held").length,
    failed: items.filter((i) => i.outcome === "failed").length,
    already_committed: items.filter((i) => i.outcome === "already_committed").length,
    items,
  };

  // If any commits succeeded or the host chose to hold everything, mark the
  // session concluded. If all attempts failed, leave session active so the
  // host can retry.
  if (summary.failed === 0 || summary.committed > 0 || summary.held > 0) {
    await supabaseAdmin
      .from("committee_sessions")
      .update({
        status: "concluded",
        concluded_at: new Date().toISOString(),
        concluded_by: opts.actorId,
      })
      .eq("id", opts.sessionId);
  }

  await writeAuditLog(supabaseAdmin, {
    tenant_id: opts.tenantId,
    actor_id: opts.actorId,
    action: "committee_session.commit_completed",
    payload: {
      session_id: opts.sessionId,
      total: summary.total,
      committed: summary.committed,
      held: summary.held,
      failed: summary.failed,
      already_committed: summary.already_committed,
    },
  });

  return summary;
}
