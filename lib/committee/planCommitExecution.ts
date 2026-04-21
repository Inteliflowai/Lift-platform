// Pure planning helper: given a set of staged votes and a hold list, produce
// the ordered list of vote IDs to commit and the ordered list of hold IDs.
// No DB, no fetches — unit-testable.

import type { CommitteeVote, DecisionType } from "./types";

export interface CommitPlanInput {
  votes: CommitteeVote[];            // all votes for the session
  heldCandidateIds?: string[];       // candidate IDs the host chose to hold
}

export interface CommitPlan {
  toCommit: Array<{ vote_id: string; candidate_id: string; decision: DecisionType }>;
  toHold:   Array<{ vote_id: string; candidate_id: string; decision: DecisionType }>;
  alreadyCommitted: string[];
}

export function planCommitExecution({
  votes,
  heldCandidateIds = [],
}: CommitPlanInput): CommitPlan {
  const holdSet = new Set(heldCandidateIds);
  const plan: CommitPlan = { toCommit: [], toHold: [], alreadyCommitted: [] };

  for (const v of votes) {
    if (v.status === "committed") {
      plan.alreadyCommitted.push(v.id);
      continue;
    }
    // Only 'staged' votes are candidates for commit or hold. 'held' votes
    // from a prior pass are ignored — they were intentionally left staged.
    if (v.status !== "staged") continue;

    if (holdSet.has(v.candidate_id)) {
      plan.toHold.push({ vote_id: v.id, candidate_id: v.candidate_id, decision: v.decision });
    } else {
      plan.toCommit.push({ vote_id: v.id, candidate_id: v.candidate_id, decision: v.decision });
    }
  }

  return plan;
}
