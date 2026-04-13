-- Demo sessions for one-click live demo
CREATE TABLE demo_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  tenant_id uuid REFERENCES tenants(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  ip_address text,
  user_agent text,
  converted_to_trial boolean DEFAULT false,
  converted_at timestamptz,
  hl_contact_id text,
  page_views int DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text
);

CREATE INDEX idx_demo_sessions_token ON demo_sessions(token);
CREATE INDEX idx_demo_sessions_expires ON demo_sessions(expires_at);

-- No RLS — accessed via admin client only
