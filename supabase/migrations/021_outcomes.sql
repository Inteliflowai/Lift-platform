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
