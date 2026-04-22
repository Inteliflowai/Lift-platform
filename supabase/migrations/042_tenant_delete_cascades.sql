-- 042 — Enable full tenant deletion by fixing missing ON DELETE actions
--
-- Three tables in the original schema reference tenants(id) without an
-- ON DELETE clause. Postgres defaults this to NO ACTION, which raises
-- 23503 (foreign_key_violation) on DELETE FROM tenants whenever any
-- child row exists. In practice every tenant has rows in all three:
--
--   - task_templates  ~15 rows seeded at registration
--   - audit_logs      grows on every API call from day one
--   - demo_sessions   transient, but blocks if any exist
--
-- Result: the platform-admin "Delete tenant" button always returned 500.
--
-- Resolution per table:
--   - task_templates  → CASCADE   tenant-owned, no value after deletion
--   - audit_logs      → SET NULL  preserve cross-tenant forensic history
--                                 (matches admin_reset_log + email_logs convention)
--   - demo_sessions   → CASCADE   30-min transient leads, no value after deletion
--
-- Constraint names follow Postgres' default <table>_<column>_fkey pattern
-- because the original CREATE TABLE statements did not name the FKs.
-- DROP IF EXISTS makes this re-runnable on instances where the FK was
-- already manually fixed.

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
