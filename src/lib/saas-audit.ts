/**
 * LSH SaaS Audit Logging Service
 * Comprehensive audit trail for all actions with retry and fallback support
 */

import type { Request } from 'express';
import type { AuditLog, CreateAuditLogInput, AuditAction, ResourceType } from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';

// ============================================================================
// RETRY AND FALLBACK CONFIGURATION
// ============================================================================

/** Maximum retry attempts for failed audit logs */
const MAX_RETRY_ATTEMPTS = 3;

/** Base delay for exponential backoff (ms) */
const BASE_RETRY_DELAY_MS = 100;

/** Maximum delay between retries (ms) */
const MAX_RETRY_DELAY_MS = 2000;

/** Maximum number of entries in fallback queue */
const MAX_FALLBACK_QUEUE_SIZE = 1000;

/** Interval for processing fallback queue (ms) */
const FALLBACK_PROCESS_INTERVAL_MS = 60000; // 1 minute

// ============================================================================
// TYPES
// ============================================================================

/**
 * Audit log entry with metadata for retry tracking
 */
interface QueuedAuditEntry {
  /** Original input */
  input: CreateAuditLogInput;
  /** Number of retry attempts */
  attempts: number;
  /** Timestamp of first failure */
  firstFailedAt: Date;
  /** Timestamp of last attempt */
  lastAttemptAt: Date;
  /** Last error message */
  lastError?: string;
}

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

// ============================================================================
// AUDIT LOGGER SERVICE
// ============================================================================

/**
 * Audit Logger Service with retry logic and fallback storage
 */
export class AuditLogger {
  private supabase = getSupabaseClient();

  /** In-memory fallback queue for failed audit entries */
  private fallbackQueue: QueuedAuditEntry[] = [];

  /** Statistics for monitoring */
  private stats: AuditLogStats = {
    successCount: 0,
    failedCount: 0,
    queuedCount: 0,
    recoveredCount: 0,
  };

  /** Timer for background queue processing */
  private processTimer: ReturnType<typeof setInterval> | null = null;

  /** Whether the logger is initialized */
  private initialized = false;

  /**
   * Initialize the audit logger and start background processing.
   * Call this once at application startup.
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    // Start background processing of fallback queue
    this.processTimer = setInterval(() => {
      this.processFallbackQueue().catch((err) => {
        console.error('Error processing audit fallback queue:', err);
      });
    }, FALLBACK_PROCESS_INTERVAL_MS);

    this.initialized = true;
  }

  /**
   * Shutdown the audit logger gracefully.
   * Attempts to flush remaining queue entries.
   */
  async shutdown(): Promise<void> {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    // Attempt to flush remaining entries
    if (this.fallbackQueue.length > 0) {
      console.log(`Flushing ${this.fallbackQueue.length} audit entries on shutdown...`);
      await this.processFallbackQueue();
    }

    this.initialized = false;
  }

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
  // TODO(@gwicho38): Review - log
  async log(input: CreateAuditLogInput): Promise<void> {
    const success = await this.attemptLog(input, 0);

    if (!success) {
      // Queue for background retry
      this.addToFallbackQueue(input, 'Initial attempt failed');
    }
  }

  /**
   * Attempt to log with retries and exponential backoff.
   *
   * @param input - Audit log input
   * @param attempt - Current attempt number (0-indexed)
   * @returns true if successful, false if all retries exhausted
   */
  private async attemptLog(input: CreateAuditLogInput, attempt: number): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('audit_logs').insert({
        organization_id: input.organizationId,
        team_id: input.teamId || null,
        user_id: input.userId || null,
        user_email: input.userEmail || null,
        action: input.action,
        resource_type: input.resourceType,
        resource_id: input.resourceId || null,
        ip_address: input.ipAddress || null,
        user_agent: input.userAgent || null,
        metadata: input.metadata || {},
        old_value: input.oldValue || null,
        new_value: input.newValue || null,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        return await this.handleLogError(input, attempt, error.message);
      }

      this.stats.successCount++;
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return await this.handleLogError(input, attempt, message);
    }
  }

  /**
   * Handle a logging error with retry logic.
   */
  private async handleLogError(
    input: CreateAuditLogInput,
    attempt: number,
    errorMessage: string
  ): Promise<boolean> {
    const nextAttempt = attempt + 1;

    if (nextAttempt >= MAX_RETRY_ATTEMPTS) {
      // All retries exhausted
      console.error(
        `Audit log failed after ${MAX_RETRY_ATTEMPTS} attempts:`,
        errorMessage,
        { action: input.action, resourceType: input.resourceType }
      );
      return false;
    }

    // Calculate delay with exponential backoff and jitter
    const baseDelay = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * 50;
    const delay = Math.min(baseDelay + jitter, MAX_RETRY_DELAY_MS);

    // Wait and retry
    await this.sleep(delay);
    return this.attemptLog(input, nextAttempt);
  }

  /**
   * Add entry to fallback queue for background processing.
   */
  private addToFallbackQueue(input: CreateAuditLogInput, errorMessage: string): void {
    // Check queue size limit
    if (this.fallbackQueue.length >= MAX_FALLBACK_QUEUE_SIZE) {
      // Remove oldest entry to make room
      const dropped = this.fallbackQueue.shift();
      if (dropped) {
        this.stats.failedCount++;
        console.error(
          'Audit fallback queue full - dropping oldest entry:',
          { action: dropped.input.action, firstFailedAt: dropped.firstFailedAt }
        );
      }
    }

    const now = new Date();
    this.fallbackQueue.push({
      input,
      attempts: MAX_RETRY_ATTEMPTS, // Already tried initial retries
      firstFailedAt: now,
      lastAttemptAt: now,
      lastError: errorMessage,
    });

    this.stats.queuedCount++;
  }

  /**
   * Process the fallback queue in the background.
   * Called periodically by the timer.
   */
  async processFallbackQueue(): Promise<void> {
    if (this.fallbackQueue.length === 0) {
      return;
    }

    const toProcess = [...this.fallbackQueue];
    this.fallbackQueue = [];

    for (const entry of toProcess) {
      const success = await this.attemptLog(entry.input, 0);

      if (success) {
        this.stats.recoveredCount++;
        this.stats.queuedCount = Math.max(0, this.stats.queuedCount - 1);
      } else {
        // Check if entry is too old (24 hours)
        const age = Date.now() - entry.firstFailedAt.getTime();
        if (age > 24 * 60 * 60 * 1000) {
          this.stats.failedCount++;
          this.stats.queuedCount = Math.max(0, this.stats.queuedCount - 1);
          console.error(
            'Audit log permanently failed - entry too old:',
            { action: entry.input.action, age: Math.round(age / 1000 / 60) + ' minutes' }
          );
        } else {
          // Re-queue for another attempt
          entry.attempts++;
          entry.lastAttemptAt = new Date();
          this.fallbackQueue.push(entry);
        }
      }
    }
  }

  /**
   * Get current audit logging statistics.
   */
  getStats(): AuditLogStats {
    return { ...this.stats };
  }

  /**
   * Get current fallback queue size.
   */
  getQueueSize(): number {
    return this.fallbackQueue.length;
  }

  /**
   * Reset statistics (for testing).
   */
  resetStats(): void {
    this.stats = {
      successCount: 0,
      failedCount: 0,
      queuedCount: 0,
      recoveredCount: 0,
    };
  }

  /**
   * Helper to sleep for a given duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get audit logs for organization
   */
  // TODO(@gwicho38): Review - getOrganizationLogs
  async getOrganizationLogs(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
      action?: AuditAction;
      userId?: string;
      teamId?: string;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId);

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    if (options.action) {
      query = query.eq('action', options.action);
    }

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.teamId) {
      query = query.eq('team_id', options.teamId);
    }

    query = query.order('timestamp', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to get audit logs: ${error.message}`);
    }

    return {
      logs: (data || []).map(this.mapDbLogToLog),
      total: count || 0,
    };
  }

  /**
   * Get audit logs for a specific resource
   */
  // TODO(@gwicho38): Review - getResourceLogs
  async getResourceLogs(
    organizationId: string,
    resourceType: ResourceType,
    resourceId: string,
    limit = 50
  ): Promise<AuditLog[]> {
    const { data, error } = await this.supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get resource logs: ${error.message}`);
    }

    return (data || []).map(this.mapDbLogToLog);
  }

  /**
   * Get audit logs for a team
   */
  // TODO(@gwicho38): Review - getTeamLogs
  async getTeamLogs(
    teamId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('team_id', teamId);

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    query = query.order('timestamp', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to get team logs: ${error.message}`);
    }

    return {
      logs: (data || []).map(this.mapDbLogToLog),
      total: count || 0,
    };
  }

  /**
   * Get audit logs for a user
   */
  // TODO(@gwicho38): Review - getUserLogs
  async getUserLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    let query = this.supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    if (options.startDate) {
      query = query.gte('timestamp', options.startDate.toISOString());
    }

    if (options.endDate) {
      query = query.lte('timestamp', options.endDate.toISOString());
    }

    query = query.order('timestamp', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data, count, error } = await query;

    if (error) {
      throw new Error(`Failed to get user logs: ${error.message}`);
    }

    return {
      logs: (data || []).map(this.mapDbLogToLog),
      total: count || 0,
    };
  }

  /**
   * Delete old audit logs (for retention policy)
   */
  // TODO(@gwicho38): Review - deleteOldLogs
  async deleteOldLogs(organizationId: string, retentionDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const { count, error } = await this.supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId)
      .lt('timestamp', cutoffDate.toISOString());

    if (error) {
      throw new Error(`Failed to delete old logs: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Map database log to AuditLog type
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- DB row type varies by schema
  // TODO(@gwicho38): Review - mapDbLogToLog
  private mapDbLogToLog(dbLog: any): AuditLog {
    return {
      id: dbLog.id,
      organizationId: dbLog.organization_id,
      teamId: dbLog.team_id,
      userId: dbLog.user_id,
      userEmail: dbLog.user_email,
      action: dbLog.action,
      resourceType: dbLog.resource_type,
      resourceId: dbLog.resource_id,
      ipAddress: dbLog.ip_address,
      userAgent: dbLog.user_agent,
      metadata: dbLog.metadata || {},
      oldValue: dbLog.old_value,
      newValue: dbLog.new_value,
      timestamp: new Date(dbLog.timestamp),
    };
  }
}

/**
 * Singleton instance
 */
export const auditLogger = new AuditLogger();

/**
 * Helper function to extract IP from request
 */
// TODO(@gwicho38): Review - getIpFromRequest
export function getIpFromRequest(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : undefined;
  const realIp = req.headers['x-real-ip'];
  return (
    forwardedIp ||
    (typeof realIp === 'string' ? realIp : undefined) ||
    req.socket?.remoteAddress
  );
}

/**
 * Helper function to extract user agent from request
 */
// TODO(@gwicho38): Review - getUserAgentFromRequest
export function getUserAgentFromRequest(req: Request): string | undefined {
  return req.headers['user-agent'];
}
