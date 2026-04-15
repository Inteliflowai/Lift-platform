-- Auto-invite settings on tenant_settings
ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS auto_invite_on_import boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS invite_deadline_days int DEFAULT 7;

-- Invitation log — tracks every invite send with trigger source
CREATE TABLE IF NOT EXISTS invitation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  invite_id uuid REFERENCES invites(id) ON DELETE SET NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('manual', 'bulk_send', 'import', 'sis_webhook', 'resend')),
  triggered_by_user_id uuid REFERENCES users(id),
  triggered_by_sis text,
  email_sent_to text NOT NULL,
  email_sent_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitation_log_candidate ON invitation_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_invitation_log_tenant ON invitation_log(tenant_id);

ALTER TABLE invitation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invitation_log FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);
