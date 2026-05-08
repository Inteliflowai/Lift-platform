-- ============================================================
-- LIFT — PT Catch-Up Bundle (migrations 041 → 045)
-- ============================================================
--
-- Built 2026-05-08 to bring the EduInsights PT Supabase from
-- migration 040 (last applied via CATCH_UP_PT_022_040.sql) up
-- through 045 (current head as of the audit on branch
-- claude/audit-pt-platform-Y3RHx).
--
-- HOW TO USE:
-- 1. Confirm 040 is applied. The `candidate_flags` table from
--    040 should exist; the `is_demo` column on `candidates` from
--    044 should NOT exist yet. Quick probe:
--      SELECT to_regclass('public.candidate_flags');     -- expect: candidate_flags
--      SELECT to_regclass('public.candidate_flags');     -- expect: candidate_flags
--      SELECT column_name FROM information_schema.columns
--       WHERE table_name='candidates' AND column_name='is_demo';
--      -- expect: 0 rows
-- 2. Paste this entire file into the Supabase SQL editor for
--    the EduInsights project.
-- 3. Click Run. All 5 migrations should apply cleanly since
--    none have been previously attempted.
-- 4. After completion, verify with the post-run probe at the
--    bottom of this file.
--
-- NOTE: each migration is wrapped in BEGIN; ... COMMIT; for
-- atomic safety. If any single migration fails, only that one
-- rolls back — but Supabase SQL editor halts on first error
-- and does NOT auto-attempt the rest. If you hit an error,
-- paste the error back to Claude for diagnosis.
--
-- DUAL-DEPLOY REMINDER (per CLAUDE.md):
-- A push to master triggers BOTH Vercel projects (LIFT +
-- Lift-Platform-Brasil). Apply this bundle to the EduInsights
-- Supabase BEFORE any code referencing the new columns ships,
-- otherwise registration will break on the PT side with 42703.
-- ============================================================


-- ------------------------------------------------------------
-- 041_security_hardening.sql
-- ------------------------------------------------------------
-- Three classes of issue surfaced by the Supabase Performance
-- & Security Advisor:
--   1. RLS disabled on demo_sessions (sensitive token column)
--   2. trial_health view runs as SECURITY DEFINER
--   3. 7 SECURITY DEFINER functions have mutable search_path
--
-- Out of scope (dashboard-only): Auth → "Leaked password
-- protection" toggle. Code can't change that.
BEGIN;

-- 1. demo_sessions — enable RLS + deny-all-public policy.
-- Service-role keys bypass RLS via BYPASSRLS, so the application
-- keeps working through supabaseAdmin.
ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY demo_sessions_no_public_access ON public.demo_sessions
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- 2. trial_health view — switch to security_invoker so it
-- honors the caller's RLS. tenant_licenses + trial_events
-- already have tenant_isolation policies; is_platform_admin()
-- short-circuits them for cross-tenant reads.
ALTER VIEW public.trial_health SET (security_invoker = true);

-- 3. Pin search_path on the 7 SECURITY DEFINER functions.
-- Prevents search_path injection (an attacker creating a
-- same-named object in a writable schema earlier in the path).
ALTER FUNCTION public.is_platform_admin() SET search_path = public, pg_catalog;
ALTER FUNCTION public.user_tenant_ids() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_trial_license() SET search_path = public, pg_catalog;
ALTER FUNCTION public.bump_mission_statement_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_committee_session_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_candidate_flag_updated_at() SET search_path = public, pg_catalog;

COMMIT;


-- ------------------------------------------------------------
-- 042_tenant_delete_cascades.sql
-- ------------------------------------------------------------
-- Three tables in the original schema reference tenants(id)
-- without an ON DELETE clause. Postgres defaults to NO ACTION,
-- which raises 23503 on DELETE FROM tenants whenever any child
-- row exists (and they always do). Result: the platform-admin
-- "Delete tenant" button always returned 500.
--
--   task_templates  → CASCADE   tenant-owned, no value after
--   audit_logs      → SET NULL  preserve cross-tenant forensic
--   demo_sessions   → CASCADE   30-min transient leads
--
-- DROP IF EXISTS makes this re-runnable on instances where the
-- FK was already manually fixed.
BEGIN;

ALTER TABLE public.task_templates
  DROP CONSTRAINT IF EXISTS task_templates_tenant_id_fkey,
  ADD CONSTRAINT task_templates_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.audit_logs
  DROP CONSTRAINT IF EXISTS audit_logs_tenant_id_fkey,
  ADD CONSTRAINT audit_logs_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE SET NULL;

ALTER TABLE public.demo_sessions
  DROP CONSTRAINT IF EXISTS demo_sessions_tenant_id_fkey,
  ADD CONSTRAINT demo_sessions_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

COMMIT;


-- ------------------------------------------------------------
-- 043_tenant_delete_cascade_sweep.sql
-- ------------------------------------------------------------
-- 042 fixed the three FKs pointing directly at tenants(id), but
-- the cascade then 23503'd on grandchild tables whose FKs into
-- candidates / sessions / application_cycles / etc. were also
-- NO ACTION. This dynamic sweep finds every NO ACTION FK whose
-- TARGET TABLE has a tenant_id column and converts it to:
--   - CASCADE   if the column is NOT NULL
--   - SET NULL  if nullable
--
-- Safe to re-run: only touches constraints still at NO ACTION.
BEGIN;

DO $$
DECLARE
  fk RECORD;
  new_action TEXT;
  ref_clause TEXT;
BEGIN
  FOR fk IN
    SELECT
      c.conname,
      t.relname        AS table_name,
      tt.relname       AS target_table,
      a.attname        AS col_name,
      a.attnotnull     AS col_not_null,
      pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_class t        ON t.oid  = c.conrelid
    JOIN pg_namespace n    ON n.oid  = t.relnamespace
    JOIN pg_class tt       ON tt.oid = c.confrelid
    JOIN pg_attribute a    ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND c.confdeltype = 'a'                       -- NO ACTION
      AND array_length(c.conkey, 1) = 1             -- single-column FKs
      AND EXISTS (                                  -- target is tenant-owned
        SELECT 1 FROM pg_attribute ta
        WHERE ta.attrelid = tt.oid
          AND ta.attname = 'tenant_id'
          AND NOT ta.attisdropped
      )
  LOOP
    IF fk.col_not_null THEN
      new_action := 'CASCADE';
    ELSE
      new_action := 'SET NULL';
    END IF;

    ref_clause := regexp_replace(
      fk.def,
      '\s*ON (DELETE|UPDATE) (NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'gi'
    );

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT %I',
      fk.table_name, fk.conname
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I %s ON DELETE %s',
      fk.table_name, fk.conname, ref_clause, new_action
    );

    RAISE NOTICE 'Fixed % on %.% → %(%) [%]',
      fk.conname, 'public', fk.table_name, fk.target_table, fk.col_name, new_action;
  END LOOP;
END
$$;

COMMIT;


-- ------------------------------------------------------------
-- 044_candidates_is_demo.sql
-- ------------------------------------------------------------
-- Two columns on candidates:
--   is_demo                  : seeded demo candidates. Set by
--                              lib/demo/seedDemoSchool*.ts and
--                              the Stripe guest-purchase webhook.
--                              Read by SamplePill + "Sample
--                              candidates included" banner.
--   hidden_from_default_view : soft-archive flag set on the
--                              first real invite so demos
--                              cleanly recede. Never deleted —
--                              "Show sample candidates" toggle
--                              restores them.
--
-- Backfill: candidates whose last_name contains "(Demo)" get
-- is_demo = true (legacy Stripe-suffixed placeholders). PT
-- candidates use clean names (Pedro/Mariana/Helena) so the
-- backfill won't catch them — they get the flag from the
-- application-side seeder once the dashboard self-heal runs.
BEGIN;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS hidden_from_default_view BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE candidates
   SET is_demo = TRUE
 WHERE last_name LIKE '%(Demo)%'
   AND is_demo = FALSE;

COMMENT ON COLUMN candidates.is_demo IS
  'Seeded sample candidate (not real applicant). Set by demo seeders and Stripe guest-purchase webhook. Used by SamplePill rendering and "Sample candidates included" banner trigger.';

COMMENT ON COLUMN candidates.hidden_from_default_view IS
  'Soft-archive flag. Set automatically on the tenant''s first real candidate invite so seeded demos cleanly recede. Never deleted — restored via the "Show sample candidates" toggle on /school/candidates.';

COMMIT;


-- ------------------------------------------------------------
-- 045_expected_tier.sql
-- ------------------------------------------------------------
-- Trial-UX signup columns:
--   tenants.expected_tier — captures inferred conversion tier
--     from school_type + est_annual_applicants. Drives:
--       - TrialBanner CTA (Pro = Stripe self-serve / Enterprise
--         = "Schedule a call" + "Need an invoice?" mailto)
--       - HL sales triage
--       - Trial-conversion analytics
--     NULL = pre-mig-045 tenants. Code defaults NULL → professional.
--
--   tenant_settings.nurture_tags_fired — idempotency ledger for
--     /api/cron/trial-nurture (daily 11:00 UTC). Each milestone
--     tag (e.g. day3_no_invite, day7_walkthrough_offer) appends
--     once per tenant so the cron stays idempotent without a
--     separate table.
BEGIN;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS expected_tier TEXT
    CHECK (expected_tier IN ('professional', 'enterprise'));

COMMENT ON COLUMN tenants.expected_tier IS
  'Expected conversion tier inferred at signup from school_type + est_annual_applicants. Drives tier-aware trial UX. NULL → treat as professional in code.';

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS nurture_tags_fired TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN tenant_settings.nurture_tags_fired IS
  'Append-only ledger of trial-nurture milestone tags fired by /api/cron/trial-nurture (e.g. day3_no_invite, day7_walkthrough_offer). Keeps the daily cron idempotent without a separate table.';

COMMIT;


-- ============================================================
-- POST-RUN VERIFICATION PROBE
-- ============================================================
-- Paste this query after the bundle completes. Every row should
-- come back populated. If any row is empty or NULL, the matching
-- migration didn't apply — re-run that block.
-- ============================================================
--
-- SELECT
--   -- 041
--   (SELECT relrowsecurity FROM pg_class
--      WHERE relname = 'demo_sessions' AND relnamespace = 'public'::regnamespace) AS m041_demo_sessions_rls,
--   (SELECT (reloptions::text) ILIKE '%security_invoker=true%'
--      FROM pg_class WHERE relname = 'trial_health'
--        AND relnamespace = 'public'::regnamespace) AS m041_trial_health_invoker,
--   (SELECT count(*) FROM pg_proc p
--      JOIN pg_namespace n ON n.oid = p.pronamespace
--     WHERE n.nspname = 'public'
--       AND p.proname IN (
--         'is_platform_admin','user_tenant_ids','handle_new_user',
--         'create_trial_license','bump_mission_statement_updated_at',
--         'touch_committee_session_updated_at','touch_candidate_flag_updated_at')
--       AND 'search_path=public, pg_catalog' = ANY(p.proconfig)) AS m041_funcs_pinned,
--   -- 042
--   (SELECT confdeltype FROM pg_constraint
--      WHERE conname = 'task_templates_tenant_id_fkey') AS m042_tt_action,    -- expect 'c'
--   (SELECT confdeltype FROM pg_constraint
--      WHERE conname = 'audit_logs_tenant_id_fkey')     AS m042_al_action,    -- expect 'n'
--   -- 043
--   (SELECT count(*) FROM pg_constraint c
--      JOIN pg_class tt ON tt.oid = c.confrelid
--     WHERE c.contype = 'f' AND c.confdeltype = 'a'
--       AND EXISTS (SELECT 1 FROM pg_attribute ta
--                    WHERE ta.attrelid = tt.oid AND ta.attname = 'tenant_id'
--                      AND NOT ta.attisdropped)) AS m043_remaining_no_action,  -- expect 0
--   -- 044
--   (SELECT count(*) FROM information_schema.columns
--     WHERE table_name = 'candidates'
--       AND column_name IN ('is_demo','hidden_from_default_view')) AS m044_cols,  -- expect 2
--   -- 045
--   (SELECT count(*) FROM information_schema.columns
--     WHERE (table_name = 'tenants' AND column_name = 'expected_tier')
--        OR (table_name = 'tenant_settings' AND column_name = 'nurture_tags_fired')) AS m045_cols;  -- expect 2
