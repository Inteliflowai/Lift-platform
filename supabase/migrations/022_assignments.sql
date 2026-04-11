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
