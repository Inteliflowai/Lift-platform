-- Trial events table
-- Records every meaningful action a trial school takes (first occurrence wins)
CREATE TABLE trial_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'day1_login',
    'first_candidate_invited',
    'first_candidate_completed',
    'evaluator_workspace_opened',
    'tri_report_viewed',
    'pdf_downloaded',
    'support_plan_viewed',
    'cohort_export_downloaded',
    'evaluator_intelligence_opened'
  )),
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Only one record per event type per tenant (first occurrence wins)
CREATE UNIQUE INDEX trial_events_tenant_event_unique
  ON trial_events(tenant_id, event_type);

-- RLS
ALTER TABLE trial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON trial_events FOR ALL USING (
  tenant_id IN (SELECT tenant_id FROM user_tenant_roles WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM user_tenant_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

-- Trial health view
-- One row per active trial tenant with all health signals computed
CREATE OR REPLACE VIEW trial_health AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.slug,
  l.trial_ends_at,
  l.tier,
  l.status AS license_status,
  EXTRACT(DAY FROM (l.trial_ends_at - now()))::int AS days_remaining,
  EXTRACT(DAY FROM (now() - l.trial_starts_at))::int AS days_since_signup,

  -- Day 1 login
  EXISTS (
    SELECT 1 FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'day1_login'
  ) AS day1_login,

  -- First candidate invited
  EXISTS (
    SELECT 1 FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_invited'
  ) AS candidate_invited,

  -- First candidate completed
  EXISTS (
    SELECT 1 FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_completed'
  ) AS candidate_completed,

  -- Day candidate was first completed (days after signup)
  (
    SELECT EXTRACT(DAY FROM (te.created_at - l.trial_starts_at))::int
    FROM trial_events te
    WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_completed'
    LIMIT 1
  ) AS first_session_day,

  -- Feature depth score (0-7)
  (
    SELECT COUNT(DISTINCT event_type)::int
    FROM trial_events te
    WHERE te.tenant_id = t.id
    AND te.event_type IN (
      'first_candidate_invited',
      'first_candidate_completed',
      'evaluator_workspace_opened',
      'tri_report_viewed',
      'pdf_downloaded',
      'support_plan_viewed',
      'evaluator_intelligence_opened'
    )
  ) AS feature_depth_score,

  -- Last event timestamp
  (
    SELECT MAX(created_at) FROM trial_events te
    WHERE te.tenant_id = t.id
  ) AS last_event_at,

  -- Total candidates with completed sessions
  (
    SELECT COUNT(*) FROM sessions s
    WHERE s.tenant_id = t.id AND s.status = 'completed'
  )::int AS total_candidates_run,

  -- Event types completed (for tooltip)
  (
    SELECT array_agg(DISTINCT event_type)
    FROM trial_events te
    WHERE te.tenant_id = t.id
  ) AS completed_events,

  -- Health status computed
  CASE
    WHEN EXTRACT(DAY FROM (now() - l.trial_starts_at)) >= 1
      AND NOT EXISTS (
        SELECT 1 FROM trial_events te
        WHERE te.tenant_id = t.id AND te.event_type = 'day1_login'
      )
    THEN 'at_risk'
    WHEN EXTRACT(DAY FROM (now() - l.trial_starts_at)) >= 7
      AND NOT EXISTS (
        SELECT 1 FROM trial_events te
        WHERE te.tenant_id = t.id AND te.event_type = 'first_candidate_completed'
      )
    THEN 'at_risk'
    WHEN EXTRACT(DAY FROM (now() - l.trial_starts_at)) >= 14
      AND (
        SELECT COUNT(DISTINCT event_type) FROM trial_events te
        WHERE te.tenant_id = t.id
      ) < 3
    THEN 'at_risk'
    ELSE 'healthy'
  END AS health_status

FROM tenants t
INNER JOIN tenant_licenses l ON l.tenant_id = t.id
WHERE l.status = 'trialing'
  AND l.trial_ends_at > now();
