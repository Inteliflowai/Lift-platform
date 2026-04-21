-- 037 — Defensible Decision Language
--
-- Adds tenant-level mission statement (optional, referenced in generated
-- language to tie rationale to school mission) and candidate-level cache
-- for the three-version defensible language output (admit / waitlist /
-- decline). Cache is invalidated by SHA-256 hash over the 16-element
-- signal vector + prompt version; regeneration driven by pipeline or
-- manual trigger, never on read.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS mission_statement text;

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS defensible_language_cache jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS defensible_language_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS signal_snapshot_hash text,
  ADD COLUMN IF NOT EXISTS defensible_language_model text;

-- Partial index: only candidates whose cache is populated. Keeps the
-- index compact while still supporting the read path from the evaluator
-- and committee-export views.
CREATE INDEX IF NOT EXISTS idx_candidates_defensible_language_updated
  ON candidates (tenant_id, defensible_language_updated_at DESC)
  WHERE defensible_language_updated_at IS NOT NULL;
