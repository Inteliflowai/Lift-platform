-- Evaluator calibration — tracks how well each evaluator's recommendations predict outcomes
CREATE TABLE IF NOT EXISTS evaluator_calibration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES users(id),
  cycle_id uuid REFERENCES application_cycles(id),
  candidates_reviewed int DEFAULT 0,
  admits_recommended int DEFAULT 0,
  admits_thrived int DEFAULT 0,
  admits_struggled int DEFAULT 0,
  accuracy_pct numeric(5,2),
  avg_confidence numeric(5,2),
  strongest_dimension text,
  weakest_dimension text,
  computed_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, evaluator_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_eval_calibration_tenant ON evaluator_calibration(tenant_id);

ALTER TABLE evaluator_calibration ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON evaluator_calibration FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

-- Add avg_math to cohort_benchmarks
ALTER TABLE cohort_benchmarks
ADD COLUMN IF NOT EXISTS avg_math numeric(5,2);
