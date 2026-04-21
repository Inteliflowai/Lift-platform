// Shared types for the committee deliberation surface. Matches the
// committee_sessions + committee_votes tables in migration 039.

export type SessionStatus = "active" | "concluded" | "archived";
export type VoteStatus = "staged" | "committed" | "held";
export type DecisionType = "admit" | "waitlist" | "decline" | "defer";
export type DecisionRule = "single_host"; // future: supermajority, unanimous, etc.

export interface CommitteeSession {
  id: string;
  tenant_id: string;
  cycle_id: string;
  name: string;
  status: SessionStatus;
  candidate_ids: string[];
  decision_rule: DecisionRule;
  started_by: string;
  current_host_id: string;
  started_at: string;
  concluded_at: string | null;
  concluded_by: string | null;
  session_notes: string | null;
  orphan_warned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommitteeVote {
  id: string;
  session_id: string;
  candidate_id: string;
  tenant_id: string;
  decision: DecisionType;
  rationale: string | null;
  side_notes: string | null;
  decided_by: string;
  decided_at: string;
  status: VoteStatus;
  committed_at: string | null;
  committed_final_rec_id: string | null;
}
