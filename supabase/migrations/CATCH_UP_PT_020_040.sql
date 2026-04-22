-- ============================================================
-- LIFT — PT Catch-Up Bundle (migrations 020 → 040)
-- ============================================================
--
-- Built 2026-04-21 to bring the EduInsights PT Supabase from
-- migration 019 (where the Brazilian rep stopped) up through 040
-- (current head as of commit b7739e7).
--
-- HOW TO USE:
-- 1. Paste this entire file into the Supabase SQL editor for
--    the EduInsights project.
-- 2. Click Run. Each migration is wrapped in BEGIN; ... COMMIT;
--    so a failure in any single migration auto-rolls-back that
--    migration only — subsequent migrations still attempt.
-- 3. After completion, re-run Query 1 (schema readiness probe).
--    Every row should be ✅.
--
-- SAFE TO RE-RUN: any migration that already applied will fail
-- inside its BEGIN block, roll back, and the next migration
-- still gets a clean attempt. Whole-file paste-and-run is OK.
-- ============================================================


-- ------------------------------------------------------------
-- 020_waitlist_reapplication.sql
-- ------------------------------------------------------------
BEGIN;
-- Waitlist Intelligence
create table waitlist_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  cycle_id uuid references application_cycles(id),
  rank_position int,                     -- auto-computed from TRI + review
  tri_score numeric(5,2),                -- snapshot at time of waitlisting
  recommendation_tier text,              -- evaluator's recommendation
  evaluator_notes text,
  status text default 'waitlisted' check (status in ('waitlisted','offered','accepted','declined','expired')),
  offered_at timestamptz,
  responded_at timestamptz,
  offer_expires_at timestamptz,
  internal_notes text,                   -- admin notes
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table waitlist_entries enable row level security;
create policy "tenant_isolation" on waitlist_entries for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

-- Re-application Intelligence
create table reapplication_records (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  prior_cycle_id uuid references application_cycles(id),
  prior_session_id uuid references sessions(id),
  prior_tri_score numeric(5,2),
  prior_recommendation text,
  current_cycle_id uuid references application_cycles(id),
  current_session_id uuid references sessions(id),
  current_tri_score numeric(5,2),
  tri_delta numeric(5,2),                -- current - prior
  dimension_deltas jsonb,                -- { reading: +5, writing: -2, ... }
  evaluator_summary text,                -- AI-generated comparison narrative
  flagged_for_review boolean default false,
  created_at timestamptz default now()
);

alter table reapplication_records enable row level security;
create policy "tenant_isolation" on reapplication_records for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

COMMIT;


-- ------------------------------------------------------------
-- 021_outcomes.sql
-- ------------------------------------------------------------
BEGIN;
-- Outcome tracking
create table student_outcomes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  academic_year text not null,
  term text check (term in ('fall','spring','full_year')),
  recorded_by uuid references users(id),
  gpa numeric(4,2),
  gpa_scale numeric(4,2) default 4.0,
  academic_standing text check (academic_standing in ('excellent','good','satisfactory','needs_support','probation')),
  tutoring_sessions_per_week numeric(4,1),
  counseling_engaged boolean,
  learning_support_plan_active boolean,
  social_adjustment text check (social_adjustment in ('thriving','settled','adjusting','struggling')),
  extracurricular_engaged boolean,
  retained boolean default true,
  withdrawal_reason text,
  advisor_notes text,
  recorded_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table prediction_accuracy (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  cycle_id uuid references application_cycles(id),
  grade_band text,
  sample_size int,
  tri_accuracy_pct numeric(5,2),
  high_tri_retention_pct numeric(5,2),
  low_tri_support_pct numeric(5,2),
  strongest_predictor text,
  weakest_predictor text,
  summary_narrative text,
  computed_at timestamptz default now(),
  unique(tenant_id, cycle_id, grade_band)
);

alter table candidates add column if not exists latest_outcome_id uuid references student_outcomes(id);
alter table candidates add column if not exists outcome_count int default 0;

alter table student_outcomes enable row level security;
alter table prediction_accuracy enable row level security;
create policy "tenant_isolation" on student_outcomes for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
create policy "tenant_isolation" on prediction_accuracy for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

COMMIT;


-- ------------------------------------------------------------
-- 022_assignments.sql
-- ------------------------------------------------------------
BEGIN;
-- Candidate assignments
create table candidate_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  assigned_to uuid references users(id) on delete cascade,
  assigned_by uuid references users(id),
  assignment_type text default 'review' check (assignment_type in ('review','interview','both')),
  status text default 'pending' check (status in ('pending','in_progress','completed')),
  seen_at timestamptz,               -- when the assignee first viewed it
  completed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

alter table candidate_assignments enable row level security;
create policy "tenant_isolation" on candidate_assignments for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

-- Auto-assign both roles on team invite
-- (handled in application code, not trigger)

COMMIT;


-- ------------------------------------------------------------
-- 023_support_plans.sql
-- ------------------------------------------------------------
BEGIN;
-- Support Resources (school-configured)
create table support_resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  resource_type text not null check (resource_type in ('academic','social','counseling','learning_support','enrichment','other')),
  description text,
  available_for_grades text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Support Plans (AI-generated per candidate)
create table support_plans (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  ai_version_id uuid references ai_versions(id),
  support_level text check (support_level in ('independent','standard','enhanced','intensive')),
  week_1_2_actions jsonb,
  month_1_priorities jsonb,
  month_2_3_checkpoints jsonb,
  recommended_resources jsonb,
  academic_accommodations text[],
  social_integration_notes text,
  flag_for_early_review boolean default false,
  plan_narrative text,
  family_welcome_note text,
  checklist_items jsonb default '[]',
  status text default 'draft' check (status in ('draft','finalized','shared')),
  shared_with jsonb default '[]',
  shared_at timestamptz,
  generated_at timestamptz default now()
);

alter table support_resources enable row level security;
alter table support_plans enable row level security;

create policy "tenant_isolation" on support_resources for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

create policy "tenant_isolation" on support_plans for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

-- Add grade_dean and learning_specialist roles
alter table user_tenant_roles drop constraint if exists user_tenant_roles_role_check;
alter table user_tenant_roles add constraint user_tenant_roles_role_check
  check (role in ('platform_admin','school_admin','evaluator','interviewer','support','grade_dean','learning_specialist'));

COMMIT;


-- ------------------------------------------------------------
-- 024_sis_integrations.sql
-- ------------------------------------------------------------
BEGIN;
-- SIS Integration configurations
create table sis_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  provider text not null check (provider in ('veracross','blackbaud','powerschool','webhook','csv_manual')),
  status text not null default 'inactive' check (status in ('inactive','active','error')),
  config jsonb not null default '{}',
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz default now(),
  unique(tenant_id, provider)
);

-- SIS Sync log
create table sis_sync_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  integration_id uuid references sis_integrations(id),
  candidate_id uuid references candidates(id),
  provider text not null,
  direction text check (direction in ('outbound','inbound')),
  status text check (status in ('success','failed','skipped')),
  payload_sent jsonb,
  response_received jsonb,
  error_message text,
  synced_at timestamptz default now()
);

-- Add SIS columns to candidates
alter table candidates add column if not exists sis_external_id text;
alter table candidates add column if not exists sis_sync_status text default 'not_synced';

-- RLS
alter table sis_integrations enable row level security;
alter table sis_sync_log enable row level security;

create policy "tenant_isolation" on sis_integrations for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

create policy "tenant_isolation" on sis_sync_log for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

COMMIT;


-- ------------------------------------------------------------
-- 025_trial_intelligence.sql
-- ------------------------------------------------------------
BEGIN;
-- Trial events table
-- Records every meaningful action a trial school takes (first occurrence wins)
CREATE TABLE trial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'day1_login',
    'first_candidate_invited',
    'first_candidate_completed',
    'evaluator_workspace_opened',
    'tri_report_viewed',
    'pdf_downloaded',
    'support_plan_viewed',
    'cohort_export_downloaded',
    'evaluator_intelligence_opened'
  )),
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Only one record per event type per tenant (first occurrence wins)
CREATE UNIQUE INDEX trial_events_tenant_event_unique
  ON trial_events(tenant_id, event_type);

-- RLS
ALTER TABLE trial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON trial_events FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_tenant_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

-- Trial health view
-- One row per active trial tenant with all health signals computed
CREATE OR REPLACE VIEW trial_health AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.slug,
  l.trial_ends_at,
  l.tier,
  l.status AS license_status,
  EXTRACT(DAY FROM (l.trial_ends_at - now()))::int AS days_remaining,
  EXTRACT(DAY FROM (now() - l.trial_starts_at))::int AS days_since_signup,

  -- Day 1 login
  EXISTS (
    SELECT 1 FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'day1_login'
  ) AS day1_login,

  -- First candidate invited
  EXISTS (
    SELECT 1 FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_invited'
  ) AS candidate_invited,

  -- First candidate completed
  EXISTS (
    SELECT 1 FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_completed'
  ) AS candidate_completed,

  -- Day candidate was first completed (days after signup)
  (
    SELECT EXTRACT(DAY FROM (te.created_at - l.trial_starts_at))::int
    FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_completed'
    LIMIT 1
  ) AS first_session_day,

  -- Feature depth score (0-7)
  (
    SELECT COUNT(DISTINCT event_type)::int
    FROM trial_events te
    WHERE te.tenant_id = t.id
    AND te.event_type IN (
      'first_candidate_invited',
      'first_candidate_completed',
      'evaluator_workspace_opened',
      'tri_report_viewed',
      'pdf_downloaded',
      'support_plan_viewed',
      'evaluator_intelligence_opened'
    )
  ) AS feature_depth_score,

  -- Last event timestamp
  (
    SELECT MAX(created_at) FROM trial_events te
    WHERE te.tenant_id = t.id
  ) AS last_event_at,

  -- Total candidates with completed sessions
  (
    SELECT COUNT(*) FROM sessions s
    WHERE s.tenant_id = t.id AND s.status = 'completed'
  )::int AS total_candidates_run,

  -- Event types completed (for tooltip)
  (
    SELECT array_agg(DISTINCT event_type)
    FROM trial_events te
    WHERE te.tenant_id = t.id
  ) AS completed_events,

  -- Health status computed
  CASE
    WHEN EXTRACT(DAY FROM (now() - l.trial_starts_at)) >= 1
      AND NOT EXISTS (
        SELECT 1 FROM trial_events te
        WHERE te.tenant_id = t.id AND te.event_type = 'day1_login'
      )
    THEN 'at_risk'
    WHEN EXTRACT(DAY FROM (now() - l.trial_starts_at)) >= 7
      AND NOT EXISTS (
        SELECT 1 FROM trial_events te
        WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_completed'
      )
    THEN 'at_risk'
    WHEN EXTRACT(DAY FROM (now() - l.trial_starts_at)) >= 14
      AND (
        SELECT COUNT(DISTINCT event_type) FROM trial_events te
        WHERE te.tenant_id = t.id
      ) < 3
    THEN 'at_risk'
    ELSE 'healthy'
  END AS health_status

FROM tenants t
INNER JOIN tenant_licenses l ON l.tenant_id = t.id
WHERE l.status = 'trialing'
  AND l.trial_ends_at > now();

COMMIT;


-- ------------------------------------------------------------
-- 026_ravenna_sis.sql
-- ------------------------------------------------------------
BEGIN;
-- Add Ravenna to SIS provider options
ALTER TABLE sis_integrations DROP CONSTRAINT IF EXISTS sis_integrations_provider_check;
ALTER TABLE sis_integrations ADD CONSTRAINT sis_integrations_provider_check
  CHECK (provider IN ('veracross','blackbaud','powerschool','ravenna','webhook','csv_manual'));

COMMIT;


-- ------------------------------------------------------------
-- 027_enriched_signals.sql
-- ------------------------------------------------------------
BEGIN;
-- Enriched learning support signals (behavioral observations)
ALTER TABLE learning_support_signals
ADD COLUMN IF NOT EXISTS enriched_signals jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS enriched_signal_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_notable_signals boolean DEFAULT false;

-- Index for finding sessions with notable signals
CREATE INDEX IF NOT EXISTS idx_learning_support_notable
  ON learning_support_signals(has_notable_signals)
  WHERE has_notable_signals = true;

COMMIT;


-- ------------------------------------------------------------
-- 028_email_logs.sql
-- ------------------------------------------------------------
BEGIN;
-- Email delivery log
CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_admin_read" ON email_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_tenant_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status) WHERE status = 'failed';

COMMIT;


-- ------------------------------------------------------------
-- 029_tooltip_dismissals.sql
-- ------------------------------------------------------------
BEGIN;
-- Track which tooltips each user has dismissed
CREATE TABLE tooltip_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tooltip_id text NOT NULL,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tooltip_id)
);

CREATE INDEX idx_tooltip_dismissals_user ON tooltip_dismissals(user_id);

ALTER TABLE tooltip_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals"
  ON tooltip_dismissals FOR ALL
  USING (user_id = auth.uid());

COMMIT;


-- ------------------------------------------------------------
-- 030_demo_sessions.sql
-- ------------------------------------------------------------
BEGIN;
-- Demo sessions for one-click live demo
CREATE TABLE demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id uuid REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  ip_address text,
  user_agent text,
  converted_to_trial boolean DEFAULT false,
  converted_at timestamptz,
  hl_contact_id text,
  page_views int DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text
);

CREATE INDEX idx_demo_sessions_token ON demo_sessions(token);
CREATE INDEX idx_demo_sessions_expires ON demo_sessions(expires_at);

-- No RLS — accessed via admin client only

COMMIT;


-- ------------------------------------------------------------
-- 031_auto_invite.sql
-- ------------------------------------------------------------
BEGIN;
-- Auto-invite settings on tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS auto_invite_on_import boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_deadline_days int DEFAULT 7;

-- Invitation log — tracks every invite send with trigger source
CREATE TABLE IF NOT EXISTS invitation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES invites(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'bulk_send', 'import', 'sis_webhook', 'resend')),
  triggered_by_user_id uuid REFERENCES users(id),
  triggered_by_sis text,
  email_sent_to text NOT NULL,
  email_sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_log_candidate ON invitation_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_invitation_log_tenant ON invitation_log(tenant_id);

ALTER TABLE invitation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invitation_log FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

COMMIT;


-- ------------------------------------------------------------
-- 032_application_data.sql
-- ------------------------------------------------------------
BEGIN;
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

COMMIT;


-- ------------------------------------------------------------
-- 033_observation_notes.sql
-- ------------------------------------------------------------
BEGIN;
-- Structured interviewer observation notes — linked to LIFT briefing observations/questions
CREATE TABLE IF NOT EXISTS interviewer_observation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),

  note_type text NOT NULL CHECK (note_type IN ('observation_response', 'question_response', 'free_note')),

  -- Link to specific LIFT briefing item (null for free_note)
  linked_observation_text text,
  linked_question_text text,

  note_text text NOT NULL,

  -- Sentiment relative to the LIFT observation
  sentiment text CHECK (sentiment IS NULL OR sentiment IN ('confirms', 'contradicts', 'expands', 'unclear')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_notes_candidate ON interviewer_observation_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_obs_notes_tenant ON interviewer_observation_notes(tenant_id);

ALTER TABLE interviewer_observation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON interviewer_observation_notes FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

COMMIT;


-- ------------------------------------------------------------
-- 034_class_compositions.sql
-- ------------------------------------------------------------
BEGIN;
-- Saved class compositions (draft and confirmed)
CREATE TABLE IF NOT EXISTS class_compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES application_cycles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Incoming Class Draft',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'archived')),
  candidate_ids uuid[] NOT NULL DEFAULT '{}',
  composition_snapshot jsonb DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_compositions_tenant_cycle ON class_compositions(tenant_id, cycle_id);

ALTER TABLE class_compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON class_compositions FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);

COMMIT;


-- ------------------------------------------------------------
-- 035_math_dimension.sql
-- ------------------------------------------------------------
BEGIN;
-- Add math dimension score to insight profiles
ALTER TABLE insight_profiles
ADD COLUMN IF NOT EXISTS math_score numeric(5,2);

-- Add math task type if not already present
DO $$ BEGIN
  ALTER TABLE task_templates DROP CONSTRAINT IF EXISTS task_templates_task_type_check;
  ALTER TABLE task_templates ADD CONSTRAINT task_templates_task_type_check
    CHECK (task_type IN ('reading_passage','short_response','extended_writing','reflection','scenario','planning','quantitative_reasoning','pattern_logic','math_problem'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;


-- ------------------------------------------------------------
-- 036_longitudinal.sql
-- ------------------------------------------------------------
BEGIN;
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

COMMIT;


-- ------------------------------------------------------------
-- 037_defensible_language.sql
-- ------------------------------------------------------------
BEGIN;
-- 037 — Defensible Decision Language
--
-- Adds tenant-level mission statement (optional, referenced in generated
-- language to tie rationale to school mission) and candidate-level cache
-- for the three-version defensible language output (admit / waitlist /
-- decline). Cache is invalidated by SHA-256 hash over the 16-element
-- signal vector + prompt version; regeneration driven by pipeline or
-- manual trigger, never on read.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS mission_statement text;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS defensible_language_cache jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS defensible_language_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS signal_snapshot_hash text,
  ADD COLUMN IF NOT EXISTS defensible_language_model text;

-- Partial index: only candidates whose cache is populated. Keeps the
-- index compact while still supporting the read path from the evaluator
-- and committee-export views.
CREATE INDEX IF NOT EXISTS idx_candidates_defensible_language_updated
  ON candidates (tenant_id, defensible_language_updated_at DESC)
  WHERE defensible_language_updated_at IS NOT NULL;

COMMIT;


-- ------------------------------------------------------------
-- 038_stage2_upgrades.sql
-- ------------------------------------------------------------
BEGIN;
-- 038 — Stage 2: L2 drift vector + mission-statement timestamp + briefing index
--
-- Adds signal_snapshot_vector jsonb so defensible-language drift check uses
-- real normalized-L2 distance against the stored 16-element vector rather
-- than hash-equality. Adds mission_statement_updated_at (via trigger so any
-- write path updates it, not just the API PATCH). Partial index on
-- already-cached candidates speeds up /school/briefing's stale-count.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS signal_snapshot_vector jsonb;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS mission_statement_updated_at timestamptz;

CREATE OR REPLACE FUNCTION bump_mission_statement_updated_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.mission_statement IS DISTINCT FROM OLD.mission_statement THEN
    NEW.mission_statement_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mission_statement_updated_at ON tenant_settings;
CREATE TRIGGER trg_mission_statement_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION bump_mission_statement_updated_at();

CREATE INDEX IF NOT EXISTS idx_candidates_briefing_readiness
  ON candidates (tenant_id, cycle_id, status)
  WHERE defensible_language_updated_at IS NOT NULL;

COMMIT;


-- ------------------------------------------------------------
-- 039_committee_sessions.sql
-- ------------------------------------------------------------
BEGIN;
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

COMMIT;


-- ------------------------------------------------------------
-- 040_enrollment_readiness_flags.sql
-- ------------------------------------------------------------
BEGIN;
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

COMMIT;

