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

-- ============================================================
-- APPENDIX — Migrations 019 through 040
-- Generated 2026-04-21 to bring fresh PT bootstrap current with
-- the LIFT codebase. Each section corresponds to a single
-- migration file under supabase/migrations/.
-- ============================================================


-- ------------------------------------------------------------
-- 020_waitlist_reapplication.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 021_outcomes.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 022_assignments.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 023_support_plans.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 024_sis_integrations.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 025_trial_intelligence.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 026_ravenna_sis.sql
-- ------------------------------------------------------------

-- Add Ravenna to SIS provider options
ALTER TABLE sis_integrations DROP CONSTRAINT IF EXISTS sis_integrations_provider_check;
ALTER TABLE sis_integrations ADD CONSTRAINT sis_integrations_provider_check
  CHECK (provider IN ('veracross','blackbaud','powerschool','ravenna','webhook','csv_manual'));


-- ------------------------------------------------------------
-- 027_enriched_signals.sql
-- ------------------------------------------------------------

-- Enriched learning support signals (behavioral observations)
ALTER TABLE learning_support_signals
ADD COLUMN IF NOT EXISTS enriched_signals jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS enriched_signal_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_notable_signals boolean DEFAULT false;

-- Index for finding sessions with notable signals
CREATE INDEX IF NOT EXISTS idx_learning_support_notable
  ON learning_support_signals(has_notable_signals)
  WHERE has_notable_signals = true;


-- ------------------------------------------------------------
-- 028_email_logs.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 029_tooltip_dismissals.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 030_demo_sessions.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 031_auto_invite.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 032_application_data.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 033_observation_notes.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 034_class_compositions.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 035_math_dimension.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 036_longitudinal.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 037_defensible_language.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 038_stage2_upgrades.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 039_committee_sessions.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 040_enrollment_readiness_flags.sql
-- ------------------------------------------------------------

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


-- ------------------------------------------------------------
-- 019_gender.sql (placed last in bundle; no downstream migration depends on it)
-- ------------------------------------------------------------

-- Gender field on candidates
alter table candidates add column if not exists gender text check (gender in ('male','female','lgbtq+','prefer_not_to_say'));

