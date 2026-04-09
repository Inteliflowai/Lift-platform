-- Pipeline hardening: track partial completions and errors
alter table insight_profiles add column if not exists pipeline_errors jsonb default '[]';
alter table insight_profiles add column if not exists pipeline_completed_at timestamptz;
alter table insight_profiles add column if not exists pipeline_partial boolean default false;
