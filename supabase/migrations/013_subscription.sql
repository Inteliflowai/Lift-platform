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
