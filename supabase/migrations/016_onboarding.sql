-- Onboarding tracking
alter table tenant_settings add column if not exists onboarding_completed boolean default false;
alter table tenant_settings add column if not exists onboarding_steps_completed text[] default '{}';
alter table tenant_settings add column if not exists onboarding_dismissed_at timestamptz;
