-- 039 — Stage 3: Committee deliberation sessions + staged votes
--
-- Pattern follows class_compositions (034): draft/active lifecycle, tenant-
-- isolated, candidate_ids array. Staged-then-committed flow: votes live in
-- committee_votes during deliberation; commit path writes to the existing
-- final_recommendations endpoint, which fires the shipped CORE handoff +
-- support plan generation + SIS sync triggers per-candidate.
--
-- current_host_id is a mutable column reflecting who can currently write
-- votes; started_by stays immutable as a provenance field. Host transfer
-- updates current_host_id and writes an audit row.

CREATE TABLE IF NOT EXISTS committee_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES application_cycles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Committee Session',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','concluded','archived')),
  candidate_ids uuid[] NOT NULL DEFAULT '{}',
  decision_rule text NOT NULL DEFAULT 'single_host' CHECK (decision_rule IN ('single_host')),
  started_by uuid NOT NULL REFERENCES users(id),
  current_host_id uuid NOT NULL REFERENCES users(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  concluded_at timestamptz,
  concluded_by uuid REFERENCES users(id),
  session_notes text,
  orphan_warned_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One active session per cycle per tenant — prevents parallel deliberation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_one_active_session_per_cycle
  ON committee_sessions (tenant_id, cycle_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_committee_sessions_tenant_status
  ON committee_sessions (tenant_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_committee_sessions_orphan_check
  ON committee_sessions (started_at)
  WHERE status = 'active';

-- Staged votes during deliberation. Vote overwrites preserve history in
-- audit_logs (written by the API layer, not a trigger, so the API can
-- include actor + reason in the payload).
CREATE TABLE IF NOT EXISTS committee_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES committee_sessions(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('admit','waitlist','decline','defer')),
  rationale text,
  side_notes text,
  decided_by uuid NOT NULL REFERENCES users(id),
  decided_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'staged' CHECK (status IN ('staged','committed','held')),
  committed_at timestamptz,
  committed_final_rec_id uuid REFERENCES final_recommendations(id),
  UNIQUE (session_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_committee_votes_session_status
  ON committee_votes (session_id, status);

ALTER TABLE committee_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON committee_sessions FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

ALTER TABLE committee_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON committee_votes FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

-- updated_at touch trigger on committee_sessions
CREATE OR REPLACE FUNCTION touch_committee_session_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_committee_session_updated_at ON committee_sessions;
CREATE TRIGGER trg_committee_session_updated_at
  BEFORE UPDATE ON committee_sessions
  FOR EACH ROW EXECUTE FUNCTION touch_committee_session_updated_at();
