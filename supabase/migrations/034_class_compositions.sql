-- Saved class compositions (draft and confirmed)
CREATE TABLE IF NOT EXISTS class_compositions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cycle_id uuid NOT NULL REFERENCES application_cycles(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Incoming Class Draft',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'archived')),
  candidate_ids uuid[] NOT NULL DEFAULT '{}',
  composition_snapshot jsonb DEFAULT '{}',
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_compositions_tenant_cycle ON class_compositions(tenant_id, cycle_id);

ALTER TABLE class_compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON class_compositions FOR ALL USING (
  is_platform_admin() OR tenant_id IN (SELECT user_tenant_ids())
);
