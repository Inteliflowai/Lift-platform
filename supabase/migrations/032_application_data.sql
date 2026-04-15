-- Application data — one record per candidate per cycle
-- Holds school-side application info alongside LIFT session data
CREATE TABLE IF NOT EXISTS candidate_application_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id uuid REFERENCES application_cycles(id),

  -- Academic records
  gpa_current numeric(4,2),
  gpa_trend text CHECK (gpa_trend IS NULL OR gpa_trend IN ('improving', 'stable', 'declining')),
  current_school text,

  -- Standardized test scores
  isee_score int,
  isee_percentile int,
  ssat_score int,
  ssat_percentile int,
  other_test_name text,
  other_test_score text,

  -- Recommendations
  teacher_rec_1_sentiment text CHECK (teacher_rec_1_sentiment IS NULL OR teacher_rec_1_sentiment IN ('strong', 'positive', 'neutral', 'mixed')),
  teacher_rec_1_notes text,
  teacher_rec_2_sentiment text CHECK (teacher_rec_2_sentiment IS NULL OR teacher_rec_2_sentiment IN ('strong', 'positive', 'neutral', 'mixed')),
  teacher_rec_2_notes text,
  counselor_rec_sentiment text CHECK (counselor_rec_sentiment IS NULL OR counselor_rec_sentiment IN ('strong', 'positive', 'neutral', 'mixed')),
  counselor_rec_notes text,

  -- Interview notes (manual, separate from LIFT interviewer_notes)
  interview_notes text,

  -- Application flags
  application_complete boolean DEFAULT false,
  application_submitted_at timestamptz,
  financial_aid_applicant boolean DEFAULT false,

  -- SIS sync metadata
  sis_last_synced_at timestamptz,
  sis_source text,
  sis_external_id text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(candidate_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_app_data_candidate ON candidate_application_data(candidate_id);
CREATE INDEX IF NOT EXISTS idx_app_data_tenant ON candidate_application_data(tenant_id);

ALTER TABLE candidate_application_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON candidate_application_data FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);
