-- Track which tooltips each user has dismissed
CREATE TABLE tooltip_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tooltip_id text NOT NULL,
  dismissed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, tooltip_id)
);

CREATE INDEX idx_tooltip_dismissals_user ON tooltip_dismissals(user_id);

ALTER TABLE tooltip_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own dismissals"
  ON tooltip_dismissals FOR ALL
  USING (user_id = auth.uid());
