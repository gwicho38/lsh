/**
 * LSH SaaS Audit Logging Service
 * Comprehensive audit trail for all actions
 */
import type { Request } from 'express';
import type { AuditLog, CreateAuditLogInput, AuditAction, ResourceType } from './saas-types.js';
/**
 * Audit Logger Service
 */
export declare class AuditLogger {
    private supabase;
    /**
     * Log an audit event
     */
    log(input: CreateAuditLogInput): Promise<void>;
    /**
     * Get audit logs for organization
     */
    getOrganizationLogs(organizationId: string, options?: {
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
        action?: AuditAction;
        userId?: string;
        teamId?: string;
    }): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    /**
     * Get audit logs for a specific resource
     */
    getResourceLogs(organizationId: string, resourceType: ResourceType, resourceId: string, limit?: number): Promise<AuditLog[]>;
    /**
     * Get audit logs for a team
     */
    getTeamLogs(teamId: string, options?: {
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    /**
     * Get audit logs for a user
     */
    getUserLogs(userId: string, options?: {
        limit?: number;
        offset?: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        logs: AuditLog[];
        total: number;
    }>;
    /**
     * Delete old audit logs (for retention policy)
     */
    deleteOldLogs(organizationId: string, retentionDays: number): Promise<number>;
    /**
     * Map database log to AuditLog type
     */
    private mapDbLogToLog;
}
/**
 * Singleton instance
 */
export declare const auditLogger: AuditLogger;
/**
 * Helper function to extract IP from request
 */
export declare function getIpFromRequest(req: Request): string | undefined;
/**
 * Helper function to extract user agent from request
 */
export declare function getUserAgentFromRequest(req: Request): string | undefined;
