-- Email delivery log
CREATE TABLE email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
  error_message text,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform_admin_read" ON email_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_tenant_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
);

CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status) WHERE status = 'failed';
