-- Data export requests (FERPA compliance)
create table data_export_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  requested_by uuid references users(id),
  status text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  export_type text not null default 'full' check (export_type in ('full','candidates_only','cycle')),
  cycle_id uuid references application_cycles(id),
  storage_path text,
  download_url text,
  download_url_expires_at timestamptz,
  file_size_bytes bigint,
  record_counts jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table data_export_requests enable row level security;
create policy "tenant_isolation" on data_export_requests for all using (
  tenant_id in (select tenant_id from user_tenant_roles where user_id = auth.uid())
);
