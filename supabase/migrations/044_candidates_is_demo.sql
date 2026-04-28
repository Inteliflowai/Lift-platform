-- 044 — Mark demo candidates explicitly + soft-archive flag
--
-- Adds two columns to candidates:
--   - is_demo                  : seeded demo candidates (Jamie/Alex/Sofia, PT
--                                equivalents, and the Stripe guest-purchase
--                                placeholders with "(Demo)" suffix). Set by
--                                lib/demo/seedDemoSchool*.ts and the Stripe
--                                webhook seeder. Read by the candidate list
--                                "Sample candidates included" banner and by
--                                the SamplePill component.
--   - hidden_from_default_view : set on the first real invite (in
--                                lib/invitations/trigger.ts) so demos cleanly
--                                recede once the school starts working with
--                                real applicants. Soft-archive — never
--                                deleted. A "Show sample candidates" toggle
--                                in /school/candidates restores them.
--
-- Backfill: any candidate whose last_name contains "(Demo)" is flagged
-- is_demo = true so the existing Stripe-seeded placeholders pick up the new
-- pill rendering retroactively. The seedDemoSchool* path uses plain names
-- (Jamie Rivera, Alex Chen, Sofia Okafor / Pedro / Mariana / Helena) so it
-- requires the application-side update — not backfillable from name pattern.
-- Existing trial tenants seeded before this migration will see is_demo
-- correctly applied on the next dashboard self-heal pass once the seeders
-- are updated to set the flag.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hidden_from_default_view BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill the Stripe guest-purchase placeholders that already use the
-- "(Demo)" last-name suffix. seedDemoSchool* candidates are not covered
-- here — they get the flag from the application-side seeder once it's
-- updated and the dashboard self-heal re-runs.
UPDATE candidates
   SET is_demo = TRUE
 WHERE last_name LIKE '%(Demo)%'
   AND is_demo = FALSE;

COMMENT ON COLUMN candidates.is_demo IS
  'Seeded sample candidate (not real applicant). Set by demo seeders and Stripe guest-purchase webhook. Used by SamplePill rendering and "Sample candidates included" banner trigger.';

COMMENT ON COLUMN candidates.hidden_from_default_view IS
  'Soft-archive flag. Set automatically on the tenant''s first real candidate invite so seeded demos cleanly recede. Never deleted — restored via the "Show sample candidates" toggle on /school/candidates.';
