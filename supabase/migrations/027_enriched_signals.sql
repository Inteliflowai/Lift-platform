-- Enriched learning support signals (behavioral observations)
ALTER TABLE learning_support_signals
ADD COLUMN IF NOT EXISTS enriched_signals jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS enriched_signal_count int DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_notable_signals boolean DEFAULT false;

-- Index for finding sessions with notable signals
CREATE INDEX IF NOT EXISTS idx_learning_support_notable
  ON learning_support_signals(has_notable_signals)
  WHERE has_notable_signals = true;
