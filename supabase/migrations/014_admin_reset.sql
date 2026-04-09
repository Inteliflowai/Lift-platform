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
