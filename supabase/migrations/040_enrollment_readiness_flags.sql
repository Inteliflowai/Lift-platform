-- 040 — Enrollment Readiness Flags (Stage 4)
--
-- DISCIPLINE: this is an OBSERVATION table. Every row captures a condition
-- that held at detected_at, computed from real data sources (invites,
-- consent_events, sessions, final_recommendations, candidate_assignments).
-- NO inference. NO scoring. NO probabilities. NO prediction.
--
-- Year-two ML will train against resolved flag history joined with
-- student_outcomes.withdrawal_reason — but that's a separate feature. For
-- Stage 4, the product is a structured observation layer only.
--
-- Three-layer enforcement of the observation-not-prediction discipline:
--   1. Documented here (this comment block) + docs/enrollment-readiness-flags.md
--   2. Code-enforced via ship-gate grep over this migration and all Stage 4
--      code for predict|risk|likely|probability|forecast|yield risk|withdrawal risk
--   3. User-exposed via per-flag spec in docs/enrollment-readiness-flags.md

CREATE TABLE IF NOT EXISTS candidate_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN (
    'consent_not_captured',
    'invite_expired_unopened',
    'assessment_abandoned',
    'low_completion',
    'late_cycle_admit',
    'post_admit_silence',
    'interviewer_unresponsive'
  )),
  severity text NOT NULL CHECK (severity IN ('advisory','notable')),
  computed_from jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  last_observed_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES users(id),
  resolved_reason text,
  resolution_type text CHECK (resolution_type IN (
    'manual',
    'auto_core_handoff',
    'auto_condition_cleared'
  )),
  snooze_until timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Only one ACTIVE flag of each type per candidate. Resolved rows stay for
-- history and year-two ML validation.
CREATE UNIQUE INDEX IF NOT EXISTS uq_candidate_flag_active
  ON candidate_flags (candidate_id, flag_type)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_flags_tenant_active
  ON candidate_flags (tenant_id, severity, detected_at DESC)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_flags_candidate
  ON candidate_flags (candidate_id, detected_at DESC);

-- Used by the daily evaluator to find snoozed flags whose snooze window
-- has expired.
CREATE INDEX IF NOT EXISTS idx_candidate_flags_snoozed
  ON candidate_flags (snooze_until)
  WHERE snooze_until IS NOT NULL AND resolved_at IS NOT NULL;

ALTER TABLE candidate_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON candidate_flags FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

-- Tenant-configurable post-admit silence window (default 14 days, range 1-90)
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS post_admit_silence_days int DEFAULT 14
    CHECK (post_admit_silence_days BETWEEN 1 AND 90);

CREATE OR REPLACE FUNCTION touch_candidate_flag_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_candidate_flag_updated_at ON candidate_flags;
CREATE TRIGGER trg_candidate_flag_updated_at
  BEFORE UPDATE ON candidate_flags
  FOR EACH ROW EXECUTE FUNCTION touch_candidate_flag_updated_at();

COMMENT ON TABLE candidate_flags IS
  'Observation-based enrollment readiness flags. NOT predictive. Flags are raised when a documented condition holds; resolved when an admin acknowledges or the condition clears. Never treat any row here as a predicted outcome. See docs/enrollment-readiness-flags.md for the per-flag specification.';
