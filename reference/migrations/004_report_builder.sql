CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'Outros',
  target_layout VARCHAR(20) NOT NULL DEFAULT 'responsive',
  content_mode VARCHAR(20) NOT NULL DEFAULT 'both',
  sql_query TEXT NOT NULL,
  layout JSONB NOT NULL DEFAULT '{}',
  filters JSONB DEFAULT '[]',
  subreports JSONB DEFAULT '[]',
  charts JSONB DEFAULT '[]',
  allowed_users UUID[] DEFAULT NULL,
  allowed_groups UUID[] DEFAULT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_report_templates_category ON report_templates(category);
CREATE INDEX IF NOT EXISTS idx_report_templates_active ON report_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);
