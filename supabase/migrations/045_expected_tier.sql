-- 045 — Trial-UX signup columns (expected_tier + nurture bookkeeping)
--
-- 1. tenants.expected_tier — captures the tier we expect a school to convert
--    to, inferred at signup from school_type and est_annual_applicants. Drives:
--      - TrialBanner CTA: Professional gets Stripe self-serve "Upgrade Now";
--        Enterprise gets "Schedule a call" (sales-only) + "Need an invoice?"
--      - HL sales triage
--      - Trial-conversion analytics
--
--    Mapping (lib/licensing/expectedTier.ts):
--      school_type IN ('Boarding', 'Therapeutic') OR est_annual_applicants = '400+'
--        → 'enterprise'
--      else
--        → 'professional'
--
--    NULL = pre-mig-045 tenants. Code defaults NULL → 'professional'.
--
-- 2. tenant_settings.nurture_tags_fired — idempotency ledger for the daily
--    /api/cron/trial-nurture cron. Each milestone tag (day3_no_invite,
--    day7_walkthrough_offer) is appended once per tenant so the cron can
--    safely run daily without re-firing HL tags on already-nurtured tenants.

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS expected_tier TEXT
    CHECK (expected_tier IN ('professional', 'enterprise'));

COMMENT ON COLUMN tenants.expected_tier IS
  'Expected conversion tier inferred at signup from school_type + est_annual_applicants. Drives tier-aware trial UX. NULL → treat as professional in code.';

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS nurture_tags_fired TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenant_settings.nurture_tags_fired IS
  'Append-only ledger of trial-nurture milestone tags fired by /api/cron/trial-nurture (e.g. day3_no_invite, day7_walkthrough_offer). Keeps the daily cron idempotent without a separate table.';
