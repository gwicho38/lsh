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

/**
 * Generate URL-friendly slug from name
 */
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
  async createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    const slug = input.slug || slugify(input.name);

    // Check if slug already exists
    const { data: existing } = await this.supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existing) {
      throw new Error('ALREADY_EXISTS: Organization slug already taken');
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
      throw new Error(`Failed to create organization: ${error.message}`);
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
      throw new Error(`Failed to update organization: ${error.message}`);
    }

    return this.mapDbOrgToOrg(org);
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(id: string, deletedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete organization: ${error.message}`);
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
      throw new Error('ALREADY_EXISTS: User is already a member');
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
      throw new Error(`Failed to add member: ${error.message}`);
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
      throw new Error(`Failed to update member role: ${error.message}`);
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
  async removeMember(organizationId: string, userId: string, removedBy: string): Promise<void> {
    const { error } = await this.supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
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
  async getOrganizationMembers(organizationId: string): Promise<OrganizationMemberDetailed[]> {
    const { data, error } = await this.supabase
      .from('organization_members_detailed')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      throw new Error(`Failed to get members: ${error.message}`);
    }

    return (data || []).map(this.mapDbMemberDetailedToMemberDetailed);
  }

  /**
   * Get user's role in organization
   */
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
  async getUsageSummary(organizationId: string): Promise<OrganizationUsageSummary> {
    const { data, error } = await this.supabase
      .from('organization_usage_summary')
      .select('*')
      .eq('organization_id', organizationId)
      .single();

    if (error) {
      throw new Error(`Failed to get usage summary: ${error.message}`);
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
  async checkTierLimits(organizationId: string): Promise<{
    withinLimits: boolean;
    violations: string[];
  }> {
    const org = await this.getOrganizationById(organizationId);
    if (!org) {
      throw new Error('NOT_FOUND: Organization not found');
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
  private async checkMemberLimit(organizationId: string): Promise<void> {
    const usage = await this.getUsageSummary(organizationId);
    const org = await this.getOrganizationById(organizationId);

    if (!org) {
      throw new Error('NOT_FOUND: Organization not found');
    }

    const { TIER_LIMITS } = await import('./saas-types.js');
    const limits = TIER_LIMITS[org.subscriptionTier];

    if (usage.memberCount >= limits.teamMembers) {
      throw new Error(
        'TIER_LIMIT_EXCEEDED: Team member limit reached. Please upgrade your plan.'
      );
    }
  }

  /**
   * Map database org to Organization type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
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
   * Map database member to OrganizationMember type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
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
   * Map database member detailed to OrganizationMemberDetailed type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row with joined user data
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
      throw new Error('ALREADY_EXISTS: Team slug already taken in this organization');
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
      throw new Error(`Failed to create team: ${error.message}`);
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
  async getOrganizationTeams(organizationId: string): Promise<Team[]> {
    const { data: teams, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('organization_id', organizationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get teams: ${error.message}`);
    }

    return (teams || []).map(this.mapDbTeamToTeam);
  }

  /**
   * Update team
   */
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
      throw new Error(`Failed to update team: ${error.message}`);
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
  async deleteTeam(id: string, deletedBy: string): Promise<void> {
    const team = await this.getTeamById(id);
    if (!team) {
      throw new Error('NOT_FOUND: Team not found');
    }

    const { error } = await this.supabase
      .from('teams')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete team: ${error.message}`);
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
      throw new Error(`Failed to add team member: ${error.message}`);
    }

    return this.mapDbTeamMemberToTeamMember(member);
  }

  /**
   * Remove member from team
   */
  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove team member: ${error.message}`);
    }
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('team_members_detailed')
      .select('*')
      .eq('team_id', teamId);

    if (error) {
      throw new Error(`Failed to get team members: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Map database team to Team type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
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
   * Map database team member to TeamMember type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
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
