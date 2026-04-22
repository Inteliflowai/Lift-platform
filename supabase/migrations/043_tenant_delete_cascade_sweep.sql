-- 043 — Sweep remaining NO ACTION foreign keys in the tenant cascade chain
--
-- Migration 042 fixed the three FKs pointing directly at tenants(id), but the
-- tenant-delete cascade then hit a second 23503 from grandchild tables. When
-- tenants cascades to candidates / sessions / application_cycles / task_templates
-- / etc., any table whose own FK references those children without an ON DELETE
-- rule will block at statement-end. Supabase log confirmed:
--   DELETE /rest/v1/tenants?id=eq.ed9c7a38... → PostgREST; error=23503
--
-- Rather than enumerate every case by hand across 42 migrations, this does a
-- scoped dynamic sweep: finds every FK with confdeltype='a' (NO ACTION) whose
-- TARGET TABLE has a tenant_id column (i.e., the target is tenant-owned data),
-- and converts it to:
--   - CASCADE   if the column is NOT NULL (row has no meaning without parent)
--   - SET NULL  if nullable (preserve as historical)
--
-- The tenant_id filter excludes FKs targeting users, ai_versions, and other
-- non-tenant tables — those are out of scope for tenant deletion.
--
-- Safe to re-run: the loop only touches constraints still at NO ACTION.

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

    -- Strip any trailing ON DELETE/ON UPDATE from the captured definition,
    -- keep the "FOREIGN KEY (...) REFERENCES ..." clause, then append our action.
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
