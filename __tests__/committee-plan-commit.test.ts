import { describe, it, expect } from "vitest";
import { planCommitExecution } from "@/lib/committee/planCommitExecution";
import type { CommitteeVote } from "@/lib/committee/types";

function vote(overrides: Partial<CommitteeVote>): CommitteeVote {
  return {
    id: "vote-1",
    session_id: "session-1",
    candidate_id: "cand-1",
    tenant_id: "tenant-1",
    decision: "admit",
    rationale: null,
    side_notes: null,
    decided_by: "user-1",
    decided_at: "2026-04-21T12:00:00Z",
    status: "staged",
    committed_at: null,
    committed_final_rec_id: null,
    ...overrides,
  };
}

describe("planCommitExecution", () => {
  it("commits all staged votes when no holds", () => {
    const plan = planCommitExecution({
      votes: [
        vote({ id: "v1", candidate_id: "c1", decision: "admit" }),
        vote({ id: "v2", candidate_id: "c2", decision: "waitlist" }),
        vote({ id: "v3", candidate_id: "c3", decision: "decline" }),
      ],
    });
    expect(plan.toCommit).toHaveLength(3);
    expect(plan.toHold).toHaveLength(0);
    expect(plan.alreadyCommitted).toHaveLength(0);
  });

  it("moves held candidates to toHold list", () => {
    const plan = planCommitExecution({
      votes: [
        vote({ id: "v1", candidate_id: "c1", decision: "admit" }),
        vote({ id: "v2", candidate_id: "c2", decision: "waitlist" }),
        vote({ id: "v3", candidate_id: "c3", decision: "decline" }),
      ],
      heldCandidateIds: ["c2"],
    });
    expect(plan.toCommit).toHaveLength(2);
    expect(plan.toHold).toHaveLength(1);
    expect(plan.toHold[0].candidate_id).toBe("c2");
  });

  it("passes through already-committed votes into alreadyCommitted", () => {
    const plan = planCommitExecution({
      votes: [
        vote({ id: "v1", candidate_id: "c1", status: "committed" }),
        vote({ id: "v2", candidate_id: "c2", status: "staged" }),
      ],
    });
    expect(plan.alreadyCommitted).toEqual(["v1"]);
    expect(plan.toCommit).toHaveLength(1);
  });

  it("ignores held-status votes (intentionally left from prior pass)", () => {
    const plan = planCommitExecution({
      votes: [
        vote({ id: "v1", candidate_id: "c1", status: "held" }),
        vote({ id: "v2", candidate_id: "c2", status: "staged" }),
      ],
    });
    expect(plan.toCommit).toHaveLength(1);
    expect(plan.toCommit[0].vote_id).toBe("v2");
    expect(plan.toHold).toHaveLength(0);
    expect(plan.alreadyCommitted).toHaveLength(0);
  });

  it("handles empty vote list", () => {
    const plan = planCommitExecution({ votes: [] });
    expect(plan.toCommit).toHaveLength(0);
    expect(plan.toHold).toHaveLength(0);
    expect(plan.alreadyCommitted).toHaveLength(0);
  });

  it("handles holds for candidates that don't exist in vote list (no-op)", () => {
    const plan = planCommitExecution({
      votes: [vote({ id: "v1", candidate_id: "c1" })],
      heldCandidateIds: ["c999-does-not-exist"],
    });
    expect(plan.toCommit).toHaveLength(1);
    expect(plan.toHold).toHaveLength(0);
  });

  it("preserves decision type on each commit/hold item", () => {
    const plan = planCommitExecution({
      votes: [
        vote({ id: "v1", candidate_id: "c1", decision: "defer" }),
        vote({ id: "v2", candidate_id: "c2", decision: "admit" }),
      ],
      heldCandidateIds: ["c1"],
    });
    expect(plan.toHold[0].decision).toBe("defer");
    expect(plan.toCommit[0].decision).toBe("admit");
  });
});
