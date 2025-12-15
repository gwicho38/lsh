/**
 * LSH Database Record Types
 *
 * These interfaces represent the exact shape of data returned from Supabase/PostgreSQL.
 * They use snake_case to match database column names, distinguishing them from
 * the domain model types in saas-types.ts which use camelCase.
 *
 * Use these types for:
 * - Typing Supabase query results
 * - Mapping functions that convert DB rows to domain objects
 * - Understanding the database schema without checking migrations
 *
 * @see saas-types.ts for domain model types (camelCase)
 * @see database-schema.ts for schema definitions
 */

// ============================================================================
// ORGANIZATIONS
// ============================================================================

/**
 * Supabase record for the 'organizations' table.
 * Maps to Organization domain type via mapDbOrgToOrg().
 */
export interface DbOrganizationRecord {
  /** UUID primary key */
  id: string;
  /** Display name of the organization */
  name: string;
  /** URL-friendly identifier, unique */
  slug: string;
  /** Stripe customer ID for billing */
  stripe_customer_id: string | null;
  /** Current subscription tier: 'free' | 'pro' | 'enterprise' */
  subscription_tier: 'free' | 'pro' | 'enterprise';
  /** Subscription status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid' */
  subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  /** When the subscription expires (ISO timestamp) */
  subscription_expires_at: string | null;
  /** JSON settings object - see OrganizationSettings for structure */
  settings: DbOrganizationSettings | null;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
  /** ISO timestamp for soft delete, null if active */
  deleted_at: string | null;
}

/**
 * Organization settings stored in the settings JSONB column.
 * Extend this as new settings are added.
 */
export interface DbOrganizationSettings {
  /** UI theme preference */
  theme?: 'light' | 'dark' | 'system';
  /** Email notification preferences */
  notifications?: {
    email?: boolean;
    slack?: boolean;
    webhook_url?: string;
  };
  /** Default environment for new secrets */
  default_environment?: string;
  /** Allowed IP addresses for API access (CIDR notation) */
  allowed_ips?: string[];
  /** Custom branding settings (enterprise only) */
  branding?: {
    logo_url?: string;
    primary_color?: string;
  };
}

// ============================================================================
// USERS
// ============================================================================

/**
 * Supabase record for the 'users' table.
 * Maps to User domain type via mapDbUserToUser().
 */
export interface DbUserRecord {
  /** UUID primary key */
  id: string;
  /** User's email address, lowercase */
  email: string;
  /** Whether email has been verified */
  email_verified: boolean;
  /** Token for email verification (cleared after verification) */
  email_verification_token: string | null;
  /** When verification token expires (ISO timestamp) */
  email_verification_expires_at: string | null;
  /** Bcrypt hash of password, null for OAuth-only users */
  password_hash: string | null;
  /** OAuth provider if using social login */
  oauth_provider: 'google' | 'github' | 'microsoft' | null;
  /** Provider's user ID */
  oauth_provider_id: string | null;
  /** User's first name */
  first_name: string | null;
  /** User's last name */
  last_name: string | null;
  /** URL to avatar image */
  avatar_url: string | null;
  /** Last login timestamp (ISO) */
  last_login_at: string | null;
  /** IP address of last login */
  last_login_ip: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
  /** ISO timestamp for soft delete, null if active */
  deleted_at: string | null;
}

// ============================================================================
// ORGANIZATION MEMBERS
// ============================================================================

/**
 * Supabase record for the 'organization_members' table.
 * Maps to OrganizationMember domain type via mapDbMemberToMember().
 */
export interface DbOrganizationMemberRecord {
  /** UUID primary key */
  id: string;
  /** FK to organizations.id */
  organization_id: string;
  /** FK to users.id */
  user_id: string;
  /** Role within organization */
  role: 'owner' | 'admin' | 'member' | 'viewer';
  /** FK to users.id of inviter, null if original owner */
  invited_by: string | null;
  /** When invitation was sent (ISO timestamp) */
  invited_at: string;
  /** When invitation was accepted (ISO timestamp), null if pending */
  accepted_at: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
}

/**
 * Supabase record from 'organization_members_detailed' view.
 * Joins organization_members with users and organizations tables.
 * Maps to OrganizationMemberDetailed domain type.
 */
export interface DbOrganizationMemberDetailedRecord extends DbOrganizationMemberRecord {
  /** User's email (from users table) */
  email: string;
  /** User's first name (from users table) */
  first_name: string | null;
  /** User's last name (from users table) */
  last_name: string | null;
  /** User's avatar URL (from users table) */
  avatar_url: string | null;
  /** User's last login (from users table) */
  last_login_at: string | null;
  /** Organization name (from organizations table) */
  organization_name: string;
  /** Organization slug (from organizations table) */
  organization_slug: string;
}

// ============================================================================
// TEAMS
// ============================================================================

/**
 * Supabase record for the 'teams' table.
 * Maps to Team domain type via mapDbTeamToTeam().
 */
export interface DbTeamRecord {
  /** UUID primary key */
  id: string;
  /** FK to organizations.id */
  organization_id: string;
  /** Display name of the team */
  name: string;
  /** URL-friendly identifier, unique within org */
  slug: string;
  /** Optional description */
  description: string | null;
  /** FK to encryption_keys.id for team's active key */
  encryption_key_id: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
  /** ISO timestamp for soft delete, null if active */
  deleted_at: string | null;
}

/**
 * Supabase record for the 'team_members' table.
 * Maps to TeamMember domain type via mapDbTeamMemberToTeamMember().
 */
export interface DbTeamMemberRecord {
  /** UUID primary key */
  id: string;
  /** FK to teams.id */
  team_id: string;
  /** FK to users.id */
  user_id: string;
  /** Role within team */
  role: 'admin' | 'member' | 'viewer';
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
}

/**
 * Supabase record from 'team_members_detailed' view.
 * Joins team_members with users and teams tables.
 */
export interface DbTeamMemberDetailedRecord extends DbTeamMemberRecord {
  /** User's email (from users table) */
  email: string;
  /** User's first name (from users table) */
  first_name: string | null;
  /** User's last name (from users table) */
  last_name: string | null;
  /** User's avatar URL (from users table) */
  avatar_url: string | null;
  /** Team name (from teams table) */
  team_name: string;
  /** Team slug (from teams table) */
  team_slug: string;
  /** Organization ID (from teams table) */
  organization_id: string;
}

// ============================================================================
// SECRETS
// ============================================================================

/**
 * Supabase record for the 'secrets' table.
 * Maps to Secret domain type via mapDbSecretToSecret().
 */
export interface DbSecretRecord {
  /** UUID primary key */
  id: string;
  /** FK to teams.id */
  team_id: string;
  /** Environment name (e.g., 'dev', 'staging', 'production') */
  environment: string;
  /** Secret key name (e.g., 'DATABASE_URL') */
  key: string;
  /** AES-256 encrypted value */
  encrypted_value: string;
  /** FK to encryption_keys.id */
  encryption_key_id: string;
  /** Optional description */
  description: string | null;
  /** JSON array of tags, stored as string */
  tags: string | string[];
  /** Last rotation timestamp (ISO) */
  last_rotated_at: string | null;
  /** Days between automatic rotations, null if manual only */
  rotation_interval_days: number | null;
  /** ISO timestamp when created */
  created_at: string;
  /** FK to users.id who created */
  created_by: string | null;
  /** ISO timestamp when last updated */
  updated_at: string;
  /** FK to users.id who last updated */
  updated_by: string | null;
  /** ISO timestamp for soft delete, null if active */
  deleted_at: string | null;
  /** FK to users.id who deleted */
  deleted_by: string | null;
}

/**
 * Supabase record from 'secrets_summary' view.
 * Aggregated secrets data by team and environment.
 */
export interface DbSecretsSummaryRecord {
  /** FK to teams.id */
  team_id: string;
  /** Team name (from teams table) */
  team_name: string;
  /** Environment name */
  environment: string;
  /** Count of secrets in this team/environment */
  secrets_count: number;
  /** Most recent update timestamp (ISO) */
  last_updated: string | null;
}

// ============================================================================
// SUBSCRIPTIONS & BILLING
// ============================================================================

/**
 * Supabase record for the 'subscriptions' table.
 * Maps to Subscription domain type via mapDbSubscriptionToSubscription().
 */
export interface DbSubscriptionRecord {
  /** UUID primary key */
  id: string;
  /** FK to organizations.id */
  organization_id: string;
  /** Stripe subscription ID (sub_xxx) */
  stripe_subscription_id: string | null;
  /** Stripe price ID (price_xxx) */
  stripe_price_id: string | null;
  /** Stripe product ID (prod_xxx) */
  stripe_product_id: string | null;
  /** Subscription tier */
  tier: 'free' | 'pro' | 'enterprise';
  /** Subscription status */
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';
  /** Current billing period start (ISO timestamp) */
  current_period_start: string | null;
  /** Current billing period end (ISO timestamp) */
  current_period_end: string | null;
  /** Whether subscription will cancel at period end */
  cancel_at_period_end: boolean;
  /** Trial start (ISO timestamp) */
  trial_start: string | null;
  /** Trial end (ISO timestamp) */
  trial_end: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
  /** When subscription was canceled (ISO timestamp) */
  canceled_at: string | null;
}

/**
 * Supabase record for the 'invoices' table.
 * Maps to Invoice domain type via mapDbInvoiceToInvoice().
 */
export interface DbInvoiceRecord {
  /** UUID primary key */
  id: string;
  /** FK to organizations.id */
  organization_id: string;
  /** Stripe invoice ID (in_xxx) */
  stripe_invoice_id: string | null;
  /** Invoice number (e.g., 'INV-0001') */
  number: string | null;
  /** Amount due in cents */
  amount_due: number;
  /** Amount paid in cents */
  amount_paid: number;
  /** Currency code (e.g., 'USD') */
  currency: string;
  /** Invoice status */
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  /** Invoice date (ISO timestamp) */
  invoice_date: string;
  /** Due date (ISO timestamp) */
  due_date: string | null;
  /** When paid (ISO timestamp) */
  paid_at: string | null;
  /** URL to PDF invoice */
  invoice_pdf_url: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** ISO timestamp when last updated */
  updated_at: string;
}

// ============================================================================
// ENCRYPTION KEYS
// ============================================================================

/**
 * Supabase record for the 'encryption_keys' table.
 * Maps to EncryptionKey domain type.
 */
export interface DbEncryptionKeyRecord {
  /** UUID primary key */
  id: string;
  /** FK to teams.id */
  team_id: string;
  /** AES key encrypted with master key */
  encrypted_key: string;
  /** Key version for rotation tracking */
  key_version: number;
  /** Encryption algorithm (e.g., 'aes-256-cbc') */
  algorithm: string;
  /** Whether this is the active key for the team */
  is_active: boolean;
  /** When key was last rotated (ISO timestamp) */
  rotated_at: string | null;
  /** When key expires (ISO timestamp), null if no expiry */
  expires_at: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** FK to users.id who created the key */
  created_by: string | null;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

/**
 * Supabase record for the 'audit_logs' table.
 * Maps to AuditLog domain type.
 */
export interface DbAuditLogRecord {
  /** UUID primary key */
  id: string;
  /** FK to organizations.id */
  organization_id: string;
  /** FK to teams.id, null for org-level actions */
  team_id: string | null;
  /** FK to users.id who performed action */
  user_id: string | null;
  /** Email of user at time of action */
  user_email: string | null;
  /** Action performed (e.g., 'secret.create') */
  action: string;
  /** Type of resource affected */
  resource_type: 'secret' | 'team' | 'user' | 'organization' | 'api_key' | 'subscription';
  /** ID of affected resource */
  resource_id: string | null;
  /** IP address of request */
  ip_address: string | null;
  /** User agent of request */
  user_agent: string | null;
  /** Additional context as JSON */
  metadata: Record<string, unknown> | null;
  /** Previous value (for updates) */
  old_value: Record<string, unknown> | null;
  /** New value (for creates/updates) */
  new_value: Record<string, unknown> | null;
  /** ISO timestamp when action occurred */
  timestamp: string;
}

// ============================================================================
// API KEYS
// ============================================================================

/**
 * Supabase record for the 'api_keys' table.
 * Maps to ApiKey domain type.
 */
export interface DbApiKeyRecord {
  /** UUID primary key */
  id: string;
  /** FK to organizations.id */
  organization_id: string;
  /** FK to users.id who created the key */
  user_id: string;
  /** Display name for the key */
  name: string;
  /** SHA-256 hash of the key for lookup */
  key_hash: string;
  /** First 8 chars of key for display (lsh_live_xxx...) */
  key_prefix: string;
  /** Array of permission scopes */
  scopes: string[];
  /** When key was last used (ISO timestamp) */
  last_used_at: string | null;
  /** IP address of last use */
  last_used_ip: string | null;
  /** When key expires (ISO timestamp), null if no expiry */
  expires_at: string | null;
  /** ISO timestamp when created */
  created_at: string;
  /** When key was revoked (ISO timestamp), null if active */
  revoked_at: string | null;
  /** FK to users.id who revoked the key */
  revoked_by: string | null;
}

// ============================================================================
// USAGE METRICS
// ============================================================================

/**
 * Supabase record from 'organization_usage_summary' view.
 * Aggregated usage data for organizations.
 */
export interface DbOrganizationUsageSummaryRecord {
  /** FK to organizations.id */
  organization_id: string;
  /** Organization name */
  name: string;
  /** Organization slug */
  slug: string;
  /** Current subscription tier */
  subscription_tier: 'free' | 'pro' | 'enterprise';
  /** Count of organization members */
  member_count: number;
  /** Count of teams */
  team_count: number;
  /** Count of secrets across all teams */
  secret_count: number;
  /** Count of unique environments */
  environment_count: number;
}

// ============================================================================
// STRIPE WEBHOOK TYPES
// ============================================================================

/**
 * Stripe checkout session object (from checkout.session.completed webhook).
 * Partial type - only includes fields we use.
 */
export interface StripeCheckoutSession {
  id: string;
  metadata?: {
    organization_id?: string;
  };
  customer?: string;
  subscription?: string;
}

/**
 * Stripe subscription object (from customer.subscription.* webhooks).
 * Partial type - only includes fields we use.
 */
export interface StripeSubscriptionEvent {
  id: string;
  status: string;
  current_period_start: number; // Unix timestamp
  current_period_end: number; // Unix timestamp
  cancel_at_period_end: boolean;
  trial_start: number | null;
  trial_end: number | null;
  metadata?: {
    organization_id?: string;
  };
  items?: {
    data: Array<{
      price?: {
        id: string;
        product: string;
      };
    }>;
  };
}

/**
 * Stripe invoice object (from invoice.* webhooks).
 * Partial type - only includes fields we use.
 */
export interface StripeInvoiceEvent {
  id: string;
  number: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number; // Unix timestamp
  invoice_pdf: string | null;
  status_transitions?: {
    paid_at: number | null;
  };
  subscription_metadata?: {
    organization_id?: string;
  };
}

// ============================================================================
// TYPE GUARDS & UTILITIES
// ============================================================================

/**
 * Type guard to check if a value is a valid DbOrganizationRecord.
 * Useful for runtime validation of Supabase responses.
 */
export function isDbOrganizationRecord(value: unknown): value is DbOrganizationRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.slug === 'string' &&
    typeof record.created_at === 'string'
  );
}

/**
 * Type guard to check if a value is a valid DbUserRecord.
 */
export function isDbUserRecord(value: unknown): value is DbUserRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.email === 'string' &&
    typeof record.created_at === 'string'
  );
}

/**
 * Type guard to check if a value is a valid DbSecretRecord.
 */
export function isDbSecretRecord(value: unknown): value is DbSecretRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.team_id === 'string' &&
    typeof record.key === 'string' &&
    typeof record.encrypted_value === 'string'
  );
}

/**
 * Parse tags from database - handles both string JSON and array formats.
 */
export function parseDbTags(tags: string | string[] | null | undefined): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try {
      return JSON.parse(tags);
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Safely parse an ISO timestamp string to Date.
 * Returns null for null/undefined input.
 */
export function parseDbTimestamp(timestamp: string | null | undefined): Date | null {
  if (!timestamp) return null;
  return new Date(timestamp);
}

/**
 * Safely parse an ISO timestamp string to Date.
 * Returns current date for null/undefined input.
 */
export function parseDbTimestampRequired(timestamp: string | null | undefined): Date {
  if (!timestamp) return new Date();
  return new Date(timestamp);
}
