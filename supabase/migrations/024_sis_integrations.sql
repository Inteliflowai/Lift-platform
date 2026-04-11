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
