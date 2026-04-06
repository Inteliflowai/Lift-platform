-- CORE integration fields
alter table tenants add column if not exists core_tenant_id uuid;
alter table tenants add column if not exists core_integration_enabled boolean default false;
alter table candidates add column if not exists core_sync_status text default 'not_synced' check (core_sync_status in ('not_synced','synced','failed','skipped'));
alter table candidates add column if not exists core_sync_at timestamptz;
-- core_student_id already exists from initial schema, skip if present
DO $$ BEGIN
  ALTER TABLE candidates ADD COLUMN core_student_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
