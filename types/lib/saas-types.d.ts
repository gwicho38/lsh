/**
 * LSH SaaS Platform TypeScript Type Definitions
 * Mirrors the database schema for multi-tenant support
 */
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
export declare const TIER_LIMITS: Record<SubscriptionTier, TierLimits>;
export interface Organization {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
    stripeCustomerId: string | null;
    subscriptionTier: SubscriptionTier;
    subscriptionStatus: SubscriptionStatus;
    subscriptionExpiresAt: Date | null;
    settings: Record<string, any>;
    deletedAt: Date | null;
}
export interface CreateOrganizationInput {
    name: string;
    slug: string;
    ownerId: string;
}
export interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationExpiresAt: Date | null;
    passwordHash: string | null;
    oauthProvider: 'google' | 'github' | 'microsoft' | null;
    oauthProviderId: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
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
export type OrganizationRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface OrganizationMember {
    id: string;
    organizationId: string;
    userId: string;
    role: OrganizationRole;
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
export declare const ROLE_PERMISSIONS: Record<OrganizationRole, RolePermissions>;
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
export interface EncryptionKey {
    id: string;
    teamId: string;
    encryptedKey: string;
    keyVersion: number;
    algorithm: string;
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
export interface Secret {
    id: string;
    teamId: string;
    environment: string;
    key: string;
    encryptedValue: string;
    encryptionKeyId: string;
    description: string | null;
    tags: string[];
    lastRotatedAt: Date | null;
    rotationIntervalDays: number | null;
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
    value: string;
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
export type AuditAction = 'secret.create' | 'secret.read' | 'secret.update' | 'secret.delete' | 'team.create' | 'team.update' | 'team.delete' | 'member.invite' | 'member.accept' | 'member.remove' | 'member.role_change' | 'api_key.create' | 'api_key.revoke' | 'organization.create' | 'organization.update' | 'organization.delete' | 'billing.subscription_created' | 'billing.subscription_updated' | 'billing.subscription_canceled' | 'billing.payment_failed';
export type ResourceType = 'secret' | 'team' | 'user' | 'organization' | 'api_key' | 'subscription';
export interface AuditLog {
    id: string;
    organizationId: string;
    teamId: string | null;
    userId: string | null;
    userEmail: string | null;
    action: AuditAction;
    resourceType: ResourceType;
    resourceId: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: Record<string, any>;
    oldValue: Record<string, any> | null;
    newValue: Record<string, any> | null;
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
    metadata?: Record<string, any>;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
}
export interface Subscription {
    id: string;
    organizationId: string;
    stripeSubscriptionId: string | null;
    stripePriceId: string | null;
    stripeProductId: string | null;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
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
export interface UsageMetrics {
    id: string;
    organizationId: string;
    periodStart: Date;
    periodEnd: Date;
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
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
export interface Invoice {
    id: string;
    organizationId: string;
    stripeInvoiceId: string | null;
    number: string | null;
    amountDue: number;
    amountPaid: number;
    currency: string;
    status: InvoiceStatus;
    invoiceDate: Date;
    dueDate: Date | null;
    paidAt: Date | null;
    invoicePdfUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface ApiKey {
    id: string;
    organizationId: string;
    userId: string;
    name: string;
    keyHash: string;
    keyPrefix: string;
    scopes: string[];
    lastUsedAt: Date | null;
    lastUsedIp: string | null;
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
    secret: string;
}
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
export interface AuthSession {
    user: User;
    organizations: Organization[];
    currentOrganization?: Organization;
    token: AuthToken;
}
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
export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED",
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
    INVALID_TOKEN = "INVALID_TOKEN",
    FORBIDDEN = "FORBIDDEN",
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS",
    NOT_FOUND = "NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    INVALID_INPUT = "INVALID_INPUT",
    TIER_LIMIT_EXCEEDED = "TIER_LIMIT_EXCEEDED",
    SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED",
    PAYMENT_REQUIRED = "PAYMENT_REQUIRED",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
}
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> & {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
}[Keys];
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
export declare function getErrorMessage(error: unknown): string;
/**
 * Helper to safely extract error for logging
 */
export declare function getErrorDetails(error: unknown): {
    message: string;
    stack?: string;
    code?: string;
};
/**
 * Helper to get authenticated user from request.
 * Use after authenticateUser middleware - throws if user not present.
 */
export declare function getAuthenticatedUser(req: AuthenticatedRequest): User;
/**
 * Create a standardized API error response
 */
export declare function createErrorResponse(code: ErrorCode, message: string, details?: Record<string, unknown> | string): ApiResponse<never>;
/**
 * Create a standardized API success response
 */
export declare function createSuccessResponse<T>(data: T): ApiResponse<T>;
