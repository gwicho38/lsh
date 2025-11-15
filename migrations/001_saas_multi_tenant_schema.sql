-- LSH SaaS Multi-Tenant Schema Migration
-- Version: 1.0.0
-- Description: Adds multi-tenant support with organizations, teams, RBAC, and billing

-- ============================================================================
-- ORGANIZATIONS (Top-level tenant)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-friendly identifier
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Billing
  stripe_customer_id VARCHAR(255) UNIQUE,
  subscription_tier VARCHAR(50) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- USERS (Authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255),
  email_verification_expires_at TIMESTAMP WITH TIME ZONE,

  -- Password authentication
  password_hash VARCHAR(255), -- bcrypt hash

  -- OAuth
  oauth_provider VARCHAR(50), -- 'google', 'github', 'microsoft', etc.
  oauth_provider_id VARCHAR(255),

  -- Profile
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,

  -- Session management
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip INET,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Soft delete
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_provider_id);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- ORGANIZATION MEMBERS (User-Organization relationship with roles)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Role-based access control
  role VARCHAR(50) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

  -- Invitation workflow
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_members_org ON organization_members(organization_id);
CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(role);

-- ============================================================================
-- TEAMS (Sub-organizations for grouping secrets/environments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- URL-friendly identifier within org
  description TEXT,

  -- Encryption (per-team encryption keys)
  encryption_key_id UUID, -- References encryption_keys table

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(organization_id, slug),
  CONSTRAINT valid_team_slug CHECK (slug ~ '^[a-z0-9-]+$')
);

CREATE INDEX idx_teams_org ON teams(organization_id);
CREATE INDEX idx_teams_slug ON teams(organization_id, slug);
CREATE INDEX idx_teams_deleted_at ON teams(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TEAM MEMBERS (User-Team assignments)
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Team-level role (optional, can inherit from org role)
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_user ON team_members(user_id);

-- ============================================================================
-- ENCRYPTION KEYS (Per-team encryption keys, encrypted at rest)
-- ============================================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Encrypted key material (encrypted using master key from env)
  encrypted_key TEXT NOT NULL,
  key_version INTEGER DEFAULT 1,
  algorithm VARCHAR(50) DEFAULT 'AES-256-CBC',

  -- Key rotation
  is_active BOOLEAN DEFAULT TRUE,
  rotated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(team_id, key_version)
);

CREATE INDEX idx_encryption_keys_team ON encryption_keys(team_id);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(team_id, is_active) WHERE is_active = TRUE;

-- Update teams table to link to encryption keys
ALTER TABLE teams ADD CONSTRAINT fk_teams_encryption_key
  FOREIGN KEY (encryption_key_id) REFERENCES encryption_keys(id);

-- ============================================================================
-- SECRETS (Enhanced with multi-tenant support)
-- ============================================================================
-- Note: Extends existing secrets storage from LSH
CREATE TABLE IF NOT EXISTS secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,

  -- Secret identification
  environment VARCHAR(100) NOT NULL, -- 'dev', 'staging', 'production', etc.
  key VARCHAR(255) NOT NULL,

  -- Encrypted value (using team's encryption key)
  encrypted_value TEXT NOT NULL,
  encryption_key_id UUID NOT NULL REFERENCES encryption_keys(id),

  -- Metadata
  description TEXT,
  tags JSONB DEFAULT '[]',

  -- Rotation
  last_rotated_at TIMESTAMP WITH TIME ZONE,
  rotation_interval_days INTEGER,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES users(id),

  UNIQUE(team_id, environment, key)
);

CREATE INDEX idx_secrets_team ON secrets(team_id);
CREATE INDEX idx_secrets_environment ON secrets(team_id, environment);
CREATE INDEX idx_secrets_deleted_at ON secrets(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_secrets_rotation ON secrets(last_rotated_at, rotation_interval_days)
  WHERE rotation_interval_days IS NOT NULL;

-- ============================================================================
-- AUDIT LOGS (Comprehensive audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- Actor
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_email VARCHAR(255), -- Denormalized for retention

  -- Action
  action VARCHAR(100) NOT NULL, -- 'secret.create', 'secret.read', 'secret.update', 'secret.delete', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'secret', 'team', 'user', etc.
  resource_id UUID,

  -- Context
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',

  -- Changes (for update operations)
  old_value JSONB,
  new_value JSONB,

  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id, timestamp DESC);
CREATE INDEX idx_audit_logs_team ON audit_logs(team_id, timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- ============================================================================
-- SUBSCRIPTIONS (Billing details)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_subscription_id VARCHAR(255) UNIQUE,
  stripe_price_id VARCHAR(255),
  stripe_product_id VARCHAR(255),

  -- Plan details
  tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid')),

  -- Billing period
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Trial
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  canceled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================================================
-- USAGE METRICS (Track usage against tier limits)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Metrics
  team_members_count INTEGER DEFAULT 0,
  secrets_count INTEGER DEFAULT 0,
  environments_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,

  -- Calculated at
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(organization_id, period_start)
);

CREATE INDEX idx_usage_metrics_org ON usage_metrics(organization_id, period_start DESC);

-- ============================================================================
-- INVOICES (Generated invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Stripe integration
  stripe_invoice_id VARCHAR(255) UNIQUE,

  -- Invoice details
  number VARCHAR(100) UNIQUE,
  amount_due INTEGER NOT NULL, -- In cents
  amount_paid INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Status
  status VARCHAR(50) NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

  -- Dates
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- PDF
  invoice_pdf_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id, invoice_date DESC);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- ============================================================================
-- API KEYS (For CLI authentication)
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Key details
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) UNIQUE NOT NULL, -- bcrypt hash of the key
  key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification (e.g., 'lsh_live_abc...')

  -- Permissions
  scopes JSONB DEFAULT '["read", "write"]', -- Array of permission scopes

  -- Usage tracking
  last_used_at TIMESTAMP WITH TIME ZONE,
  last_used_ip INET,

  -- Expiration
  expires_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  revoked_by UUID REFERENCES users(id)
);

CREATE INDEX idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_members_updated_at BEFORE UPDATE ON organization_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_secrets_updated_at BEFORE UPDATE ON secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable for Supabase
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic - will be enhanced with proper auth)
-- Users can see their own data
CREATE POLICY users_select_own ON users
  FOR SELECT USING (auth.uid() = id);

-- Organization members can see their organization
CREATE POLICY org_members_select ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- Team members can see their teams
CREATE POLICY team_members_select ON team_members
  FOR SELECT USING (user_id = auth.uid());

-- Users can only see secrets from teams they belong to
CREATE POLICY secrets_select_team_member ON secrets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = secrets.team_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Audit logs visible to org members
CREATE POLICY audit_logs_select_org_member ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = audit_logs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- SEED DATA (Development)
-- ============================================================================

-- Default free tier limits (stored in a settings table or config)
COMMENT ON COLUMN organizations.subscription_tier IS
  'Free: 3 members, 10 secrets, 3 envs, 30d audit | Pro: unlimited | Enterprise: custom';

-- ============================================================================
-- VIEWS (Convenience views for common queries)
-- ============================================================================

-- Organization members with user details
CREATE VIEW organization_members_detailed AS
SELECT
  om.*,
  u.email,
  u.first_name,
  u.last_name,
  u.avatar_url,
  u.last_login_at,
  o.name AS organization_name,
  o.slug AS organization_slug
FROM organization_members om
JOIN users u ON om.user_id = u.id
JOIN organizations o ON om.organization_id = o.id
WHERE u.deleted_at IS NULL AND o.deleted_at IS NULL;

-- Team members with user and team details
CREATE VIEW team_members_detailed AS
SELECT
  tm.*,
  u.email,
  u.first_name,
  u.last_name,
  u.avatar_url,
  t.name AS team_name,
  t.slug AS team_slug,
  t.organization_id
FROM team_members tm
JOIN users u ON tm.user_id = u.id
JOIN teams t ON tm.team_id = t.id
WHERE u.deleted_at IS NULL AND t.deleted_at IS NULL;

-- Active secrets by team
CREATE VIEW secrets_summary AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  s.environment,
  COUNT(*) AS secrets_count,
  MAX(s.updated_at) AS last_updated
FROM teams t
LEFT JOIN secrets s ON t.id = s.team_id AND s.deleted_at IS NULL
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, s.environment;

-- Organization usage summary
CREATE VIEW organization_usage_summary AS
SELECT
  o.id AS organization_id,
  o.name,
  o.slug,
  o.subscription_tier,
  COUNT(DISTINCT om.user_id) AS member_count,
  COUNT(DISTINCT t.id) AS team_count,
  COUNT(DISTINCT s.id) AS secret_count,
  COUNT(DISTINCT s.environment) AS environment_count
FROM organizations o
LEFT JOIN organization_members om ON o.id = om.organization_id
LEFT JOIN teams t ON o.id = t.organization_id AND t.deleted_at IS NULL
LEFT JOIN secrets s ON t.id = s.team_id AND s.deleted_at IS NULL
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.slug, o.subscription_tier;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_secrets_team_env_key ON secrets(team_id, environment, key) WHERE deleted_at IS NULL;
CREATE INDEX idx_team_members_team_user ON team_members(team_id, user_id);
CREATE INDEX idx_org_members_org_user ON organization_members(organization_id, user_id);

-- Partial indexes for active records
CREATE INDEX idx_api_keys_active ON api_keys(organization_id, user_id)
  WHERE revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW());

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE organizations IS 'Top-level tenant container for multi-tenancy';
COMMENT ON TABLE users IS 'User accounts with email/OAuth authentication';
COMMENT ON TABLE organization_members IS 'User-organization relationships with RBAC roles';
COMMENT ON TABLE teams IS 'Sub-organizations for grouping secrets and environments';
COMMENT ON TABLE team_members IS 'User-team assignments';
COMMENT ON TABLE encryption_keys IS 'Per-team encryption keys (encrypted at rest)';
COMMENT ON TABLE secrets IS 'Encrypted secrets storage with multi-tenant support';
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all actions';
COMMENT ON TABLE subscriptions IS 'Stripe subscription management';
COMMENT ON TABLE usage_metrics IS 'Usage tracking for billing and tier limits';
COMMENT ON TABLE invoices IS 'Generated invoices from Stripe';
COMMENT ON TABLE api_keys IS 'API keys for CLI authentication';
