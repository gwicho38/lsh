/**
 * LSH SaaS Platform TypeScript Type Definitions
 * Mirrors the database schema for multi-tenant support
 */

// ============================================================================
// SUBSCRIPTION TIERS & LIMITS
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'unpaid';

export interface TierLimits {
  organizations: number;
  teamMembers: number;
  secrets: number;
  environments: number;
  auditLogRetentionDays: number;
  apiCallsPerMonth: number;
  ssoEnabled: boolean;
  prioritySupport: boolean;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    organizations: 1,
    teamMembers: 3,
    secrets: 10,
    environments: 3,
    auditLogRetentionDays: 30,
    apiCallsPerMonth: 1000,
    ssoEnabled: false,
    prioritySupport: false,
  },
  pro: {
    organizations: 1,
    teamMembers: Infinity,
    secrets: Infinity,
    environments: Infinity,
    auditLogRetentionDays: 365,
    apiCallsPerMonth: 100000,
    ssoEnabled: false,
    prioritySupport: true,
  },
  enterprise: {
    organizations: Infinity,
    teamMembers: Infinity,
    secrets: Infinity,
    environments: Infinity,
    auditLogRetentionDays: Infinity,
    apiCallsPerMonth: Infinity,
    ssoEnabled: true,
    prioritySupport: true,
  },
};

// ============================================================================
// ORGANIZATIONS
// ============================================================================

/**
 * Organization domain model.
 *
 * Represents a tenant in the multi-tenant SaaS platform.
 * Organizations contain teams, which contain secrets.
 *
 * @see DbOrganizationRecord in database-types.ts for database representation
 */
export interface Organization {
  /** UUID primary key */
  id: string;
  /** Display name (e.g., "Acme Corp") */
  name: string;
  /** URL-friendly identifier, unique across all orgs (e.g., "acme-corp") */
  slug: string;
  /** When the organization was created */
  createdAt: Date;
  /** When the organization was last modified */
  updatedAt: Date;

  // Billing
  /** Stripe customer ID (cus_xxx) for billing operations */
  stripeCustomerId: string | null;
  /** Current subscription tier determining feature limits */
  subscriptionTier: SubscriptionTier;
  /** Current subscription status from Stripe */
  subscriptionStatus: SubscriptionStatus;
  /** When the current subscription period ends */
  subscriptionExpiresAt: Date | null;

  /**
   * Organization settings stored as JSONB.
   *
   * Common keys (not enforced, but documented):
   * - `theme`: 'light' | 'dark' | 'system' - UI preference
   * - `notifications`: { email?: boolean, slack?: boolean } - Alert preferences
   * - `default_environment`: string - Default env for new secrets
   * - `allowed_ips`: string[] - IP whitelist for API access (CIDR notation)
   * - `branding`: { logo_url?: string, primary_color?: string } - Enterprise only
   *
   * @see DbOrganizationSettings in database-types.ts for typed structure
   */
  settings: Record<string, unknown>;

  /** When soft-deleted, null if active */
  deletedAt: Date | null;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  ownerId: string; // User who creates the org becomes owner
}

// ============================================================================
// USERS
// ============================================================================

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpiresAt: Date | null;

  // Password auth
  passwordHash: string | null;

  // OAuth
  oauthProvider: 'google' | 'github' | 'microsoft' | null;
  oauthProviderId: string | null;

  // Profile
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;

  // Session
  lastLoginAt: Date | null;
  lastLoginIp: string | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateUserInput {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  oauthProvider?: 'google' | 'github' | 'microsoft';
  oauthProviderId?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

// ============================================================================
// ORGANIZATION MEMBERS (RBAC)
// ============================================================================

export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationRole;

  // Invitation
  invitedBy: string | null;
  invitedAt: Date;
  acceptedAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMemberDetailed extends OrganizationMember {
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  organizationName: string;
  organizationSlug: string;
}

export interface InviteOrganizationMemberInput {
  email: string;
  role: OrganizationRole;
  invitedBy: string;
}

// ============================================================================
// ROLE PERMISSIONS
// ============================================================================

export interface RolePermissions {
  canManageBilling: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canCreateTeams: boolean;
  canDeleteTeams: boolean;
  canManageSecrets: boolean;
  canViewSecrets: boolean;
  canViewAuditLogs: boolean;
  canManageApiKeys: boolean;
}

export const ROLE_PERMISSIONS: Record<OrganizationRole, RolePermissions> = {
  owner: {
    canManageBilling: true,
    canInviteMembers: true,
    canRemoveMembers: true,
    canCreateTeams: true,
    canDeleteTeams: true,
    canManageSecrets: true,
    canViewSecrets: true,
    canViewAuditLogs: true,
    canManageApiKeys: true,
  },
  admin: {
    canManageBilling: false,
    canInviteMembers: true,
    canRemoveMembers: true,
    canCreateTeams: true,
    canDeleteTeams: true,
    canManageSecrets: true,
    canViewSecrets: true,
    canViewAuditLogs: true,
    canManageApiKeys: true,
  },
  member: {
    canManageBilling: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canCreateTeams: false,
    canDeleteTeams: false,
    canManageSecrets: true,
    canViewSecrets: true,
    canViewAuditLogs: false,
    canManageApiKeys: true,
  },
  viewer: {
    canManageBilling: false,
    canInviteMembers: false,
    canRemoveMembers: false,
    canCreateTeams: false,
    canDeleteTeams: false,
    canManageSecrets: false,
    canViewSecrets: true,
    canViewAuditLogs: false,
    canManageApiKeys: false,
  },
};

// ============================================================================
// TEAMS
// ============================================================================

export interface Team {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  encryptionKeyId: string | null;

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateTeamInput {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
}

// ============================================================================
// TEAM MEMBERS
// ============================================================================

export type TeamRole = 'admin' | 'member' | 'viewer';

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: TeamRole;

  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberDetailed extends TeamMember {
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  teamName: string;
  teamSlug: string;
  organizationId: string;
}

// ============================================================================
// ENCRYPTION KEYS
// ============================================================================

export interface EncryptionKey {
  id: string;
  teamId: string;
  encryptedKey: string; // Encrypted using master key
  keyVersion: number;
  algorithm: string;

  // Rotation
  isActive: boolean;
  rotatedAt: Date | null;
  expiresAt: Date | null;

  createdAt: Date;
  createdBy: string | null;
}

export interface CreateEncryptionKeyInput {
  teamId: string;
  encryptedKey: string;
  algorithm?: string;
  createdBy: string;
}

// ============================================================================
// SECRETS
// ============================================================================

export interface Secret {
  id: string;
  teamId: string;
  environment: string;
  key: string;
  encryptedValue: string;
  encryptionKeyId: string;

  // Metadata
  description: string | null;
  tags: string[];

  // Rotation
  lastRotatedAt: Date | null;
  rotationIntervalDays: number | null;

  // Audit
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
}

export interface CreateSecretInput {
  teamId: string;
  environment: string;
  key: string;
  value: string; // Plain text - will be encrypted
  description?: string;
  tags?: string[];
  rotationIntervalDays?: number;
  createdBy: string;
}

export interface UpdateSecretInput {
  value?: string;
  description?: string;
  tags?: string[];
  rotationIntervalDays?: number;
  updatedBy: string;
}

export interface SecretSummary {
  teamId: string;
  teamName: string;
  environment: string;
  secretsCount: number;
  lastUpdated: Date | null;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export type AuditAction =
  | 'secret.create'
  | 'secret.read'
  | 'secret.update'
  | 'secret.delete'
  | 'team.create'
  | 'team.update'
  | 'team.delete'
  | 'member.invite'
  | 'member.accept'
  | 'member.remove'
  | 'member.role_change'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'organization.create'
  | 'organization.update'
  | 'organization.delete'
  | 'billing.subscription_created'
  | 'billing.subscription_updated'
  | 'billing.subscription_canceled'
  | 'billing.payment_failed';

export type ResourceType = 'secret' | 'team' | 'user' | 'organization' | 'api_key' | 'subscription';

/**
 * Audit log entry for compliance and debugging.
 *
 * Records all significant actions in the system for security auditing
 * and compliance (SOC 2, GDPR, etc.). Retained according to tier limits.
 *
 * @see DbAuditLogRecord in database-types.ts for database representation
 */
export interface AuditLog {
  /** UUID primary key */
  id: string;
  /** FK to organization where action occurred */
  organizationId: string;
  /** FK to team if action was team-scoped, null for org-level actions */
  teamId: string | null;

  // Actor
  /** FK to user who performed the action, null for system actions */
  userId: string | null;
  /** Email of actor at time of action (preserved even if user changes email) */
  userEmail: string | null;

  // Action
  /** What action was performed (e.g., 'secret.create', 'member.invite') */
  action: AuditAction;
  /** Type of resource affected */
  resourceType: ResourceType;
  /** ID of the affected resource */
  resourceId: string | null;

  // Context
  /** IP address of the request */
  ipAddress: string | null;
  /** User agent string from request headers */
  userAgent: string | null;
  /**
   * Additional context specific to the action.
   * Examples:
   * - For secret.create: { environment: 'production' }
   * - For member.invite: { invite_email: 'user@example.com' }
   */
  metadata: Record<string, unknown>;

  // Changes
  /** Previous value before update/delete (for change tracking) */
  oldValue: Record<string, unknown> | null;
  /** New value after create/update (for change tracking) */
  newValue: Record<string, unknown> | null;

  /** When the action occurred */
  timestamp: Date;
}

export interface CreateAuditLogInput {
  organizationId: string;
  teamId?: string;
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export interface Subscription {
  id: string;
  organizationId: string;

  // Stripe
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeProductId: string | null;

  // Plan
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Billing period
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;

  // Trial
  trialStart: Date | null;
  trialEnd: Date | null;

  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
}

export interface CreateSubscriptionInput {
  organizationId: string;
  tier: SubscriptionTier;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeProductId?: string;
}

// ============================================================================
// USAGE METRICS
// ============================================================================

export interface UsageMetrics {
  id: string;
  organizationId: string;

  // Period
  periodStart: Date;
  periodEnd: Date;

  // Metrics
  teamMembersCount: number;
  secretsCount: number;
  environmentsCount: number;
  apiCallsCount: number;
  storageBytes: number;

  calculatedAt: Date;
}

export interface OrganizationUsageSummary {
  organizationId: string;
  name: string;
  slug: string;
  subscriptionTier: SubscriptionTier;
  memberCount: number;
  teamCount: number;
  secretCount: number;
  environmentCount: number;
}

// ============================================================================
// INVOICES
// ============================================================================

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Invoice {
  id: string;
  organizationId: string;

  // Stripe
  stripeInvoiceId: string | null;

  // Details
  number: string | null;
  amountDue: number; // In cents
  amountPaid: number;
  currency: string;

  // Status
  status: InvoiceStatus;

  // Dates
  invoiceDate: Date;
  dueDate: Date | null;
  paidAt: Date | null;

  // PDF
  invoicePdfUrl: string | null;

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API KEYS
// ============================================================================

export interface ApiKey {
  id: string;
  organizationId: string;
  userId: string;

  // Key details
  name: string;
  keyHash: string;
  keyPrefix: string; // e.g., 'lsh_live_abc...'

  // Permissions
  scopes: string[];

  // Usage
  lastUsedAt: Date | null;
  lastUsedIp: string | null;

  // Expiration
  expiresAt: Date | null;

  createdAt: Date;
  revokedAt: Date | null;
  revokedBy: string | null;
}

export interface CreateApiKeyInput {
  organizationId: string;
  userId: string;
  name: string;
  scopes?: string[];
  expiresAt?: Date;
}

export interface ApiKeyWithSecret extends ApiKey {
  secret: string; // Only returned once on creation
}

// ============================================================================
// AUTH & SESSION
// ============================================================================

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface OAuthLoginInput {
  provider: 'google' | 'github' | 'microsoft';
  code: string;
  redirectUri: string;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

/**
 * JWT payload structure for LSH SaaS tokens.
 * Decoded from access tokens.
 */
export interface JwtPayload {
  /** Subject (user ID) */
  sub: string;
  /** User email */
  email: string;
  /** Token type: 'access' | 'refresh' */
  type: 'access' | 'refresh';
  /** Issued at timestamp */
  iat?: number;
  /** Expiration timestamp */
  exp?: number;
  /** Issuer */
  iss?: string;
  /** Audience */
  aud?: string;
}

export interface AuthSession {
  user: User;
  organizations: Organization[];
  currentOrganization?: Organization;
  token: AuthToken;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown> | string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ErrorCode {
  // Auth
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_TOKEN = 'INVALID_TOKEN',

  // Permissions
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INVALID_INPUT = 'INVALID_INPUT',

  // Billing
  TIER_LIMIT_EXCEEDED = 'TIER_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',

  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// ============================================================================
// EXPRESS REQUEST EXTENSIONS
// ============================================================================

import { Request } from 'express';

/**
 * Extended Express Request with authenticated user context
 */
export interface AuthenticatedRequest extends Request {
  user?: User;
  organizationId?: string;
  organization?: Organization;
  membership?: OrganizationMember;
}

/**
 * Error type for catch blocks - prefer unknown for safety
 */
export interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

/**
 * Helper to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Helper to safely extract error for logging
 */
export function getErrorDetails(error: unknown): { message: string; stack?: string; code?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: (error as AppError).code,
    };
  }
  return { message: String(error) };
}

/**
 * Helper to get authenticated user from request.
 * Use after authenticateUser middleware - throws if user not present.
 */
export function getAuthenticatedUser(req: AuthenticatedRequest): User {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown> | string
): ApiResponse<never> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Create a standardized API success response
 */
export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  };
}
