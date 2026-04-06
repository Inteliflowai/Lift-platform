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
