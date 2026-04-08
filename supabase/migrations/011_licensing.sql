-- Licensing and subscription system

create table tenant_licenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  unique(tenant_id),

  -- Tier and status
  tier text not null default 'trial'
    check (tier in ('trial','essentials','professional','enterprise')),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','suspended','cancelled')),

  -- Trial window
  trial_starts_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  trial_converted boolean default false,
  trial_converted_at timestamptz,

  -- Active subscription period
  billing_cycle text check (billing_cycle in ('annual','biannual')),
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  next_renewal_at timestamptz,
  renewal_reminder_sent_at timestamptz,

  -- Payment installment tracking
  installment_1_paid boolean default false,
  installment_1_paid_at timestamptz,
  installment_1_amount numeric(10,2),
  installment_2_due boolean default false,
  installment_2_due_at timestamptz,
  installment_2_paid boolean default false,
  installment_2_paid_at timestamptz,
  installment_2_amount numeric(10,2),

  -- Manual overrides (platform admin)
  feature_overrides text[] default '{}',
  feature_blocks text[] default '{}',
  session_limit_override int,
  seat_limit_override int,

  -- Stripe (wired later — columns exist now for schema stability)
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_invoice_id text,

  -- Suspension
  suspended_at timestamptz,
  suspended_reason text,
  data_deletion_scheduled_at timestamptz,

  -- Notes (platform admin)
  internal_notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Session and seat usage tracking (monthly snapshots)
create table license_usage (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  period_year int not null,
  period_month int not null,
  sessions_completed int default 0,
  sessions_limit int,
  evaluator_seats_active int default 0,
  seat_limit int,
  updated_at timestamptz default now(),
  unique(tenant_id, period_year, period_month)
);

-- Full audit log for license changes
create table license_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  actor_id uuid references users(id),
  event_type text not null,
  from_tier text,
  to_tier text,
  from_status text,
  to_status text,
  payload jsonb default '{}',
  occurred_at timestamptz default now()
);

-- RLS
alter table tenant_licenses enable row level security;
alter table license_usage enable row level security;
alter table license_events enable row level security;

create policy "tenant_license_isolation" on tenant_licenses for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
create policy "license_usage_isolation" on license_usage for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);
create policy "license_events_isolation" on license_events for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

-- Auto-create trial license when tenant is created
create or replace function create_trial_license()
returns trigger language plpgsql as $$
begin
  insert into tenant_licenses (
    tenant_id, tier, status,
    trial_starts_at, trial_ends_at
  ) values (
    new.id, 'trial', 'trialing',
    now(), now() + interval '30 days'
  );
  insert into license_events (tenant_id, event_type, to_tier, to_status)
  values (new.id, 'trial_started', 'trial', 'trialing');
  return new;
end;
$$;
drop trigger if exists on_tenant_created_create_license on tenants;
create trigger on_tenant_created_create_license
  after insert on tenants
  for each row execute function create_trial_license();

-- Atomic session usage increment
create or replace function increment_session_usage(p_tenant_id uuid, p_year int, p_month int)
returns void language plpgsql as $$
begin
  insert into license_usage (tenant_id, period_year, period_month, sessions_completed, updated_at)
  values (p_tenant_id, p_year, p_month, 1, now())
  on conflict (tenant_id, period_year, period_month)
  do update set sessions_completed = license_usage.sessions_completed + 1, updated_at = now();
end;
$$;
