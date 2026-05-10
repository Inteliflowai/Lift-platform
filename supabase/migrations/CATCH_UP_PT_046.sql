-- ============================================================
-- LIFT — PT Catch-Up Bundle (migration 046)
-- ============================================================
--
-- Single-migration catch-up. Run after CATCH_UP_PT_041_045.sql
-- has been applied successfully.
--
-- HOW TO USE:
-- 1. Confirm 045 is applied. Quick probe:
--      SELECT column_name FROM information_schema.columns
--       WHERE table_name='tenants' AND column_name='expected_tier';
--      -- expect: 1 row
--      SELECT column_name FROM information_schema.columns
--       WHERE table_name='task_templates' AND column_name='bncc_competencias';
--      -- expect: 0 rows (this is what we're adding)
-- 2. Paste this entire file into the Supabase SQL editor for the
--    EduInsights project. Click Run.
-- 3. After completion, verify with the post-run probe at the bottom.
--
-- DUAL-DEPLOY: this migration also needs to be applied to the LIFT
-- Supabase (the EN deploy at lift.inteliflowai.com) — EN tasks can
-- leave bncc_competencias empty by convention, but the column must
-- exist or PT seeder inserts will fail with 42703 column does not exist.
-- ============================================================


-- ------------------------------------------------------------
-- 046_bncc_alignment.sql
-- ------------------------------------------------------------
BEGIN;

ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS bncc_competencias INT[] NOT NULL DEFAULT '{}';

ALTER TABLE task_templates
  DROP CONSTRAINT IF EXISTS task_templates_bncc_competencias_range;

ALTER TABLE task_templates
  ADD CONSTRAINT task_templates_bncc_competencias_range
  CHECK (
    bncc_competencias <@ ARRAY[1,2,3,4,5,6,7,8,9,10]::int[]
  );

COMMENT ON COLUMN task_templates.bncc_competencias IS
  'BNCC competências gerais (1-10) this task exercises. Tagging at the competências gerais level — not habilidades específicas — to keep alignment portable across grades and disciplines. EN tasks remain empty by convention; PT seeder populates this. See lib/bncc/competencias.ts for the canonical list.';

COMMIT;


-- ============================================================
-- POST-RUN VERIFICATION PROBE
-- ============================================================
-- Paste this query after the bundle completes. Both rows should
-- come back populated.
-- ============================================================
--
-- SELECT
--   (SELECT count(*) FROM information_schema.columns
--     WHERE table_name = 'task_templates'
--       AND column_name = 'bncc_competencias') AS m046_col_present,        -- expect 1
--   (SELECT count(*) FROM pg_constraint
--     WHERE conname = 'task_templates_bncc_competencias_range') AS m046_check;  -- expect 1
