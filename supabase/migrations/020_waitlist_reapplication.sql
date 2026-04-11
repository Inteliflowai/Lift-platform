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
