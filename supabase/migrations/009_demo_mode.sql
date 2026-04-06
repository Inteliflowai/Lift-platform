alter table tenants add column if not exists is_demo boolean default false;
alter table tenants add column if not exists demo_activated_at timestamptz;
alter table tenants add column if not exists demo_activated_by uuid references users(id);
alter table tenants add column if not exists demo_reset_at timestamptz;
