/**
 * SaaS Audit Logging Service Tests
 * Tests for the AuditLogger class and helper functions
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';

// Create mock with proper chaining
let mockInsertFn: jest.Mock;
let mockOrderFn: jest.Mock;
let mockLimitFn: jest.Mock;

const createMockSupabase = () => {
  const defaultResponse = { data: null, error: null };
  const defaultArrayResponse = { data: [], error: null };

  // Create a thenable chain that can be awaited or chained
  const chain: any = {
    from: jest.fn(),
    insert: jest.fn(),
    select: jest.fn(),
    delete: jest.fn(),
    eq: jest.fn(),
    gte: jest.fn(),
    lte: jest.fn(),
    lt: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    range: jest.fn(),
    // Make it thenable for await
    then: (resolve: any) => Promise.resolve(defaultArrayResponse).then(resolve),
    catch: () => Promise.resolve(defaultArrayResponse),
  };

  chain.from.mockReturnValue(chain);
  chain.insert.mockReturnValue(chain);
  chain.select.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.gte.mockReturnValue(chain);
  chain.lte.mockReturnValue(chain);
  chain.lt.mockReturnValue(chain);
  chain.order.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.range.mockReturnValue(chain);

  // Store references for test assertions
  mockInsertFn = chain.insert;
  mockOrderFn = chain.order;
  mockLimitFn = chain.limit;

  return chain;
};

let mockSupabase = createMockSupabase();

jest.mock('../src/lib/supabase-client.js', () => ({
  get getSupabaseClient() {
    return () => mockSupabase;
  },
}));

describe('SaaS Audit Logging Service', () => {
  let AuditLogger: typeof import('../src/lib/saas-audit.js').AuditLogger;
  let auditLogger: InstanceType<typeof AuditLogger>;
  let getIpFromRequest: typeof import('../src/lib/saas-audit.js').getIpFromRequest;
  let getUserAgentFromRequest: typeof import('../src/lib/saas-audit.js').getUserAgentFromRequest;

  beforeAll(async () => {
    // Reset modules to ensure our mock is applied fresh
    jest.resetModules();

    // Re-establish the mock after reset
    jest.doMock('../src/lib/supabase-client.js', () => ({
      getSupabaseClient: () => mockSupabase,
    }));

    const module = await import('../src/lib/saas-audit.js');
    AuditLogger = module.AuditLogger;
    getIpFromRequest = module.getIpFromRequest;
    getUserAgentFromRequest = module.getUserAgentFromRequest;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabase();
    auditLogger = new AuditLogger();
  });

  describe('log', () => {
    it('should log an audit event successfully', async () => {
      mockInsertFn.mockResolvedValueOnce({ error: null });

      await auditLogger.log({
        organizationId: 'org-123',
        userId: 'user-456',
        action: 'secret.create',
        resourceType: 'secret',
        resourceId: 'secret-789',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('audit_logs');
      expect(mockInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          user_id: 'user-456',
          action: 'secret.create',
          resource_type: 'secret',
          resource_id: 'secret-789',
        })
      );
    });

    it('should include optional fields when provided', async () => {
      mockInsertFn.mockResolvedValueOnce({ error: null });

      await auditLogger.log({
        organizationId: 'org-123',
        teamId: 'team-456',
        userId: 'user-789',
        userEmail: 'user@example.com',
        action: 'secret.update',
        resourceType: 'secret',
        resourceId: 'secret-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: { key: 'value' },
        oldValue: { secret: 'old' },
        newValue: { secret: 'new' },
      });

      expect(mockInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          team_id: 'team-456',
          user_email: 'user@example.com',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          metadata: { key: 'value' },
        })
      );
    });

    it('should not throw on database error (silent fail)', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockInsertFn.mockResolvedValueOnce({ error: { message: 'Database error' } });

      // Should not throw
      await expect(
        auditLogger.log({
          organizationId: 'org-123',
          action: 'secret.create',
          resourceType: 'secret',
        })
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to write audit log:', expect.anything());
      consoleSpy.mockRestore();
    });

    it('should catch and log exceptions', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockInsertFn.mockRejectedValueOnce(new Error('Connection error'));

      // Should not throw
      await expect(
        auditLogger.log({
          organizationId: 'org-123',
          action: 'secret.create',
          resourceType: 'secret',
        })
      ).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith('Audit logging error:', expect.anything());
      consoleSpy.mockRestore();
    });
  });

  describe('getOrganizationLogs', () => {
    it('should return logs for organization', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'log-1',
            organization_id: 'org-123',
            action: 'secret.create',
            resource_type: 'secret',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'log-2',
            organization_id: 'org-123',
            action: 'secret.update',
            resource_type: 'secret',
            timestamp: new Date().toISOString(),
          },
        ],
        count: 2,
        error: null,
      });

      const result = await auditLogger.getOrganizationLogs('org-123');

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by date range', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await auditLogger.getOrganizationLogs('org-123', {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });

      expect(mockSupabase.gte).toHaveBeenCalled();
      expect(mockSupabase.lte).toHaveBeenCalled();
    });

    it('should filter by action', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [],
        count: 0,
        error: null,
      });

      await auditLogger.getOrganizationLogs('org-123', {
        action: 'secret.create',
      });

      expect(mockSupabase.eq).toHaveBeenCalled();
    });

    it('should throw error on database failure', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: null,
        count: null,
        error: { message: 'Database error' },
      });

      await expect(auditLogger.getOrganizationLogs('org-123')).rejects.toThrow(
        'Failed to get audit logs'
      );
    });
  });

  describe('getResourceLogs', () => {
    it('should return logs for a specific resource', async () => {
      mockLimitFn.mockResolvedValueOnce({
        data: [
          {
            id: 'log-1',
            organization_id: 'org-123',
            resource_type: 'secret',
            resource_id: 'secret-123',
            action: 'secret.create',
            timestamp: new Date().toISOString(),
          },
        ],
        error: null,
      });

      const logs = await auditLogger.getResourceLogs('org-123', 'secret', 'secret-123');

      expect(logs).toHaveLength(1);
      expect(mockSupabase.eq).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      mockLimitFn.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(auditLogger.getResourceLogs('org-123', 'secret', 'secret-123')).rejects.toThrow(
        'Failed to get resource logs'
      );
    });
  });

  describe('getTeamLogs', () => {
    it('should return logs for team', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'log-1',
            team_id: 'team-123',
            action: 'secret.create',
            resource_type: 'secret',
            timestamp: new Date().toISOString(),
          },
        ],
        count: 1,
        error: null,
      });

      const result = await auditLogger.getTeamLogs('team-123');

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw error on failure', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: null,
        count: null,
        error: { message: 'Database error' },
      });

      await expect(auditLogger.getTeamLogs('team-123')).rejects.toThrow('Failed to get team logs');
    });
  });

  describe('getUserLogs', () => {
    it('should return logs for user', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: [
          {
            id: 'log-1',
            user_id: 'user-123',
            action: 'login',
            resource_type: 'user',
            timestamp: new Date().toISOString(),
          },
        ],
        count: 1,
        error: null,
      });

      const result = await auditLogger.getUserLogs('user-123');

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw error on failure', async () => {
      mockOrderFn.mockResolvedValueOnce({
        data: null,
        count: null,
        error: { message: 'Database error' },
      });

      await expect(auditLogger.getUserLogs('user-123')).rejects.toThrow('Failed to get user logs');
    });
  });

  describe('deleteOldLogs', () => {
    it('should delete logs older than retention period', async () => {
      mockSupabase.lt.mockResolvedValueOnce({
        count: 5,
        error: null,
      });

      const deletedCount = await auditLogger.deleteOldLogs('org-123', 90);

      expect(deletedCount).toBe(5);
      expect(mockSupabase.delete).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      mockSupabase.lt.mockResolvedValueOnce({
        count: null,
        error: { message: 'Database error' },
      });

      await expect(auditLogger.deleteOldLogs('org-123', 90)).rejects.toThrow(
        'Failed to delete old logs'
      );
    });
  });

  describe('Helper Functions', () => {
    describe('getIpFromRequest', () => {
      it('should get IP from x-forwarded-for header', () => {
        const mockReq = {
          headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
          socket: { remoteAddress: '127.0.0.1' },
        } as any;

        const ip = getIpFromRequest(mockReq);

        expect(ip).toBe('1.2.3.4');
      });

      it('should get IP from x-real-ip header', () => {
        const mockReq = {
          headers: { 'x-real-ip': '10.0.0.1' },
          socket: { remoteAddress: '127.0.0.1' },
        } as any;

        const ip = getIpFromRequest(mockReq);

        expect(ip).toBe('10.0.0.1');
      });

      it('should fall back to socket remoteAddress', () => {
        const mockReq = {
          headers: {},
          socket: { remoteAddress: '192.168.1.1' },
        } as any;

        const ip = getIpFromRequest(mockReq);

        expect(ip).toBe('192.168.1.1');
      });
    });

    describe('getUserAgentFromRequest', () => {
      it('should get user agent from headers', () => {
        const mockReq = {
          headers: { 'user-agent': 'Mozilla/5.0' },
        } as any;

        const ua = getUserAgentFromRequest(mockReq);

        expect(ua).toBe('Mozilla/5.0');
      });

      it('should return undefined if no user agent', () => {
        const mockReq = {
          headers: {},
        } as any;

        const ua = getUserAgentFromRequest(mockReq);

        expect(ua).toBeUndefined();
      });
    });
  });
});
