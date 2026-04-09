-- White label branding
alter table tenant_settings add column if not exists wl_primary_color text default '#6366f1';
alter table tenant_settings add column if not exists wl_logo_dark_url text;
alter table tenant_settings add column if not exists wl_favicon_url text;
alter table tenant_settings add column if not exists wl_custom_domain text;
alter table tenant_settings add column if not exists wl_custom_domain_verified boolean default false;
alter table tenant_settings add column if not exists wl_hide_lift_branding boolean default false;
alter table tenant_settings add column if not exists wl_email_from_name text;
alter table tenant_settings add column if not exists wl_email_reply_to text;
alter table tenant_settings add column if not exists wl_powered_by_visible boolean default true;
