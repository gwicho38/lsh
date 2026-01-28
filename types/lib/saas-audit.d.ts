/**
 * LSH SaaS Audit Logging Service
 * Comprehensive audit trail for all actions with retry and fallback support
 */
import type { Request } from 'express';
import type { AuditLog, CreateAuditLogInput, AuditAction, ResourceType } from './saas-types.js';
/**
 * Audit logging statistics
 */
export interface AuditLogStats {
    /** Total logs written successfully */
    successCount: number;
    /** Total logs that failed permanently */
    failedCount: number;
    /** Logs currently in retry queue */
    queuedCount: number;
    /** Logs recovered from fallback */
    recoveredCount: number;
}
/**
 * Audit Logger Service with retry logic and fallback storage
 */
export declare class AuditLogger {
    private supabase;
    /** In-memory fallback queue for failed audit entries */
    private fallbackQueue;
    /** Statistics for monitoring */
    private stats;
    /** Timer for background queue processing */
    private processTimer;
    /** Whether the logger is initialized */
    private initialized;
    /**
     * Initialize the audit logger and start background processing.
     * Call this once at application startup.
     */
    initialize(): void;
    /**
     * Shutdown the audit logger gracefully.
     * Attempts to flush remaining queue entries.
     */
    shutdown(): Promise<void>;
    /**
     * Log an audit event with retry support.
     *
     * This method will:
     * 1. Attempt to write immediately to the database
     * 2. On failure, retry with exponential backoff
     * 3. If all retries fail, queue for background processing
     *
     * Audit logging failures never throw - they are handled gracefully
     * to avoid breaking the main operation.
     */
    log(input: CreateAuditLogInput): Promise<void>;
    /**
     * Attempt to log with retries and exponential backoff.
     *
     * @param input - Audit log input
     * @param attempt - Current attempt number (0-indexed)
     * @returns true if successful, false if all retries exhausted
     */
    private attemptLog;
    /**
     * Handle a logging error with retry logic.
     */
    private handleLogError;
    /**
     * Add entry to fallback queue for background processing.
     */
    private addToFallbackQueue;
    /**
     * Process the fallback queue in the background.
     * Called periodically by the timer.
     */
    processFallbackQueue(): Promise<void>;
    /**
     * Get current audit logging statistics.
     */
    getStats(): AuditLogStats;
    /**
     * Get current fallback queue size.
     */
    getQueueSize(): number;
    /**
     * Reset statistics (for testing).
     */
    resetStats(): void;
    /**
     * Helper to sleep for a given duration.
     */
    private sleep;
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
