/**
 * LSH SaaS Organization & Team Management Service
 * Handles organizations, teams, members, and RBAC
 */
import type { Organization, CreateOrganizationInput, Team, CreateTeamInput, OrganizationMember, OrganizationMemberDetailed, OrganizationRole, TeamMember, TeamRole, OrganizationUsageSummary } from './saas-types.js';
import type { DbTeamMemberDetailedRecord } from './database-types.js';
/**
 * Organization Service
 */
export declare class OrganizationService {
    private supabase;
    /**
     * Create a new organization
     */
    createOrganization(input: CreateOrganizationInput): Promise<Organization>;
    /**
     * Get organization by ID
     */
    getOrganizationById(id: string): Promise<Organization | null>;
    /**
     * Get organization by slug
     */
    getOrganizationBySlug(slug: string): Promise<Organization | null>;
    /**
     * Update organization
     */
    updateOrganization(id: string, updates: {
        name?: string;
        settings?: Record<string, unknown>;
    }): Promise<Organization>;
    /**
     * Delete organization (soft delete)
     */
    deleteOrganization(id: string, deletedBy: string): Promise<void>;
    /**
     * Add member to organization
     */
    addMember(params: {
        organizationId: string;
        userId: string;
        role: OrganizationRole;
        invitedBy?: string;
    }): Promise<OrganizationMember>;
    /**
     * Update member role
     */
    updateMemberRole(organizationId: string, userId: string, newRole: OrganizationRole, updatedBy: string): Promise<OrganizationMember>;
    /**
     * Remove member from organization
     */
    removeMember(organizationId: string, userId: string, removedBy: string): Promise<void>;
    /**
     * Get organization members
     */
    getOrganizationMembers(organizationId: string): Promise<OrganizationMemberDetailed[]>;
    /**
     * Get user's role in organization
     */
    getUserRole(organizationId: string, userId: string): Promise<OrganizationRole | null>;
    /**
     * Check if user has permission
     */
    hasPermission(organizationId: string, userId: string, permission: keyof import('./saas-types.js').RolePermissions): Promise<boolean>;
    /**
     * Get organization usage summary
     */
    getUsageSummary(organizationId: string): Promise<OrganizationUsageSummary>;
    /**
     * Check if organization is within tier limits
     */
    checkTierLimits(organizationId: string): Promise<{
        withinLimits: boolean;
        violations: string[];
    }>;
    /**
     * Check member limit before adding
     */
    private checkMemberLimit;
    /**
     * Transform Supabase organization record to domain model.
     *
     * Maps database snake_case columns to TypeScript camelCase properties:
     * - `created_at` (ISO string) → `createdAt` (Date)
     * - `subscription_tier` (string) → `subscriptionTier` (SubscriptionTier type)
     * - `subscription_status` (string) → `subscriptionStatus` (SubscriptionStatus type)
     * - `stripe_customer_id` → `stripeCustomerId`
     * - `subscription_expires_at` → `subscriptionExpiresAt` (nullable Date)
     * - `deleted_at` → `deletedAt` (nullable Date, for soft delete filtering)
     *
     * Settings are passed through as-is (JSONB column).
     *
     * @param dbOrg - Supabase record from 'organizations' table
     * @returns Domain Organization object with validated types
     * @see DbOrganizationRecord in database-types.ts for input shape
     * @see Organization in saas-types.ts for output shape
     */
    private mapDbOrgToOrg;
    /**
     * Transform Supabase organization member record to domain model.
     *
     * Maps database snake_case columns to TypeScript camelCase properties:
     * - `organization_id` → `organizationId`
     * - `user_id` → `userId`
     * - `role` (string) → `role` (OrganizationRole type)
     * - `invited_by` → `invitedBy` (nullable, FK to users.id)
     * - `invited_at` (ISO string) → `invitedAt` (Date)
     * - `accepted_at` (ISO string) → `acceptedAt` (nullable Date)
     *
     * @param dbMember - Supabase record from 'organization_members' table
     * @returns Domain OrganizationMember object
     * @see DbOrganizationMemberRecord in database-types.ts for input shape
     * @see OrganizationMember in saas-types.ts for output shape
     */
    private mapDbMemberToMember;
    /**
     * Transform Supabase organization member detailed view record to domain model.
     *
     * This mapper handles records from the 'organization_members_detailed' view,
     * which joins organization_members with users and organizations tables.
     *
     * Maps all OrganizationMember fields plus:
     * - `email` (from users table)
     * - `first_name` → `firstName` (from users table)
     * - `last_name` → `lastName` (from users table)
     * - `avatar_url` → `avatarUrl` (from users table)
     * - `last_login_at` → `lastLoginAt` (from users table, nullable Date)
     * - `organization_name` → `organizationName` (from organizations table)
     * - `organization_slug` → `organizationSlug` (from organizations table)
     *
     * @param dbMember - Supabase record from 'organization_members_detailed' view
     * @returns Domain OrganizationMemberDetailed object
     * @see DbOrganizationMemberDetailedRecord in database-types.ts for input shape
     * @see OrganizationMemberDetailed in saas-types.ts for output shape
     */
    private mapDbMemberDetailedToMemberDetailed;
}
/**
 * Team Service
 */
export declare class TeamService {
    private supabase;
    /**
     * Create a new team
     */
    createTeam(input: CreateTeamInput, createdBy: string): Promise<Team>;
    /**
     * Get team by ID
     */
    getTeamById(id: string): Promise<Team | null>;
    /**
     * Get teams for organization
     */
    getOrganizationTeams(organizationId: string): Promise<Team[]>;
    /**
     * Update team
     */
    updateTeam(id: string, updates: {
        name?: string;
        description?: string;
    }, updatedBy: string): Promise<Team>;
    /**
     * Delete team (soft delete)
     */
    deleteTeam(id: string, deletedBy: string): Promise<void>;
    /**
     * Add member to team
     */
    addTeamMember(teamId: string, userId: string, role?: TeamRole): Promise<TeamMember>;
    /**
     * Remove member from team
     */
    removeTeamMember(teamId: string, userId: string): Promise<void>;
    /**
     * Get team members
     */
    getTeamMembers(teamId: string): Promise<DbTeamMemberDetailedRecord[]>;
    /**
     * Transform Supabase team record to domain model.
     *
     * Maps database snake_case columns to TypeScript camelCase properties:
     * - `organization_id` → `organizationId`
     * - `encryption_key_id` → `encryptionKeyId` (FK to active team encryption key)
     * - `created_at` (ISO string) → `createdAt` (Date)
     * - `updated_at` (ISO string) → `updatedAt` (Date)
     * - `deleted_at` (ISO string) → `deletedAt` (nullable Date, for soft delete)
     *
     * @param dbTeam - Supabase record from 'teams' table
     * @returns Domain Team object
     * @see DbTeamRecord in database-types.ts for input shape
     * @see Team in saas-types.ts for output shape
     */
    private mapDbTeamToTeam;
    /**
     * Transform Supabase team member record to domain model.
     *
     * Maps database snake_case columns to TypeScript camelCase properties:
     * - `team_id` → `teamId`
     * - `user_id` → `userId`
     * - `role` (string) → `role` (TeamRole type: 'admin' | 'member' | 'viewer')
     * - `created_at` (ISO string) → `createdAt` (Date)
     * - `updated_at` (ISO string) → `updatedAt` (Date)
     *
     * @param dbMember - Supabase record from 'team_members' table
     * @returns Domain TeamMember object
     * @see DbTeamMemberRecord in database-types.ts for input shape
     * @see TeamMember in saas-types.ts for output shape
     */
    private mapDbTeamMemberToTeamMember;
}
/**
 * Singleton instances
 */
export declare const organizationService: OrganizationService;
export declare const teamService: TeamService;
