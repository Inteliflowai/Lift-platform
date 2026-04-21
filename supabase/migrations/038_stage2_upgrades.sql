-- 038 — Stage 2: L2 drift vector + mission-statement timestamp + briefing index
--
-- Adds signal_snapshot_vector jsonb so defensible-language drift check uses
-- real normalized-L2 distance against the stored 16-element vector rather
-- than hash-equality. Adds mission_statement_updated_at (via trigger so any
-- write path updates it, not just the API PATCH). Partial index on
-- already-cached candidates speeds up /school/briefing's stale-count.

ALTER TABLE candidates
  ADD COLUMN IF NOT EXISTS signal_snapshot_vector jsonb;

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS mission_statement_updated_at timestamptz;

CREATE OR REPLACE FUNCTION bump_mission_statement_updated_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.mission_statement IS DISTINCT FROM OLD.mission_statement THEN
    NEW.mission_statement_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mission_statement_updated_at ON tenant_settings;
CREATE TRIGGER trg_mission_statement_updated_at
  BEFORE UPDATE ON tenant_settings
  FOR EACH ROW EXECUTE FUNCTION bump_mission_statement_updated_at();

CREATE INDEX IF NOT EXISTS idx_candidates_briefing_readiness
  ON candidates (tenant_id, cycle_id, status)
  WHERE defensible_language_updated_at IS NOT NULL;
