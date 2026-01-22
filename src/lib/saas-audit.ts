/**
 * LSH SaaS Audit Logging Service
 * Comprehensive audit trail for all actions
 */

import type { Request } from 'express';
import type { AuditLog, CreateAuditLogInput, AuditAction, ResourceType } from './saas-types.js';
import { getSupabaseClient } from './supabase-client.js';

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private supabase = getSupabaseClient();

  /**
   * Log an audit event
   */
  // TODO(@gwicho38): Review - log
  async log(input: CreateAuditLogInput): Promise<void> {
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
        console.error('Failed to write audit log:', error);
        // Don't throw - audit logging should not break the main operation
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - audit logging should not break the main operation
    }
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
