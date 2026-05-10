-- 046 — BNCC alignment on task_templates
--
-- Adds bncc_competencias to task_templates so every task can be tagged with
-- the BNCC competências gerais (1-10) it exercises. Enables:
--   - Filtering / reporting on which BNCC competências a school's task pool
--     covers
--   - AI scoring prompts (PT branch) referencing the relevant competências
--   - Audit / evaluator-facing badges on tasks
--
-- Tagging is at the competências gerais level (10 high-level), not habilidades
-- específicas. Decision documented in lib/bncc/competencias.ts: per-grade
-- habilidade tagging would lock tasks to a single grade and require curated
-- per-task curriculum mapping, which doesn't scale across the BR private +
-- public school market.
--
-- DUAL-DEPLOY NOTE (per CLAUDE.md): both LIFT and EduInsights Supabases need
-- this migration. EN tasks can leave the column NULL/empty — only the PT
-- seeder (scripts/seed-pt-tasks.ts) populates it for now.

ALTER TABLE task_templates
  ADD COLUMN IF NOT EXISTS bncc_competencias INT[] NOT NULL DEFAULT '{}';

-- Constrain to valid BNCC competência ids (1-10). Allows empty array.
ALTER TABLE task_templates
  DROP CONSTRAINT IF EXISTS task_templates_bncc_competencias_range;

ALTER TABLE task_templates
  ADD CONSTRAINT task_templates_bncc_competencias_range
  CHECK (
    bncc_competencias <@ ARRAY[1,2,3,4,5,6,7,8,9,10]::int[]
  );

COMMENT ON COLUMN task_templates.bncc_competencias IS
  'BNCC competências gerais (1-10) this task exercises. Tagging at the competências gerais level — not habilidades específicas — to keep alignment portable across grades and disciplines. EN tasks remain empty by convention; PT seeder populates this. See lib/bncc/competencias.ts for the canonical list.';
