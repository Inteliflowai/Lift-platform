-- Support Resources (school-configured)
create table support_resources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  name text not null,
  resource_type text not null check (resource_type in ('academic','social','counseling','learning_support','enrichment','other')),
  description text,
  available_for_grades text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Support Plans (AI-generated per candidate)
create table support_plans (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete cascade,
  ai_version_id uuid references ai_versions(id),
  support_level text check (support_level in ('independent','standard','enhanced','intensive')),
  week_1_2_actions jsonb,
  month_1_priorities jsonb,
  month_2_3_checkpoints jsonb,
  recommended_resources jsonb,
  academic_accommodations text[],
  social_integration_notes text,
  flag_for_early_review boolean default false,
  plan_narrative text,
  family_welcome_note text,
  checklist_items jsonb default '[]',
  status text default 'draft' check (status in ('draft','finalized','shared')),
  shared_with jsonb default '[]',
  shared_at timestamptz,
  generated_at timestamptz default now()
);

alter table support_resources enable row level security;
alter table support_plans enable row level security;

create policy "tenant_isolation" on support_resources for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

create policy "tenant_isolation" on support_plans for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
  or exists (select 1 from user_tenant_roles where user_id = auth.uid() and role = 'platform_admin')
);

-- Add grade_dean and learning_specialist roles
alter table user_tenant_roles drop constraint if exists user_tenant_roles_role_check;
alter table user_tenant_roles add constraint user_tenant_roles_role_check
  check (role in ('platform_admin','school_admin','evaluator','interviewer','support','grade_dean','learning_specialist'));
