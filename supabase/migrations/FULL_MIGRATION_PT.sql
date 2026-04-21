-- ============================================================
-- LIFT Platform — Full Initial Schema
-- ============================================================

-- TENANT LAYER
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text not null default 'active' check (status in ('active','suspended','archived')),
  created_at timestamptz default now()
);

create table tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  default_language text not null default 'en' check (default_language in ('en','pt')),
  session_pause_allowed boolean default true,
  session_pause_limit_hours int default 48,
  data_retention_days int default 1095,
  coppa_mode boolean default false,
  require_human_review_always boolean default false,
  created_at timestamptz default now(),
  unique(tenant_id)
);

create table application_cycles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  academic_year text not null,
  opens_at timestamptz,
  closes_at timestamptz,
  status text not null default 'draft' check (status in ('draft','active','closed','archived')),
  created_at timestamptz default now()
);

create table grade_band_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  cycle_id uuid references application_cycles(id) on delete cascade,
  grade_band text not null check (grade_band in ('6-7','8','9-11')),
  name text not null,
  config jsonb not null default '{}',
  is_default boolean default false,
  created_at timestamptz default now()
);

-- USERS & RBAC
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table user_tenant_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  role text not null check (role in ('platform_admin','school_admin','evaluator','interviewer','support')),
  granted_at timestamptz default now(),
  granted_by uuid references users(id),
  unique(user_id, tenant_id, role)
);

-- CANDIDATES
create table candidates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  cycle_id uuid references application_cycles(id),
  first_name text not null,
  last_name text not null,
  grade_applying_to text not null,
  grade_band text not null check (grade_band in ('6-7','8','9-11')),
  date_of_birth date,
  preferred_language text default 'en',
  status text not null default 'invited' check (status in ('invited','consent_pending','active','completed','flagged','reviewed','archived')),
  core_student_id uuid,
  created_at timestamptz default now()
);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  full_name text not null,
  email text not null,
  relationship text,
  is_primary boolean default false,
  created_at timestamptz default now()
);

create table invites (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  token text unique not null,
  sent_to_email text not null,
  sent_at timestamptz,
  expires_at timestamptz,
  opened_at timestamptz,
  status text not null default 'pending' check (status in ('pending','opened','accepted','expired','resent')),
  created_at timestamptz default now()
);

create table consent_events (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  consented_by text not null,
  guardian_id uuid references guardians(id),
  consent_type text not null,
  ip_address text,
  user_agent text,
  consented_at timestamptz default now()
);

create table candidate_status_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references users(id),
  reason text,
  changed_at timestamptz default now()
);

-- SESSIONS & TASKS
create table sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  cycle_id uuid references application_cycles(id),
  grade_band_template_id uuid references grade_band_templates(id),
  grade_band text not null,
  status text not null default 'not_started' check (status in ('not_started','in_progress','paused','completed','abandoned','flagged')),
  started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  resume_token text unique,
  completion_pct numeric(5,2) default 0,
  created_at timestamptz default now()
);

create table session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  event_type text not null,
  task_instance_id uuid,
  payload jsonb default '{}',
  occurred_at timestamptz default now()
);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  grade_band text not null check (grade_band in ('6-7','8','9-11')),
  task_type text not null check (task_type in ('reading_passage','short_response','extended_writing','reflection','scenario','planning')),
  title text not null,
  language text not null default 'en',
  content jsonb not null,
  difficulty_level int default 1,
  estimated_minutes int,
  dimension_targets text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

create table task_instances (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  task_template_id uuid references task_templates(id),
  sequence_order int not null,
  status text not null default 'pending' check (status in ('pending','in_progress','completed','skipped')),
  started_at timestamptz,
  completed_at timestamptz
);

create table response_text (
  id uuid primary key default gen_random_uuid(),
  task_instance_id uuid references task_instances(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  response_body text,
  word_count int,
  language_detected text,
  submitted_at timestamptz default now()
);

create table response_features (
  id uuid primary key default gen_random_uuid(),
  response_text_id uuid references response_text(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  sentence_count int,
  avg_sentence_length numeric(6,2),
  lexical_diversity numeric(5,4),
  evidence_marker_count int,
  revision_depth int,
  features_extracted_at timestamptz default now()
);

-- SIGNALS
create table interaction_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  task_instance_id uuid references task_instances(id),
  tenant_id uuid references tenants(id) on delete cascade,
  signal_type text not null,
  payload jsonb default '{}',
  occurred_at timestamptz default now()
);

create table timing_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  task_instance_id uuid references task_instances(id),
  tenant_id uuid references tenants(id) on delete cascade,
  signal_type text not null,
  value_ms bigint,
  occurred_at timestamptz default now()
);

create table help_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  task_instance_id uuid references task_instances(id),
  tenant_id uuid references tenants(id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz default now()
);

-- AI PIPELINE
create table ai_versions (
  id uuid primary key default gen_random_uuid(),
  version_tag text unique not null,
  dimension text not null,
  model text not null,
  prompt_template text not null,
  config jsonb default '{}',
  created_at timestamptz default now()
);

create table ai_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  ai_version_id uuid references ai_versions(id),
  run_type text not null,
  input_hash text,
  raw_output text,
  status text not null default 'pending' check (status in ('pending','complete','failed')),
  ran_at timestamptz default now()
);

create table insight_profiles (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  reading_score numeric(5,2),
  writing_score numeric(5,2),
  reasoning_score numeric(5,2),
  reflection_score numeric(5,2),
  persistence_score numeric(5,2),
  support_seeking_score numeric(5,2),
  overall_confidence numeric(5,2),
  low_confidence_flags text[],
  unusual_pattern_flags text[],
  requires_human_review boolean default false,
  internal_narrative text,
  family_narrative text,
  placement_guidance text,
  ai_run_ids uuid[],
  generated_at timestamptz default now(),
  is_final boolean default false
);

-- EVALUATOR LAYER
create table evaluator_reviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  evaluator_id uuid references users(id),
  notes text,
  recommendation_tier text check (recommendation_tier in ('strong_admit','admit','waitlist','decline','defer','needs_more_info')),
  override_reason text,
  ai_recommendation_snapshot jsonb,
  status text not null default 'in_progress' check (status in ('in_progress','finalized')),
  finalized_at timestamptz,
  created_at timestamptz default now()
);

create table interviewer_notes (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  interviewer_id uuid references users(id),
  interview_date date,
  notes text,
  rubric_scores jsonb,
  created_at timestamptz default now()
);

create table final_recommendations (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  decided_by uuid references users(id),
  decision text not null check (decision in ('admit','waitlist','decline','defer')),
  rationale text,
  decided_at timestamptz default now()
);

create table report_exports (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  export_type text not null check (export_type in ('internal','family_summary','placement','cohort_csv')),
  language text not null default 'en',
  storage_path text,
  signed_url_expires_at timestamptz,
  generated_by uuid references users(id),
  generated_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id),
  actor_id uuid references users(id),
  candidate_id uuid references candidates(id),
  session_id uuid references sessions(id),
  action text not null,
  payload jsonb default '{}',
  occurred_at timestamptz default now()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper function: check if current user is a platform_admin
create or replace function is_platform_admin()
returns boolean as $$
  select exists (
    select 1 from user_tenant_roles
    where user_id = auth.uid() and role = 'platform_admin'
  );
$$ language sql security definer stable;

-- Helper function: get tenant IDs the current user can access
create or replace function user_tenant_ids()
returns setof uuid as $$
  select tenant_id from user_tenant_roles where user_id = auth.uid();
$$ language sql security definer stable;

-- Enable RLS and create tenant isolation policies for every table with tenant_id

-- tenants
alter table tenants enable row level security;
create policy tenant_isolation on tenants for all using (
  is_platform_admin() or id in (select user_tenant_ids())
);

-- tenant_settings
alter table tenant_settings enable row level security;
create policy tenant_isolation on tenant_settings for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- application_cycles
alter table application_cycles enable row level security;
create policy tenant_isolation on application_cycles for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- grade_band_templates
alter table grade_band_templates enable row level security;
create policy tenant_isolation on grade_band_templates for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- users (no tenant_id — access own row or platform admin)
alter table users enable row level security;
create policy users_self on users for all using (
  id = auth.uid() or is_platform_admin()
);

-- user_tenant_roles
alter table user_tenant_roles enable row level security;
create policy tenant_isolation on user_tenant_roles for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- candidates
alter table candidates enable row level security;
create policy tenant_isolation on candidates for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- guardians
alter table guardians enable row level security;
create policy tenant_isolation on guardians for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- invites
alter table invites enable row level security;
create policy tenant_isolation on invites for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- consent_events
alter table consent_events enable row level security;
create policy tenant_isolation on consent_events for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- candidate_status_history
alter table candidate_status_history enable row level security;
create policy tenant_isolation on candidate_status_history for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- sessions
alter table sessions enable row level security;
create policy tenant_isolation on sessions for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- session_events
alter table session_events enable row level security;
create policy tenant_isolation on session_events for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- task_templates (tenant_id can be null for global templates)
alter table task_templates enable row level security;
create policy tenant_isolation on task_templates for all using (
  is_platform_admin() or tenant_id is null or tenant_id in (select user_tenant_ids())
);

-- task_instances
alter table task_instances enable row level security;
create policy tenant_isolation on task_instances for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- response_text
alter table response_text enable row level security;
create policy tenant_isolation on response_text for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- response_features
alter table response_features enable row level security;
create policy tenant_isolation on response_features for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- interaction_signals
alter table interaction_signals enable row level security;
create policy tenant_isolation on interaction_signals for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- timing_signals
alter table timing_signals enable row level security;
create policy tenant_isolation on timing_signals for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- help_events
alter table help_events enable row level security;
create policy tenant_isolation on help_events for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- ai_versions (no tenant_id — global, readable by all authenticated)
alter table ai_versions enable row level security;
create policy ai_versions_read on ai_versions for select using (auth.uid() is not null);
create policy ai_versions_admin on ai_versions for all using (is_platform_admin());

-- ai_runs
alter table ai_runs enable row level security;
create policy tenant_isolation on ai_runs for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- insight_profiles
alter table insight_profiles enable row level security;
create policy tenant_isolation on insight_profiles for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- evaluator_reviews
alter table evaluator_reviews enable row level security;
create policy tenant_isolation on evaluator_reviews for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- interviewer_notes
alter table interviewer_notes enable row level security;
create policy tenant_isolation on interviewer_notes for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- final_recommendations
alter table final_recommendations enable row level security;
create policy tenant_isolation on final_recommendations for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- report_exports
alter table report_exports enable row level security;
create policy tenant_isolation on report_exports for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- audit_logs
alter table audit_logs enable row level security;
create policy tenant_isolation on audit_logs for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- ============================================================
-- AUTH TRIGGER: auto-create public.users on auth.users insert
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- Add quantitative_reasoning and pattern_logic task types
alter table task_templates drop constraint task_templates_task_type_check;
alter table task_templates add constraint task_templates_task_type_check
  check (task_type in (
    'reading_passage','short_response','extended_writing',
    'reflection','scenario','planning',
    'quantitative_reasoning','pattern_logic'
  ));
-- Learning Support Signals table
create table learning_support_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  high_revision_depth boolean default false,
  low_reading_dwell boolean default false,
  short_written_output boolean default false,
  high_response_latency boolean default false,
  task_abandonment_pattern boolean default false,
  hint_seeking_high boolean default false,
  planning_task_difficulty boolean default false,
  reasoning_writing_gap boolean default false,
  signal_count int default 0,
  support_indicator_level text check (support_indicator_level in ('none','watch','recommend_screening')),
  evaluator_note text,
  requires_human_review boolean default false,
  computed_at timestamptz default now()
);

alter table learning_support_signals enable row level security;
create policy tenant_isolation on learning_support_signals for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

-- Link from insight_profiles
alter table insight_profiles add column if not exists learning_support_signal_id uuid references learning_support_signals(id);
-- Voice response mode
alter table task_instances add column if not exists response_mode text default 'typed' check (response_mode in ('typed','voice'));
alter table response_text add column if not exists transcription_confidence numeric(4,3);
alter table tenant_settings add column if not exists voice_mode_enabled boolean default true;
alter table tenant_settings add column if not exists delete_audio_after_transcription boolean default true;
alter table insight_profiles add column if not exists tri_score numeric(5,2);
alter table insight_profiles add column if not exists tri_label text check (tri_label in ('emerging','developing','ready','thriving'));
alter table insight_profiles add column if not exists tri_confidence text check (tri_confidence in ('low','moderate','high'));
alter table insight_profiles add column if not exists tri_summary text;
-- CORE integration fields
alter table tenants add column if not exists core_tenant_id uuid;
alter table tenants add column if not exists core_integration_enabled boolean default false;
alter table candidates add column if not exists core_sync_status text default 'not_synced' check (core_sync_status in ('not_synced','synced','failed','skipped'));
alter table candidates add column if not exists core_sync_at timestamptz;
-- core_student_id already exists from initial schema, skip if present
DO $$ BEGIN
  ALTER TABLE candidates ADD COLUMN core_student_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
-- Evaluator Intelligence Layer

create table evaluator_briefings (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  cycle_id uuid references application_cycles(id),
  generated_by_ai_version_id uuid references ai_versions(id),
  key_observations text[],
  interview_questions jsonb,
  areas_to_explore text[],
  strengths_to_confirm text[],
  confidence_explanation text,
  generated_at timestamptz default now()
);

create table interview_rubric_submissions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  interviewer_id uuid references users(id),
  interview_date date,
  verbal_reasoning_score int check (verbal_reasoning_score between 1 and 5),
  communication_score int check (communication_score between 1 and 5),
  self_awareness_score int check (self_awareness_score between 1 and 5),
  curiosity_score int check (curiosity_score between 1 and 5),
  resilience_score int check (resilience_score between 1 and 5),
  overall_impression text,
  standout_moments text,
  concerns text,
  recommendation text check (recommendation in ('strong_yes','yes','unsure','no')),
  submitted_at timestamptz default now()
);

create table interview_syntheses (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  ai_version_id uuid references ai_versions(id),
  confirmations text[],
  contradictions text[],
  new_signals text[],
  synthesis_narrative text,
  updated_support_recommendation text,
  generated_at timestamptz default now()
);

create table cohort_benchmarks (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references application_cycles(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  grade_band text,
  avg_reading numeric(5,2),
  avg_writing numeric(5,2),
  avg_reasoning numeric(5,2),
  avg_reflection numeric(5,2),
  avg_persistence numeric(5,2),
  avg_support_seeking numeric(5,2),
  avg_tri numeric(5,2),
  p25_tri numeric(5,2),
  p75_tri numeric(5,2),
  candidate_count int,
  computed_at timestamptz default now(),
  unique(cycle_id, grade_band)
);

-- RLS
alter table evaluator_briefings enable row level security;
create policy tenant_isolation on evaluator_briefings for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

alter table interview_rubric_submissions enable row level security;
create policy tenant_isolation on interview_rubric_submissions for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

alter table interview_syntheses enable row level security;
create policy tenant_isolation on interview_syntheses for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);

alter table cohort_benchmarks enable row level security;
create policy tenant_isolation on cohort_benchmarks for all using (
  is_platform_admin() or tenant_id in (select user_tenant_ids())
);
alter table tenant_settings add column if not exists logo_url text;
alter table tenants add column if not exists is_demo boolean default false;
alter table tenants add column if not exists demo_activated_at timestamptz;
alter table tenants add column if not exists demo_activated_by uuid references users(id);
alter table tenants add column if not exists demo_reset_at timestamptz;
-- Passage reader (TTS) support
alter table response_text add column if not exists audio_storage_path text;
alter table tenant_settings add column if not exists passage_reader_enabled boolean default true;
alter table help_events add column if not exists payload jsonb default '{}'::jsonb;
-- Licensing and subscription system

create table tenant_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  unique(tenant_id),

  -- Tier and status
  tier text not null default 'trial'
    check (tier in ('trial','essentials','professional','enterprise')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','suspended','cancelled')),

  -- Trial window
  trial_starts_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  trial_converted boolean default false,
  trial_converted_at timestamptz,

  -- Active subscription period
  billing_cycle text check (billing_cycle in ('annual','biannual')),
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_renewal_at timestamptz,
  renewal_reminder_sent_at timestamptz,

  -- Payment installment tracking
  installment_1_paid boolean default false,
  installment_1_paid_at timestamptz,
  installment_1_amount numeric(10,2),
  installment_2_due boolean default false,
  installment_2_due_at timestamptz,
  installment_2_paid boolean default false,
  installment_2_paid_at timestamptz,
  installment_2_amount numeric(10,2),

  -- Manual overrides (platform admin)
  feature_overrides text[] default '{}',
  feature_blocks text[] default '{}',
  session_limit_override int,
  seat_limit_override int,

  -- Stripe (wired later — columns exist now for schema stability)
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,

  -- Suspension
  suspended_at timestamptz,
  suspended_reason text,
  data_deletion_scheduled_at timestamptz,

  -- Notes (platform admin)
  internal_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Session and seat usage tracking (monthly snapshots)
create table license_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  period_year int not null,
  period_month int not null,
  sessions_completed int default 0,
  sessions_limit int,
  evaluator_seats_active int default 0,
  seat_limit int,
  updated_at timestamptz default now(),
  unique(tenant_id, period_year, period_month)
);

-- Full audit log for license changes
create table license_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  actor_id uuid references users(id),
  event_type text not null,
  from_tier text,
  to_tier text,
  from_status text,
  to_status text,
  payload jsonb default '{}',
  occurred_at timestamptz default now()
);

-- RLS
alter table tenant_licenses enable row level security;
alter table license_usage enable row level security;
alter table license_events enable row level security;

create policy "tenant_license_isolation" on tenant_licenses for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
create policy "license_usage_isolation" on license_usage for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
create policy "license_events_isolation" on license_events for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

-- Auto-create trial license when tenant is created
create or replace function create_trial_license()
returns trigger language plpgsql as $$
begin
  insert into tenant_licenses (
    tenant_id, tier, status,
    trial_starts_at, trial_ends_at
  ) values (
    new.id, 'trial', 'trialing',
    now(), now() + interval '30 days'
  );
  insert into license_events (tenant_id, event_type, to_tier, to_status)
  values (new.id, 'trial_started', 'trial', 'trialing');
  return new;
end;
$$;
drop trigger if exists on_tenant_created_create_license on tenants;
create trigger on_tenant_created_create_license
  after insert on tenants
  for each row execute function create_trial_license();

-- Atomic session usage increment
create or replace function increment_session_usage(p_tenant_id uuid, p_year int, p_month int)
returns void language plpgsql as $$
begin
  insert into license_usage (tenant_id, period_year, period_month, sessions_completed, updated_at)
  values (p_tenant_id, p_year, p_month, 1, now())
  on conflict (tenant_id, period_year, period_month)
  do update set sessions_completed = license_usage.sessions_completed + 1, updated_at = now();
end;
$$;
-- Registration and welcome flow
alter table tenants add column if not exists school_type text;
alter table tenant_settings add column if not exists welcome_completed boolean default false;
alter table users add column if not exists email text;

-- Trial expiry cron jobs (requires pg_cron extension)
-- Run daily at 2am UTC: expire trials that have ended
-- select cron.schedule('expire-trials', '0 2 * * *', $$
--   update tenant_licenses
--   set status = 'suspended',
--       suspended_at = now(),
--       suspended_reason = 'trial_expired',
--       data_deletion_scheduled_at = now() + interval '30 days',
--       updated_at = now()
--   where status = 'trialing'
--     and trial_ends_at < now()
--     and trial_converted = false;
-- $$);

-- Run daily at 9am UTC: send renewal reminders 7 days before trial ends
-- select cron.schedule('trial-renewal-reminder', '0 9 * * *', $$
--   update tenant_licenses
--   set renewal_reminder_sent_at = now()
--   where status = 'trialing'
--     and trial_ends_at between now() and now() + interval '7 days'
--     and renewal_reminder_sent_at is null;
-- $$);
-- Upgrade requests and subscription management
create table upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  requested_by uuid references users(id),
  current_tier text not null,
  requested_tier text not null,
  billing_preference text,
  message text,
  status text default 'pending' check (status in ('pending','quoted','activated','declined')),
  quoted_at timestamptz,
  activated_at timestamptz,
  activated_by uuid references users(id),
  created_at timestamptz default now()
);

alter table upgrade_requests enable row level security;
create policy "upgrade_requests_isolation" on upgrade_requests for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
-- Admin reset log
create table admin_reset_log (
  id uuid primary key default gen_random_uuid(),
  performed_by uuid references users(id),
  tenant_id uuid references tenants(id) on delete set null,
  tenant_name text,
  reset_type text not null check (reset_type in (
    'candidates_only',
    'full_tenant_data',
    'delete_tenant',
    'reset_license',
    'extend_trial'
  )),
  records_deleted jsonb default '{}',
  notes text,
  performed_at timestamptz default now()
);

alter table admin_reset_log enable row level security;
create policy "platform_admin_only" on admin_reset_log for all using (
  exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
-- Pipeline hardening: track partial completions and errors
alter table insight_profiles add column if not exists pipeline_errors jsonb default '[]';
alter table insight_profiles add column if not exists pipeline_completed_at timestamptz;
alter table insight_profiles add column if not exists pipeline_partial boolean default false;
-- Onboarding tracking
alter table tenant_settings add column if not exists onboarding_completed boolean default false;
alter table tenant_settings add column if not exists onboarding_steps_completed text[] default '{}';
alter table tenant_settings add column if not exists onboarding_dismissed_at timestamptz;
-- White label branding
alter table tenant_settings add column if not exists wl_primary_color text default '#6366f1';
alter table tenant_settings add column if not exists wl_logo_dark_url text;
alter table tenant_settings add column if not exists wl_favicon_url text;
alter table tenant_settings add column if not exists wl_custom_domain text;
alter table tenant_settings add column if not exists wl_custom_domain_verified boolean default false;
alter table tenant_settings add column if not exists wl_hide_lift_branding boolean default false;
alter table tenant_settings add column if not exists wl_email_from_name text;
alter table tenant_settings add column if not exists wl_email_reply_to text;
alter table tenant_settings add column if not exists wl_powered_by_visible boolean default true;
-- Data export requests (FERPA compliance)
create table data_export_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  requested_by uuid references users(id),
  status text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  export_type text not null default 'full' check (export_type in ('full','candidates_only','cycle')),
  cycle_id uuid references application_cycles(id),
  storage_path text,
  download_url text,
  download_url_expires_at timestamptz,
  file_size_bytes bigint,
  record_counts jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table data_export_requests enable row level security;
create policy "tenant_isolation" on data_export_requests for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
);
