-- Structured interviewer observation notes — linked to LIFT briefing observations/questions
CREATE TABLE IF NOT EXISTS interviewer_observation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES users(id),

  note_type text NOT NULL CHECK (note_type IN ('observation_response', 'question_response', 'free_note')),

  -- Link to specific LIFT briefing item (null for free_note)
  linked_observation_text text,
  linked_question_text text,

  note_text text NOT NULL,

  -- Sentiment relative to the LIFT observation
  sentiment text CHECK (sentiment IS NULL OR sentiment IN ('confirms', 'contradicts', 'expands', 'unclear')),

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obs_notes_candidate ON interviewer_observation_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_obs_notes_tenant ON interviewer_observation_notes(tenant_id);

ALTER TABLE interviewer_observation_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON interviewer_observation_notes FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);
