-- Registration and welcome flow
alter table tenants add column if not exists school_type text;
alter table tenant_settings add column if not exists welcome_completed boolean default false;
alter table users add column if not exists email text;

-- Trial expiry cron jobs (requires pg_cron extension)
-- Run daily at 2am UTC: expire trials that have ended
-- select cron.schedule('expire-trials', '0 2 * * *', $$
--   update tenant_licenses
--   set status = 'suspended',
--       suspended_at = now(),
--       suspended_reason = 'trial_expired',
--       data_deletion_scheduled_at = now() + interval '30 days',
--       updated_at = now()
--   where status = 'trialing'
--     and trial_ends_at < now()
--     and trial_converted = false;
-- $$);

-- Run daily at 9am UTC: send renewal reminders 7 days before trial ends
-- select cron.schedule('trial-renewal-reminder', '0 9 * * *', $$
--   update tenant_licenses
--   set renewal_reminder_sent_at = now()
--   where status = 'trialing'
--     and trial_ends_at between now() and now() + interval '7 days'
--     and renewal_reminder_sent_at is null;
-- $$);
