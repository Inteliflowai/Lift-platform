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
