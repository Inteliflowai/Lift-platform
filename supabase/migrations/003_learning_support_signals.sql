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
