-- 041 — Security hardening per Supabase database linter
--
-- Three classes of issue surfaced by the Supabase Performance & Security
-- Advisor:
--
-- 1. ERROR: rls_disabled_in_public on `demo_sessions` + sensitive_columns_exposed
--    The table contains a `token` column (public.demo_sessions.token) used as
--    a single-use URL token for /demo/[token]. Migration 030 deliberately
--    skipped RLS because the table is only touched by the admin client.
--    But: PostgREST exposes any public schema table to anon/authenticated
--    by default. Enabling RLS with a deny-all policy locks API access
--    while preserving service-role functionality (service_role bypasses
--    RLS via BYPASSRLS).
--
-- 2. ERROR: security_definer_view on `trial_health`
--    Postgres views default to running with the view OWNER's privileges
--    (the Supabase migration runner role). Switching to security_invoker
--    makes the view honor the caller's RLS — which is what we want, since
--    `trial_health` reads `tenant_licenses` + `trial_events`, both of
--    which already have tenant_isolation policies. Platform-admin reads
--    will work because `is_platform_admin()` short-circuits the policies.
--
-- 3. WARN: function_search_path_mutable on 7 functions
--    SECURITY DEFINER functions without `SET search_path` are vulnerable
--    to search_path injection (an attacker creates a same-named object
--    in a writable schema earlier in the path). Pinning to
--    `public, pg_catalog` matches our migration intent and prevents the
--    attack. Trigger functions also benefit from this because the
--    trigger fires under whoever does the INSERT/UPDATE.
--
-- Out of scope (dashboard setting only):
--   - Enable Auth → "Leaked password protection" in the Supabase
--     dashboard. Code can't toggle that.

-- ----------------------------------------------------------------------
-- 1. demo_sessions — enable RLS + deny-all-public policy
-- ----------------------------------------------------------------------

ALTER TABLE public.demo_sessions ENABLE ROW LEVEL SECURITY;

-- Anon + authenticated cannot read or write directly. Server routes use
-- the service_role key which bypasses RLS entirely (Supabase grants
-- BYPASSRLS to service_role), so the application keeps working.
CREATE POLICY demo_sessions_no_public_access ON public.demo_sessions
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ----------------------------------------------------------------------
-- 2. trial_health view — switch to security_invoker
-- ----------------------------------------------------------------------

ALTER VIEW public.trial_health SET (security_invoker = true);

-- ----------------------------------------------------------------------
-- 3. Pin search_path on 7 functions
-- ----------------------------------------------------------------------

ALTER FUNCTION public.is_platform_admin() SET search_path = public, pg_catalog;
ALTER FUNCTION public.user_tenant_ids() SET search_path = public, pg_catalog;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;
ALTER FUNCTION public.create_trial_license() SET search_path = public, pg_catalog;
ALTER FUNCTION public.bump_mission_statement_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_committee_session_updated_at() SET search_path = public, pg_catalog;
ALTER FUNCTION public.touch_candidate_flag_updated_at() SET search_path = public, pg_catalog;
