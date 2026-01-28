/**
 * LSH SaaS Organization & Team Management Service
 * Handles organizations, teams, members, and RBAC
 */

import type {
  Organization,
  CreateOrganizationInput,
  Team,
  CreateTeamInput,
  OrganizationMember,
  OrganizationMemberDetailed,
  OrganizationRole,
  TeamMember,
  TeamRole,
  OrganizationUsageSummary,
} from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';
import { auditLogger } from './saas-audit.js';
import { TABLES } from '../constants/index.js';
import { LSHError, ErrorCodes } from './lsh-error.js';

/**
 * Generate URL-friendly slug from name
 */
// TODO(@gwicho38): Review - slugify
function slugify(name: string): string {
  let result = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-');

  // Remove leading and trailing dashes without vulnerable regex
  while (result.startsWith('-')) {
    result = result.slice(1);
  }
  while (result.endsWith('-')) {
    result = result.slice(0, -1);
  }

  return result;
}

/**
 * Organization Service
 */
export class OrganizationService {
  private supabase = getSupabaseClient();

  /**
   * Create a new organization
   */
  // TODO(@gwicho38): Review - createOrganization
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const slug = input.slug || slugify(input.name);

    // Check if slug already exists
    const { data: existing } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      throw new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Organization slug already taken',
        { slug, resource: 'organization' }
      );
    }

    // Create organization
    const { data: org, error } = await this.supabase
      .from('organizations')
      .insert({
        name: input.name,
        slug,
        subscription_tier: 'free',
        subscription_status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to create organization',
        { name: input.name, slug, dbError: error.message }
      );
    }

    // Add owner as first member
    await this.addMember({
      organizationId: org.id,
      userId: input.ownerId,
      role: 'owner',
    });

    // Log audit event
    await auditLogger.log({
      organizationId: org.id,
      userId: input.ownerId,
      action: 'organization.create',
      resourceType: 'organization',
      resourceId: org.id,
      newValue: { name: org.name, slug: org.slug },
    });

    return this.mapDbOrgToOrg(org);
  }

  /**
   * Get organization by ID
   */
  // TODO(@gwicho38): Review - getOrganizationById
  async getOrganizationById(id: string): Promise<Organization | null> {
    const { data: org, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !org) {
      return null;
    }

    return this.mapDbOrgToOrg(org);
  }

  /**
   * Get organization by slug
   */
  // TODO(@gwicho38): Review - getOrganizationBySlug
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const { data: org, error } = await this.supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .is('deleted_at', null)
      .single();

    if (error || !org) {
      return null;
    }

    return this.mapDbOrgToOrg(org);
  }

  /**
   * Update organization
   */
  // TODO(@gwicho38): Review - updateOrganization
  async updateOrganization(
    id: string,
    updates: { name?: string; settings?: Record<string, unknown> }
  ): Promise<Organization> {
    const updateData: { name?: string; settings?: Record<string, unknown> } = {};

    if (updates.name) {
      updateData.name = updates.name;
    }
    if (updates.settings) {
      updateData.settings = updates.settings;
    }

    const { data: org, error } = await this.supabase
      .from('organizations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to update organization',
        { organizationId: id, dbError: error.message }
      );
    }

    return this.mapDbOrgToOrg(org);
  }

  /**
   * Delete organization (soft delete)
   */
  // TODO(@gwicho38): Review - deleteOrganization
  async deleteOrganization(id: string, deletedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to delete organization',
        { organizationId: id, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId: id,
      userId: deletedBy,
      action: 'organization.delete',
      resourceType: 'organization',
      resourceId: id,
    });
  }

  /**
   * Add member to organization
   */
  // TODO(@gwicho38): Review - addMember
  async addMember(params: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
    invitedBy?: string;
  }): Promise<OrganizationMember> {
    // Check if already a member
    const { data: existing } = await this.supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', params.organizationId)
      .eq('user_id', params.userId)
      .single();

    if (existing) {
      throw new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'User is already a member',
        { organizationId: params.organizationId, userId: params.userId, resource: 'member' }
      );
    }

    // Check tier limits
    await this.checkMemberLimit(params.organizationId);

    const { data: member, error } = await this.supabase
      .from('organization_members')
      .insert({
        organization_id: params.organizationId,
        user_id: params.userId,
        role: params.role,
        invited_by: params.invitedBy || null,
        accepted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to add member',
        { organizationId: params.organizationId, userId: params.userId, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId: params.organizationId,
      userId: params.invitedBy || params.userId,
      action: 'member.accept',
      resourceType: 'user',
      resourceId: params.userId,
      newValue: { role: params.role },
    });

    return this.mapDbMemberToMember(member);
  }

  /**
   * Update member role
   */
  // TODO(@gwicho38): Review - updateMemberRole
  async updateMemberRole(
    organizationId: string,
    userId: string,
    newRole: OrganizationRole,
    updatedBy: string
  ): Promise<OrganizationMember> {
    const { data: member, error } = await this.supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to update member role',
        { organizationId, userId, newRole, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId,
      userId: updatedBy,
      action: 'member.role_change',
      resourceType: 'user',
      resourceId: userId,
      newValue: { role: newRole },
    });

    return this.mapDbMemberToMember(member);
  }

  /**
   * Remove member from organization
   */
  // TODO(@gwicho38): Review - removeMember
  async removeMember(organizationId: string, userId: string, removedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to remove member',
        { organizationId, userId, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId,
      userId: removedBy,
      action: 'member.remove',
      resourceType: 'user',
      resourceId: userId,
    });
  }

  /**
   * Get organization members
   */
  // TODO(@gwicho38): Review - getOrganizationMembers
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMemberDetailed[]> {
    const { data, error } = await this.supabase
      .from(TABLES.ORGANIZATION_MEMBERS_DETAILED)
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get members',
        { organizationId, dbError: error.message }
      );
    }

    return (data || []).map(this.mapDbMemberDetailedToMemberDetailed);
  }

  /**
   * Get user's role in organization
   */
  // TODO(@gwicho38): Review - getUserRole
  async getUserRole(organizationId: string, userId: string): Promise<OrganizationRole | null> {
    const { data, error } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.role as OrganizationRole;
  }

  /**
   * Check if user has permission
   */
  async hasPermission(
    organizationId: string,
    userId: string,
    permission: keyof import('./saas-types.js').RolePermissions
  ): Promise<boolean> {
    const role = await this.getUserRole(organizationId, userId);
    if (!role) return false;

    const { ROLE_PERMISSIONS } = await import('./saas-types.js');
    return ROLE_PERMISSIONS[role][permission];
  }

  /**
   * Get organization usage summary
   */
  // TODO(@gwicho38): Review - getUsageSummary
  async getUsageSummary(organizationId: string): Promise<OrganizationUsageSummary> {
    const { data, error } = await this.supabase
      .from(TABLES.ORGANIZATION_USAGE_SUMMARY)
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get usage summary',
        { organizationId, dbError: error.message }
      );
    }

    return {
      organizationId: data.organization_id,
      name: data.name,
      slug: data.slug,
      subscriptionTier: data.subscription_tier,
      memberCount: data.member_count || 0,
      teamCount: data.team_count || 0,
      secretCount: data.secret_count || 0,
      environmentCount: data.environment_count || 0,
    };
  }

  /**
   * Check if organization is within tier limits
   */
  // TODO(@gwicho38): Review - checkTierLimits
  async checkTierLimits(organizationId: string): Promise<{
    withinLimits: boolean;
    violations: string[];
  }> {
    const org = await this.getOrganizationById(organizationId);
    if (!org) {
      throw new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Organization not found',
        { organizationId, resource: 'organization' }
      );
    }

    const usage = await this.getUsageSummary(organizationId);
    const { TIER_LIMITS } = await import('./saas-types.js');
    const limits = TIER_LIMITS[org.subscriptionTier];

    const violations: string[] = [];

    if (usage.memberCount > limits.teamMembers) {
      violations.push(`Team member limit exceeded (${usage.memberCount}/${limits.teamMembers})`);
    }

    if (usage.secretCount > limits.secrets) {
      violations.push(`Secret limit exceeded (${usage.secretCount}/${limits.secrets})`);
    }

    if (usage.environmentCount > limits.environments) {
      violations.push(
        `Environment limit exceeded (${usage.environmentCount}/${limits.environments})`
      );
    }

    return {
      withinLimits: violations.length === 0,
      violations,
    };
  }

  /**
   * Check member limit before adding
   */
  // TODO(@gwicho38): Review - checkMemberLimit
  private async checkMemberLimit(organizationId: string): Promise<void> {
    const usage = await this.getUsageSummary(organizationId);
    const org = await this.getOrganizationById(organizationId);

    if (!org) {
      throw new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Organization not found',
        { organizationId, resource: 'organization' }
      );
    }

    const { TIER_LIMITS } = await import('./saas-types.js');
    const limits = TIER_LIMITS[org.subscriptionTier];

    if (usage.memberCount >= limits.teamMembers) {
      throw new LSHError(
        ErrorCodes.BILLING_TIER_LIMIT_EXCEEDED,
        'Team member limit reached. Please upgrade your plan.',
        {
          organizationId,
          currentCount: usage.memberCount,
          limit: limits.teamMembers,
          tier: org.subscriptionTier,
        }
      );
    }
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbOrgToOrg
  private mapDbOrgToOrg(dbOrg: any): Organization {
    return {
      id: dbOrg.id,
      name: dbOrg.name,
      slug: dbOrg.slug,
      createdAt: new Date(dbOrg.created_at),
      updatedAt: new Date(dbOrg.updated_at),
      stripeCustomerId: dbOrg.stripe_customer_id,
      subscriptionTier: dbOrg.subscription_tier,
      subscriptionStatus: dbOrg.subscription_status,
      subscriptionExpiresAt: dbOrg.subscription_expires_at
        ? new Date(dbOrg.subscription_expires_at)
        : null,
      settings: dbOrg.settings || {},
      deletedAt: dbOrg.deleted_at ? new Date(dbOrg.deleted_at) : null,
    };
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbMemberToMember
  private mapDbMemberToMember(dbMember: any): OrganizationMember {
    return {
      id: dbMember.id,
      organizationId: dbMember.organization_id,
      userId: dbMember.user_id,
      role: dbMember.role,
      invitedBy: dbMember.invited_by,
      invitedAt: new Date(dbMember.invited_at),
      acceptedAt: dbMember.accepted_at ? new Date(dbMember.accepted_at) : null,
      createdAt: new Date(dbMember.created_at),
      updatedAt: new Date(dbMember.updated_at),
    };
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row with joined user data
  // TODO(@gwicho38): Review - mapDbMemberDetailedToMemberDetailed
  private mapDbMemberDetailedToMemberDetailed(dbMember: any): OrganizationMemberDetailed {
    return {
      id: dbMember.id,
      organizationId: dbMember.organization_id,
      userId: dbMember.user_id,
      role: dbMember.role,
      invitedBy: dbMember.invited_by,
      invitedAt: new Date(dbMember.invited_at),
      acceptedAt: dbMember.accepted_at ? new Date(dbMember.accepted_at) : null,
      createdAt: new Date(dbMember.created_at),
      updatedAt: new Date(dbMember.updated_at),
      email: dbMember.email,
      firstName: dbMember.first_name,
      lastName: dbMember.last_name,
      avatarUrl: dbMember.avatar_url,
      lastLoginAt: dbMember.last_login_at ? new Date(dbMember.last_login_at) : null,
      organizationName: dbMember.organization_name,
      organizationSlug: dbMember.organization_slug,
    };
  }
}

/**
 * Team Service
 */
export class TeamService {
  private supabase = getSupabaseClient();

  /**
   * Create a new team
   */
  // TODO(@gwicho38): Review - createTeam
  async createTeam(input: CreateTeamInput, createdBy: string): Promise<Team> {
    const slug = input.slug || slugify(input.name);

    // Check if slug already exists in this org
    const { data: existing } = await this.supabase
      .from('teams')
      .select('id')
      .eq('organization_id', input.organizationId)
      .eq('slug', slug)
      .single();

    if (existing) {
      throw new LSHError(
        ErrorCodes.RESOURCE_ALREADY_EXISTS,
        'Team slug already taken in this organization',
        { organizationId: input.organizationId, slug, resource: 'team' }
      );
    }

    const { data: team, error } = await this.supabase
      .from('teams')
      .insert({
        organization_id: input.organizationId,
        name: input.name,
        slug,
        description: input.description || null,
      })
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to create team',
        { organizationId: input.organizationId, name: input.name, slug, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId: input.organizationId,
      teamId: team.id,
      userId: createdBy,
      action: 'team.create',
      resourceType: 'team',
      resourceId: team.id,
      newValue: { name: team.name, slug: team.slug },
    });

    return this.mapDbTeamToTeam(team);
  }

  /**
   * Get team by ID
   */
  // TODO(@gwicho38): Review - getTeamById
  async getTeamById(id: string): Promise<Team | null> {
    const { data: team, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !team) {
      return null;
    }

    return this.mapDbTeamToTeam(team);
  }

  /**
   * Get teams for organization
   */
  // TODO(@gwicho38): Review - getOrganizationTeams
  async getOrganizationTeams(organizationId: string): Promise<Team[]> {
    const { data: teams, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get teams',
        { organizationId, dbError: error.message }
      );
    }

    return (teams || []).map(this.mapDbTeamToTeam);
  }

  /**
   * Update team
   */
  // TODO(@gwicho38): Review - updateTeam
  async updateTeam(
    id: string,
    updates: { name?: string; description?: string },
    updatedBy: string
  ): Promise<Team> {
    const { data: team, error } = await this.supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to update team',
        { teamId: id, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId: team.organization_id,
      teamId: id,
      userId: updatedBy,
      action: 'team.update',
      resourceType: 'team',
      resourceId: id,
      newValue: updates,
    });

    return this.mapDbTeamToTeam(team);
  }

  /**
   * Delete team (soft delete)
   */
  // TODO(@gwicho38): Review - deleteTeam
  async deleteTeam(id: string, deletedBy: string): Promise<void> {
    const team = await this.getTeamById(id);
    if (!team) {
      throw new LSHError(
        ErrorCodes.RESOURCE_NOT_FOUND,
        'Team not found',
        { teamId: id, resource: 'team' }
      );
    }

    const { error } = await this.supabase
      .from('teams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to delete team',
        { teamId: id, dbError: error.message }
      );
    }

    await auditLogger.log({
      organizationId: team.organizationId,
      teamId: id,
      userId: deletedBy,
      action: 'team.delete',
      resourceType: 'team',
      resourceId: id,
    });
  }

  /**
   * Add member to team
   */
  // TODO(@gwicho38): Review - addTeamMember
  async addTeamMember(
    teamId: string,
    userId: string,
    role: TeamRole = 'member'
  ): Promise<TeamMember> {
    const { data: member, error } = await this.supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: userId,
        role,
      })
      .select()
      .single();

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to add team member',
        { teamId, userId, role, dbError: error.message }
      );
    }

    return this.mapDbTeamMemberToTeamMember(member);
  }

  /**
   * Remove member from team
   */
  // TODO(@gwicho38): Review - removeTeamMember
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to remove team member',
        { teamId, userId, dbError: error.message }
      );
    }
  }

  /**
   * Get team members
   */
  // TODO(@gwicho38): Review - getTeamMembers
  async getTeamMembers(teamId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from(TABLES.TEAM_MEMBERS_DETAILED)
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      throw new LSHError(
        ErrorCodes.DB_QUERY_FAILED,
        'Failed to get team members',
        { teamId, dbError: error.message }
      );
    }

    return data || [];
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbTeamToTeam
  private mapDbTeamToTeam(dbTeam: any): Team {
    return {
      id: dbTeam.id,
      organizationId: dbTeam.organization_id,
      name: dbTeam.name,
      slug: dbTeam.slug,
      description: dbTeam.description,
      encryptionKeyId: dbTeam.encryption_key_id,
      createdAt: new Date(dbTeam.created_at),
      updatedAt: new Date(dbTeam.updated_at),
      deletedAt: dbTeam.deleted_at ? new Date(dbTeam.deleted_at) : null,
    };
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbTeamMemberToTeamMember
  private mapDbTeamMemberToTeamMember(dbMember: any): TeamMember {
    return {
      id: dbMember.id,
      teamId: dbMember.team_id,
      userId: dbMember.user_id,
      role: dbMember.role,
      createdAt: new Date(dbMember.created_at),
      updatedAt: new Date(dbMember.updated_at),
    };
  }
}

/**
 * Singleton instances
 */
export const organizationService = new OrganizationService();
export const teamService = new TeamService();
