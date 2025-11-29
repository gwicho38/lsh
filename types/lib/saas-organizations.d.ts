/**
 * LSH SaaS Organization & Team Management Service
 * Handles organizations, teams, members, and RBAC
 */
import type { Organization, CreateOrganizationInput, Team, CreateTeamInput, OrganizationMember, OrganizationMemberDetailed, OrganizationRole, TeamMember, TeamRole, OrganizationUsageSummary } from './saas-types.js';
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
     * Map database org to Organization type
     */
    private mapDbOrgToOrg;
    /**
     * Map database member to OrganizationMember type
     */
    private mapDbMemberToMember;
    /**
     * Map database member detailed to OrganizationMemberDetailed type
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
    getTeamMembers(teamId: string): Promise<any[]>;
    /**
     * Map database team to Team type
     */
    private mapDbTeamToTeam;
    /**
     * Map database team member to TeamMember type
     */
    private mapDbTeamMemberToTeamMember;
}
/**
 * Singleton instances
 */
export declare const organizationService: OrganizationService;
export declare const teamService: TeamService;
